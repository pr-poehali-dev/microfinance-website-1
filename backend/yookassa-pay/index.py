"""Оплата займов и карты через PayAnyWay: создание платежа, проверка статуса, вебхук и автоматический зачёт."""
import hashlib
import json
import re
import os
import urllib.request
import urllib.error
import uuid
import base64
from urllib.parse import urlencode, parse_qs
from datetime import datetime, timedelta

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
PW_URL = "https://www.payanyway.ru/assistant.htm"
TG_CHAT = "8540431915"
CD_PRICE = 1799.0
BIND_PRICE = 59.0

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def resp(code, data):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def pw_sign(*parts):
    return hashlib.md5("".join(parts).encode()).hexdigest()


def pw_pay_url(tx_id, amount, desc, return_url):
    mnt_id = os.environ["PAYANYWAY_ACCOUNT_ID"].strip()
    amt = f"{amount:.2f}"
    params = {
        "MNT_ID": mnt_id,
        "MNT_TRANSACTION_ID": tx_id,
        "MNT_CURRENCY_CODE": "RUB",
        "MNT_AMOUNT": amt,
        "MNT_TEST_MODE": "0",
        "MNT_DESCRIPTION": desc,
        "MNT_SUCCESS_URL": return_url,
        "MNT_FAIL_URL": return_url,
        "MNT_SIGNATURE": pw_sign(mnt_id, tx_id, amt, "RUB", "", "0", os.environ["PAYANYWAY_INTEGRITY_CODE"].strip()),
    }
    return PW_URL + "?" + urlencode(params)


def tg(text):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        return
    try:
        data = json.dumps({"chat_id": TG_CHAT, "text": text, "parse_mode": "HTML"}).encode()
        req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def get_user(cur, token):
    t = token.replace("'", "''")
    cur.execute(
        f"SELECT u.id, u.phone, u.full_name FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = '{t}' AND s.expires_at > NOW()"
    )
    return cur.fetchone()


def valid_card(digits: str) -> bool:
    """Номер карты: 16-19 цифр и контрольная сумма Луна."""
    if not (16 <= len(digits) <= 19) or digits == digits[0] * len(digits):
        return False
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def phone10(phone) -> str:
    return re.sub(r"\D", "", str(phone or ""))[-10:]


def bound_card_last4(cur, phone):
    ph = phone10(phone)
    if len(ph) < 10:
        return None
    cur.execute(
        f"SELECT card_key FROM {SCHEMA}.saved_cards WHERE source = 'bound' AND hidden = FALSE "
        f"AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = '{ph}' ORDER BY id DESC LIMIT 1"
    )
    r = cur.fetchone()
    return r[0][-4:] if r else None


def card_app_id(cur, phone):
    ph = phone.replace("'", "''")
    cur.execute(
        f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph}' AND virtual_card_status = 'active' "
        f"ORDER BY virtual_card_issued_at DESC LIMIT 1"
    )
    r = cur.fetchone()
    return r[0] if r else None


def started_units(start_dt, unit_days):
    today = (datetime.utcnow() + timedelta(hours=3)).date()
    begin = (start_dt + timedelta(hours=3)).date()
    return max(0, (today - begin).days) // unit_days + 1


def card_early_plan(cur, app_id):
    """Досрочное погашение карты: возвращает (сумма к оплате, {tx_id: недель}) или (None, None), если есть просрочка."""
    cur.execute(f"SELECT id, amount, weeks, rate, created_at FROM {SCHEMA}.card_transactions WHERE application_id = {app_id} AND status != 'cancelled'")
    today = (datetime.utcnow() + timedelta(hours=3)).date()
    gross = 0.0
    weeks_map = {}
    for tx_id, a, w, r, created in cur.fetchall():
        w = int(w)
        if today > (created + timedelta(hours=3, weeks=w)).date():
            return None, None
        ew = min(w, started_units(created, 7))
        weeks_map[int(tx_id)] = ew
        gross += float(a) + round(float(a) * float(r) / 100 * ew)
    cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {app_id}")
    return max(0.0, gross - float(cur.fetchone()[0])), weeks_map


def card_debt(cur, app_id):
    cur.execute(f"SELECT amount, weeks, rate FROM {SCHEMA}.card_transactions WHERE application_id = {app_id} AND status != 'cancelled'")
    gross = sum(round(float(a) * (1 + float(r) / 100 * w)) for a, w, r in cur.fetchall())
    cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {app_id}")
    return max(0.0, gross - float(cur.fetchone()[0]))


def credit_payment(cur, row):
    """Зачёт платежа. row = (yk_payment_id, loan_type, loan_id, phone, amount, meta). Возвращает True, если зачтён сейчас."""
    yk_id, loan_type, loan_id, phone, amount, meta = row
    amount = float(amount)
    cur.execute(
        f"UPDATE {SCHEMA}.yookassa_payments SET credited = TRUE, status = 'succeeded', credited_at = NOW() "
        f"WHERE yk_payment_id = '{yk_id}' AND credited = FALSE RETURNING id"
    )
    if not cur.fetchone():
        return False
    note = "Оплата через PayAnyWay"
    if loan_type == "investor":
        cur.execute(
            f"INSERT INTO {SCHEMA}.investor_topups (investor_id, yk_payment_id, amount) "
            f"VALUES ({int(loan_id)}, '{yk_id}', {amount}) ON CONFLICT (yk_payment_id) DO NOTHING"
        )
        funded = fund_from_balance(cur, loan_id)
        extra = ("\n✅ Оплачены вложения: " + ", ".join(f"{a:,} ₽" for a in funded)).replace(",", " ") if funded else "\nВложений на эту сумму пока нет — деньги на балансе."
        tg(f"💰 <b>Пополнение баланса инвестора</b>\n\n📞 {phone}\n💵 Сумма: {int(amount):,} ₽".replace(",", " ") + extra)
        return True
    if loan_type == "cardbind":
        digits = re.sub(r"\D", "", str(meta.get("card") or ""))
        if digits:
            value = " ".join(digits[i:i + 4] for i in range(0, len(digits), 4))
            ph_s = str(phone or "").replace("'", "''")
            cur.execute(
                f"INSERT INTO {SCHEMA}.saved_cards (phone, card_value, card_key, source) "
                f"VALUES ('{ph_s}', '{value}', '{digits}', 'bound') "
                f"ON CONFLICT (phone, card_key) DO UPDATE SET hidden = FALSE, source = 'bound', card_value = EXCLUDED.card_value"
            )
        tg(f"💳 <b>Клиент привязал карту к кабинету</b>\n\n📞 {phone}\n💳 •••• {digits[-4:]}\n💵 Оплачено: {int(amount)} ₽")
        return True
    if loan_type == "creditdoctor":
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET cd_paid = TRUE, cd_paid_at = NOW(), is_credit_doctor = TRUE, "
            f"status = CASE WHEN status = 'rejected' THEN 'pending' ELSE status END, "
            f"reviewed_at = CASE WHEN status = 'rejected' THEN NULL ELSE reviewed_at END, "
            f"reject_reason = CASE WHEN status = 'rejected' THEN NULL ELSE reject_reason END "
            f"WHERE id = {int(loan_id)}"
        )
        cur.execute(f"SELECT full_name FROM {SCHEMA}.applications WHERE id = {int(loan_id)}")
        _n = cur.fetchone()
        tg(
            f"💊 <b>Клиент оплатил «Кредитный Доктор»</b>\n\n👤 {(_n[0] if _n and _n[0] else phone)}\n📞 {phone}\n"
            f"🔖 Заявка №{loan_id}\n💵 Сумма: {int(amount):,} ₽\n\n".replace(",", " ")
            + "Заявка ждёт решения в разделе «Кред. Доктор»."
        )
        return True
    if loan_type == "card":
        if meta.get("early"):
            for k, w in (meta.get("weeks") or {}).items():
                cur.execute(
                    f"UPDATE {SCHEMA}.card_transactions SET weeks = {int(w)} "
                    f"WHERE id = {int(k)} AND application_id = {int(loan_id)} AND weeks > {int(w)}"
                )
        cur.execute(f"INSERT INTO {SCHEMA}.card_repayments (application_id, amount, note) VALUES ({int(loan_id)}, {amount}, '{note}')")
        tx_id = int(meta.get("txId") or 0)
        due = str(meta.get("dueDate") or "").replace("'", "''")
        if meta.get("full"):
            cur.execute(f"UPDATE {SCHEMA}.card_payment_notices SET status='done', resolved_at=NOW() WHERE application_id={int(loan_id)} AND status='new'")
        elif due:
            cur.execute(
                f"UPDATE {SCHEMA}.card_payment_notices SET status='done', resolved_at=NOW() "
                f"WHERE application_id={int(loan_id)} AND status='new' AND COALESCE(tx_id,0)={tx_id} AND due_date='{due}'"
            )
        label = f"Карта РУСФИНАНС 24 (заявка #{loan_id})"
    else:
        cur.execute(
            f"INSERT INTO {SCHEMA}.payments (loan_type, loan_id, amount, note) VALUES ('{loan_type}', {int(loan_id)}, {amount}, '{note}')"
        )
        cur.execute(
            f"UPDATE {SCHEMA}.loan_payment_notices SET status='done', resolved_at=NOW() "
            f"WHERE loan_type='{loan_type}' AND loan_id={int(loan_id)} AND status='new'"
        )
        if loan_type == "loan":
            if meta.get("early") and int(meta.get("days") or 0) > 0:
                cur.execute(f"UPDATE {SCHEMA}.loans SET days = {int(meta['days'])} WHERE id = {int(loan_id)} AND days > {int(meta['days'])}")
            cur.execute(f"SELECT amount, days, rate, wheel_discount_rub, status FROM {SCHEMA}.loans WHERE id = {int(loan_id)}")
            l = cur.fetchone()
            if l:
                interest = round(float(l[0]) * float(l[2]) * int(l[1]))
                interest -= min(int(l[3] or 0), interest)
                cur.execute(f"SELECT approved_items, until_date FROM {SCHEMA}.credit_holidays WHERE status = 'approved' AND until_date IS NOT NULL")
                hol_until = None
                for h_items, h_until in cur.fetchall():
                    if any(i_.get("kind") == "loan" and int(i_.get("id")) == int(loan_id) for i_ in (h_items or [])):
                        hol_until = h_until if not hol_until or h_until > hol_until else hol_until
                if hol_until:
                    cur.execute(f"SELECT disbursed_at FROM {SCHEMA}.loans WHERE id = {int(loan_id)}")
                    d_at = cur.fetchone()[0]
                    if d_at:
                        due_d = (d_at + timedelta(days=int(l[1]))).date()
                        if hol_until > due_d:
                            interest += round(float(l[0]) * float(l[2]) * max(0, (min(datetime.utcnow().date(), hol_until) - due_d).days))
                total_due = float(l[0]) + interest
                cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id={int(loan_id)}")
                if float(cur.fetchone()[0]) >= total_due and l[4] != "paid":
                    cur.execute(f"UPDATE {SCHEMA}.loans SET status='paid' WHERE id={int(loan_id)}")
        if loan_type in ("carloan", "shoploan") and meta.get("early") and int(meta.get("months") or 0) > 0:
            tbl = "car_loan_applications" if loan_type == "carloan" else "shopping_loan_applications"
            cur.execute(
                f"UPDATE {SCHEMA}.{tbl} SET approved_months = {int(meta['months'])} "
                f"WHERE id = {int(loan_id)} AND COALESCE(approved_months, loan_months) > {int(meta['months'])}"
            )
        label = {"loan": "Займ", "carloan": "Автозайм", "shoploan": "Займ на покупки"}.get(loan_type, "Займ") + f" №{loan_id}"
    tg(
        f"✅ <b>Оплата через PayAnyWay</b>\n\n📞 {phone}\n📄 {label}\n"
        + f"💵 Сумма: {int(amount):,} ₽\nПлатёж зачтён автоматически.".replace(",", " ")
    )
    return True


def fund_from_balance(cur, investor_id):
    """Оплачивает ожидающие вложения из баланса пополнений (по порядку). Возвращает список сумм."""
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.investor_topups WHERE investor_id = {int(investor_id)}")
    topped = float(cur.fetchone()[0])
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.investments WHERE investor_id = {int(investor_id)} AND funded_by = 'topup'")
    balance = topped - float(cur.fetchone()[0])
    cur.execute(f"SELECT id, amount FROM {SCHEMA}.investments WHERE investor_id = {int(investor_id)} AND funded = FALSE AND status = 'active' ORDER BY id")
    done = []
    for iid, amt in cur.fetchall():
        if float(amt) <= balance:
            cur.execute(
                f"UPDATE {SCHEMA}.investments SET funded = TRUE, funded_at = NOW(), funded_by = 'topup', "
                f"start_date = CURRENT_DATE, contract_url = NULL WHERE id = {int(iid)}"
            )
            balance -= float(amt)
            done.append(int(amt))
    return done


def load_row(cur, yk_id):
    cur.execute(
        f"SELECT yk_payment_id, loan_type, loan_id, phone, amount, meta FROM {SCHEMA}.yookassa_payments WHERE yk_payment_id = '{yk_id}'"
    )
    r = cur.fetchone()
    if not r:
        return None
    meta = r[5] if isinstance(r[5], dict) else json.loads(r[5] or "{}")
    return (r[0], r[1], r[2], r[3], r[4], meta)


def sync_payment(cur, conn, tx_id):
    """Статус платежа: зачёт делает уведомление PayAnyWay (sub=webhook), здесь только читаем результат."""
    cur.execute(f"SELECT credited, status FROM {SCHEMA}.yookassa_payments WHERE yk_payment_id = '{tx_id}'")
    r = cur.fetchone()
    if not r:
        return "unknown"
    return "succeeded" if r[0] else (r[1] or "pending")


def handler(event: dict, context) -> dict:
    """Создание платежа PayAnyWay (sub=create), проверка (sub=check), вебхук (sub=webhook)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {**CORS, "Access-Control-Max-Age": "86400"}, "body": ""}

    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw = event.get("body") or "{}"
    try:
        body = json.loads(raw) if isinstance(raw, str) else raw
    except ValueError:
        body = {}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if sub == "webhook":
        params = {k: str(v) for k, v in qs.items()}
        if raw and raw != "{}":
            txt = base64.b64decode(raw).decode() if event.get("isBase64Encoded") else str(raw)
            for k, v in parse_qs(txt).items():
                params[k] = v[0]
        tx = params.get("MNT_TRANSACTION_ID", "").replace("'", "")
        code = os.environ.get("PAYANYWAY_INTEGRITY_CODE", "").strip()
        expected = pw_sign(
            params.get("MNT_ID", ""), tx, params.get("MNT_OPERATION_ID", ""), params.get("MNT_AMOUNT", ""),
            params.get("MNT_CURRENCY_CODE", ""), params.get("MNT_SUBSCRIBER_ID", ""), params.get("MNT_TEST_MODE", ""), code,
        )
        ok_sign = params.get("MNT_ID", "") == os.environ.get("PAYANYWAY_ACCOUNT_ID", "").strip() and params.get("MNT_SIGNATURE", "").lower() == expected
        plain = {"statusCode": 200, "headers": {**CORS, "Content-Type": "text/plain"}}
        if not ok_sign or not tx:
            cur.close(); conn.close()
            return {**plain, "body": "FAIL"}
        row = load_row(cur, tx)
        if not row:
            cur.close(); conn.close()
            return {**plain, "body": "FAIL"}
        try:
            paid = float(params.get("MNT_AMOUNT", "0"))
        except ValueError:
            paid = 0
        if abs(paid - float(row[4])) < 0.01:
            credit_payment(cur, row)
            conn.commit()
        cur.close(); conn.close()
        return {**plain, "body": "SUCCESS"}

    if sub == "bind_check":
        last4 = bound_card_last4(cur, body.get("phone"))
        cur.close(); conn.close()
        return resp(200, {"bound": bool(last4)})

    if sub == "bind_status":
        yk_id = str(body.get("paymentId") or "").replace("'", "")
        cur.execute(f"SELECT credited, status FROM {SCHEMA}.yookassa_payments WHERE yk_payment_id = '{yk_id}' AND loan_type = 'cardbind'")
        r = cur.fetchone()
        cur.close(); conn.close()
        if not r:
            return resp(404, {"error": "Платёж не найден"})
        return resp(200, {"status": "succeeded" if r[0] else (r[1] or "pending"), "bound": bool(r[0])})

    if sub == "bind_create":
        digits = re.sub(r"\D", "", str(body.get("cardNumber") or ""))
        phone_in = str(body.get("phone") or "").strip()
        ph10 = phone10(phone_in)
        return_url = str(body.get("returnUrl") or "")
        err = None
        if len(ph10) < 10:
            err = "Сначала укажите номер телефона"
        elif not valid_card(digits):
            err = "Проверьте номер карты (16–19 цифр)"
        elif not return_url.startswith("http"):
            err = "Некорректный адрес возврата"
        if err:
            cur.close(); conn.close()
            return resp(400, {"error": err})
        cur.execute(f"SELECT phone FROM {SCHEMA}.users WHERE right(regexp_replace(phone, '\\D', '', 'g'), 10) = '{ph10}' LIMIT 1")
        u = cur.fetchone()
        phone_store = (u[0] if u else phone_in)[:30].replace("'", "")
        yk_id = uuid.uuid4().hex
        pay_url = pw_pay_url(yk_id, BIND_PRICE, "Привязка карты к личному кабинету РУСФИНАНС 24", return_url)
        meta_sql = json.dumps({"card": digits}).replace("'", "''")
        cur.execute(
            f"INSERT INTO {SCHEMA}.yookassa_payments (yk_payment_id, loan_type, loan_id, phone, amount, meta) "
            f"VALUES ('{yk_id}', 'cardbind', 0, '{phone_store}', {BIND_PRICE}, '{meta_sql}')"
        )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"paymentId": yk_id, "confirmationUrl": pay_url, "amount": BIND_PRICE})

    auth = headers.get("x-authorization") or headers.get("authorization") or ""
    token = auth.replace("Bearer ", "").strip()

    if sub in ("invest_create", "invest_check"):
        t_e = token.replace("'", "''")
        cur.execute(
            f"SELECT i.id, i.phone FROM {SCHEMA}.investor_sessions s JOIN {SCHEMA}.investors i ON i.id = s.investor_id "
            f"WHERE s.token = '{t_e}' AND s.expires_at > NOW()"
        )
        iv = cur.fetchone() if token else None
        if not iv:
            cur.close(); conn.close()
            return resp(401, {"error": "Требуется авторизация"})
        inv_id, inv_phone = iv
        if sub == "invest_check":
            yk_id = str(body.get("paymentId") or "").replace("'", "")
            cur.execute(f"SELECT 1 FROM {SCHEMA}.yookassa_payments WHERE yk_payment_id='{yk_id}' AND loan_type='investor' AND loan_id={int(inv_id)}")
            if not cur.fetchone():
                cur.close(); conn.close()
                return resp(404, {"error": "Платёж не найден"})
            status = sync_payment(cur, conn, yk_id)
            cur.close(); conn.close()
            return resp(200, {"status": status})
        try:
            amount = round(float(body.get("amount") or 0), 2)
        except (TypeError, ValueError):
            amount = 0
        return_url = str(body.get("returnUrl") or "")
        if amount < 1000 or amount > 15000000 or not return_url.startswith("http"):
            cur.close(); conn.close()
            return resp(400, {"error": "Сумма пополнения — от 1 000 до 15 000 000 ₽"})
        yk_id = uuid.uuid4().hex
        pay_url = pw_pay_url(yk_id, amount, "Пополнение баланса инвестиций РУСФИНАНС 24", return_url)
        cur.execute(
            f"INSERT INTO {SCHEMA}.yookassa_payments (yk_payment_id, loan_type, loan_id, phone, amount, meta) "
            f"VALUES ('{yk_id}', 'investor', {int(inv_id)}, '{inv_phone.replace(chr(39), '')}', {amount}, '{{}}')"
        )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"paymentId": yk_id, "confirmationUrl": pay_url})

    user = get_user(cur, token) if token else None
    if not user:
        cur.close(); conn.close()
        return resp(401, {"error": "Требуется авторизация"})
    user_id, phone, full_name = user

    if sub == "history":
        ph_e = phone.replace("'", "''")
        cur.execute(
            f"SELECT yk_payment_id, loan_type, loan_id, amount, status, credited, created_at, credited_at "
            f"FROM {SCHEMA}.yookassa_payments WHERE phone = '{ph_e}' ORDER BY created_at DESC LIMIT 50"
        )
        items = [{
            "id": r[0], "loanType": r[1], "loanId": r[2], "amount": float(r[3]),
            "status": "succeeded" if r[5] else r[4],
            "date": (((r[7] or r[6]) + timedelta(hours=3)).strftime("%d.%m.%Y в %H:%M")) if (r[7] or r[6]) else "",
        } for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {"payments": items})

    if sub == "check":
        yk_id = str(body.get("paymentId") or "").replace("'", "")
        cur.execute(f"SELECT 1 FROM {SCHEMA}.yookassa_payments WHERE yk_payment_id='{yk_id}' AND phone='{phone.replace(chr(39), '')}'")
        if not cur.fetchone():
            cur.close(); conn.close()
            return resp(404, {"error": "Платёж не найден"})
        status = sync_payment(cur, conn, yk_id)
        cur.close(); conn.close()
        return resp(200, {"status": status})

    if sub == "create":
        loan_type = str(body.get("loanType") or "")
        try:
            loan_id = int(body.get("loanId") or 0)
            amount = round(float(body.get("amount") or 0), 2)
        except (TypeError, ValueError):
            loan_id, amount = 0, 0
        return_url = str(body.get("returnUrl") or "")
        if loan_type == "creditdoctor":
            amount = CD_PRICE
        if loan_type not in ("loan", "carloan", "shoploan", "card", "creditdoctor") or amount <= 0 or amount > 10000000 or not return_url.startswith("http"):
            cur.close(); conn.close()
            return resp(400, {"error": "Некорректные данные платежа"})

        ph_e = phone.replace("'", "''")
        meta = {}
        if loan_type == "creditdoctor":
            cur.execute(
                f"SELECT id, status, COALESCE(cd_paid, FALSE), COALESCE(is_credit_doctor, FALSE) FROM {SCHEMA}.applications "
                f"WHERE phone = '{ph_e}' ORDER BY created_at DESC LIMIT 1"
            )
            cd_row = cur.fetchone()
            if not cd_row or not (cd_row[1] == "rejected" or (cd_row[1] == "pending" and cd_row[3])):
                cur.close(); conn.close()
                return resp(400, {"error": "Услуга доступна после отказа или по заявке «Кредитный Доктор»"})
            if cd_row[2]:
                cur.close(); conn.close()
                return resp(400, {"error": "Услуга уже оплачена"})
            loan_id = cd_row[0]
            amount = CD_PRICE
            desc = "Услуга «Кредитный Доктор»"
        elif loan_type == "card":
            app_id = card_app_id(cur, phone)
            if not app_id:
                cur.close(); conn.close()
                return resp(404, {"error": "Карта не найдена"})
            debt = card_debt(cur, app_id)
            early_meta = {}
            if body.get("early"):
                e_debt, weeks_map = card_early_plan(cur, app_id)
                if e_debt is None or e_debt <= 0:
                    cur.close(); conn.close()
                    return resp(400, {"error": "Досрочное погашение сейчас недоступно"})
                debt = e_debt
                amount = e_debt
                early_meta = {"early": True, "weeks": weeks_map}
            if debt <= 0:
                cur.close(); conn.close()
                return resp(400, {"error": "Долга по карте нет"})
            amount = min(amount, debt)
            loan_id = app_id
            meta = {"txId": int(body.get("txId") or 0), "dueDate": str(body.get("dueDate") or ""), "full": bool(body.get("full")), **early_meta}
            desc = f"Погашение по карте РУСФИНАНС 24"
        else:
            if loan_type == "loan":
                cur.execute(f"SELECT id, amount, days, rate, wheel_discount_rub, disbursed_at, status FROM {SCHEMA}.loans WHERE id = {loan_id} AND user_id = {user_id}")
                lrow = cur.fetchone()
                if lrow and body.get("early"):
                    if lrow[6] != "active" or not lrow[5]:
                        cur.close(); conn.close()
                        return resp(400, {"error": "Досрочное погашение сейчас недоступно"})
                    e_days = min(int(lrow[2]), started_units(lrow[5], 1))
                    e_interest = round(float(lrow[1]) * float(lrow[3]) * e_days)
                    e_interest -= min(int(lrow[4] or 0), e_interest)
                    cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id={loan_id}")
                    amount = round(max(0.0, float(lrow[1]) + e_interest - float(cur.fetchone()[0])), 2)
                    if amount <= 0:
                        cur.close(); conn.close()
                        return resp(400, {"error": "Долга нет"})
                    meta = {"early": True, "days": e_days}
                cur.execute(f"SELECT id FROM {SCHEMA}.loans WHERE id = {loan_id} AND user_id = {user_id}")
            elif loan_type == "carloan":
                cur.execute(f"SELECT id FROM {SCHEMA}.car_loan_applications WHERE id = {loan_id} AND phone = '{ph_e}'")
            else:
                cur.execute(f"SELECT id FROM {SCHEMA}.shopping_loan_applications WHERE id = {loan_id} AND phone = '{ph_e}'")
            found = cur.fetchone()
            if found and body.get("early") and loan_type in ("carloan", "shoploan"):
                tbl = "car_loan_applications" if loan_type == "carloan" else "shopping_loan_applications"
                cur.execute(
                    f"SELECT COALESCE(approved_amount, loan_amount), COALESCE(approved_months, loan_months), approved_rate, disbursed_at, status "
                    f"FROM {SCHEMA}.{tbl} WHERE id = {loan_id}"
                )
                a_, m_, r_, d_, st_ = cur.fetchone()
                if st_ != "approved" or not d_:
                    cur.close(); conn.close()
                    return resp(400, {"error": "Досрочное погашение сейчас недоступно"})
                r_ = float(r_ or (12 if loan_type == "carloan" else 9)) / 100
                em = min(int(m_), started_units(d_, 30))
                cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='{loan_type}' AND loan_id={loan_id}")
                amount = round(max(0.0, round(float(a_) * (1 + r_ * em)) - float(cur.fetchone()[0])), 2)
                if amount <= 0:
                    cur.close(); conn.close()
                    return resp(400, {"error": "Долга нет"})
                meta = {"early": True, "months": em}
            if not found:
                cur.close(); conn.close()
                return resp(404, {"error": "Займ не найден"})
            desc = f"Погашение займа №{loan_id}"

        yk_id = uuid.uuid4().hex
        pay_url = pw_pay_url(yk_id, amount, desc, return_url)
        meta_sql = json.dumps(meta, ensure_ascii=False).replace("'", "''")
        cur.execute(
            f"INSERT INTO {SCHEMA}.yookassa_payments (yk_payment_id, loan_type, loan_id, phone, amount, meta) "
            f"VALUES ('{yk_id}', '{loan_type}', {loan_id}, '{ph_e}', {amount}, '{meta_sql}')"
        )
        conn.commit()
        cur.close(); conn.close()
        return resp(200, {"paymentId": yk_id, "confirmationUrl": pay_url})

    cur.close(); conn.close()
    return resp(400, {"error": "Неизвестное действие"})

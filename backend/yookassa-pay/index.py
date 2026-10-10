"""Оплата займов и карты через ЮKassa: создание платежа, проверка статуса, вебхук и автоматический зачёт."""
import base64
import json
import os
import urllib.request
import urllib.error
import uuid

import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
YK_API = "https://api.yookassa.ru/v3/payments"
TG_CHAT = "8540431915"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def resp(code, data):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def yk_request(method, url, payload=None, idem=None):
    auth = base64.b64encode(f"{os.environ['YOOKASSA_SHOP_ID']}:{os.environ['YOOKASSA_SECRET_KEY']}".encode()).decode()
    headers = {"Authorization": f"Basic {auth}", "Content-Type": "application/json"}
    if idem:
        headers["Idempotence-Key"] = idem
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


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


def card_app_id(cur, phone):
    ph = phone.replace("'", "''")
    cur.execute(
        f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph}' AND virtual_card_status = 'active' "
        f"ORDER BY virtual_card_issued_at DESC LIMIT 1"
    )
    r = cur.fetchone()
    return r[0] if r else None


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
    note = "Оплата через ЮKassa"
    if loan_type == "card":
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
            cur.execute(f"SELECT amount, days, rate, wheel_discount_rub, status FROM {SCHEMA}.loans WHERE id = {int(loan_id)}")
            l = cur.fetchone()
            if l:
                interest = round(float(l[0]) * float(l[2]) * int(l[1]))
                interest -= min(int(l[3] or 0), interest)
                total_due = float(l[0]) + interest
                cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id={int(loan_id)}")
                if float(cur.fetchone()[0]) >= total_due and l[4] != "paid":
                    cur.execute(f"UPDATE {SCHEMA}.loans SET status='paid' WHERE id={int(loan_id)}")
        label = {"loan": "Займ", "carloan": "Автозайм", "shoploan": "Займ на покупки"}.get(loan_type, "Займ") + f" №{loan_id}"
    tg(
        f"✅ <b>Оплата через ЮKassa</b>\n\n📞 {phone}\n📄 {label}\n"
        + f"💵 Сумма: {int(amount):,} ₽\nПлатёж зачтён автоматически.".replace(",", " ")
    )
    return True


def load_row(cur, yk_id):
    cur.execute(
        f"SELECT yk_payment_id, loan_type, loan_id, phone, amount, meta FROM {SCHEMA}.yookassa_payments WHERE yk_payment_id = '{yk_id}'"
    )
    r = cur.fetchone()
    if not r:
        return None
    meta = r[5] if isinstance(r[5], dict) else json.loads(r[5] or "{}")
    return (r[0], r[1], r[2], r[3], r[4], meta)


def sync_payment(cur, conn, yk_id):
    """Сверяем статус в ЮKassa и при успехе зачитываем платёж."""
    row = load_row(cur, yk_id)
    if not row:
        return "unknown"
    code, data = yk_request("GET", f"{YK_API}/{yk_id}")
    if code != 200:
        return "error"
    status = data.get("status", "pending")
    paid_ok = status == "succeeded" and data.get("paid")
    if paid_ok:
        paid_amount = float(data.get("amount", {}).get("value", 0))
        if abs(paid_amount - float(row[4])) < 0.01:
            credit_payment(cur, row)
        conn.commit()
        return "succeeded"
    if status == "canceled":
        cur.execute(f"UPDATE {SCHEMA}.yookassa_payments SET status='canceled' WHERE yk_payment_id='{yk_id}' AND credited=FALSE")
        conn.commit()
    return status


def handler(event: dict, context) -> dict:
    """Создание платежа ЮKassa (sub=create), проверка (sub=check), вебхук (sub=webhook)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {**CORS, "Access-Control-Max-Age": "86400"}, "body": ""}

    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if sub == "webhook":
        obj = body.get("object") or {}
        yk_id = str(obj.get("id") or "").replace("'", "")
        if body.get("event") == "payment.succeeded" and yk_id:
            sync_payment(cur, conn, yk_id)
        cur.close(); conn.close()
        return resp(200, {"ok": True})

    auth = headers.get("x-authorization") or headers.get("authorization") or ""
    token = auth.replace("Bearer ", "").strip()
    user = get_user(cur, token) if token else None
    if not user:
        cur.close(); conn.close()
        return resp(401, {"error": "Требуется авторизация"})
    user_id, phone, full_name = user

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
        if loan_type not in ("loan", "carloan", "shoploan", "card") or amount <= 0 or amount > 10000000 or not return_url.startswith("http"):
            cur.close(); conn.close()
            return resp(400, {"error": "Некорректные данные платежа"})

        ph_e = phone.replace("'", "''")
        meta = {}
        if loan_type == "card":
            app_id = card_app_id(cur, phone)
            if not app_id:
                cur.close(); conn.close()
                return resp(404, {"error": "Карта не найдена"})
            debt = card_debt(cur, app_id)
            if debt <= 0:
                cur.close(); conn.close()
                return resp(400, {"error": "Долга по карте нет"})
            amount = min(amount, debt)
            loan_id = app_id
            meta = {"txId": int(body.get("txId") or 0), "dueDate": str(body.get("dueDate") or ""), "full": bool(body.get("full"))}
            desc = f"Погашение по карте РУСФИНАНС 24"
        else:
            if loan_type == "loan":
                cur.execute(f"SELECT id FROM {SCHEMA}.loans WHERE id = {loan_id} AND user_id = {user_id}")
            elif loan_type == "carloan":
                cur.execute(f"SELECT id FROM {SCHEMA}.car_loan_applications WHERE id = {loan_id} AND phone = '{ph_e}'")
            else:
                cur.execute(f"SELECT id FROM {SCHEMA}.shopping_loan_applications WHERE id = {loan_id} AND phone = '{ph_e}'")
            if not cur.fetchone():
                cur.close(); conn.close()
                return resp(404, {"error": "Займ не найден"})
            desc = f"Погашение займа №{loan_id}"

        payload = {
            "amount": {"value": f"{amount:.2f}", "currency": "RUB"},
            "capture": True,
            "confirmation": {"type": "redirect", "return_url": return_url},
            "description": desc,
            "metadata": {"loanType": loan_type, "loanId": str(loan_id), "phone": phone},
        }
        code, data = yk_request("POST", YK_API, payload, idem=str(uuid.uuid4()))
        if code not in (200, 201) or not data.get("confirmation", {}).get("confirmation_url"):
            cur.close(); conn.close()
            return resp(502, {"error": data.get("description") or "Не удалось создать платёж. Попробуйте позже."})
        yk_id = data["id"]
        meta_sql = json.dumps(meta, ensure_ascii=False).replace("'", "''")
        cur.execute(
            f"INSERT INTO {SCHEMA}.yookassa_payments (yk_payment_id, loan_type, loan_id, phone, amount, meta) "
            f"VALUES ('{yk_id}', '{loan_type}', {loan_id}, '{ph_e}', {amount}, '{meta_sql}')"
        )
        conn.commit()
        cur.close(); conn.close()
        return resp(200, {"paymentId": yk_id, "confirmationUrl": data["confirmation"]["confirmation_url"]})

    cur.close(); conn.close()
    return resp(400, {"error": "Неизвестное действие"})

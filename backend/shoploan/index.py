"""Займ на покупку товаров: приём заявок, управление из админки, статус для клиента. v2"""
import json
import os
import secrets
import hashlib
import urllib.request
import psycopg2
from datetime import datetime, timedelta
from decimal import Decimal


from datetime import timedelta as _msk_td


def msk(dt):
    """Переводит время из UTC (как хранится в БД) в московское (UTC+3) для показа."""
    return dt + _msk_td(hours=3) if dt else dt

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


DUPLICATE_MSG = "Вы уже есть в системе. Повторная регистрация невозможна: у каждого клиента только один личный кабинет. Войдите в личный кабинет по номеру телефона, указанному при первой заявке."


def passport_taken(cur, series, number, phone, snils_raw="") -> bool:
    """True, если такие паспорт или СНИЛС уже есть в заявках с другим номером телефона."""
    import re
    s = re.sub(r"\D", "", str(series or ""))
    n = re.sub(r"\D", "", str(number or ""))
    ph = re.sub(r"\D", "", str(phone or ""))[-10:]
    sn = re.sub(r"\D", "", str(snils_raw or ""))
    if not (s and n) and len(sn) != 11:
        return False
    parts = []
    for tbl, cs, cn in (("applications", "passport_series", "passport_number"),
                        ("car_loan_applications", "passport_serial", "passport_num"),
                        ("shopping_loan_applications", "passport_series", "passport_number")):
        other = f"right(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) <> '{ph}'"
        conds = []
        if s and n:
            conds.append(
                f"(regexp_replace(COALESCE({cs}, ''), '\\D', '', 'g') = '{s}' "
                f"AND regexp_replace(COALESCE({cn}, ''), '\\D', '', 'g') = '{n}')"
            )
        if len(sn) == 11:
            conds.append(f"regexp_replace(COALESCE(snils, ''), '\\D', '', 'g') = '{sn}'")
        parts.append(f"SELECT 1 FROM {SCHEMA}.{tbl} WHERE ({' OR '.join(conds)}) AND {other}")
    cur.execute(" UNION ALL ".join(parts) + " LIMIT 1")
    return cur.fetchone() is not None



SITE_URL = "https://rusfinans24.ru"


def _mail_html(title: str, color: str, name: str, lines: list, button: str = "") -> str:
    body = "".join(f'<p style="color:#334155;font-size:14px;margin:0 0 12px;line-height:1.6;">{l}</p>' for l in lines)
    btn = (f'<p style="text-align:center;margin:24px 0 0;"><a href="{SITE_URL}/login" style="background:{color};color:#ffffff;'
           f'text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block;">{button}</a></p>') if button else ""
    return (
        '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>'
        '<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">'
        '<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">'
        '<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">'
        f'<tr><td style="background:{color};padding:28px 36px;text-align:center;">'
        '<h1 style="margin:0;color:#ffffff;font-size:22px;">РУСФИНАНС 24</h1>'
        f'<p style="margin:8px 0 0;color:#ffffff;font-size:15px;">{title}</p></td></tr>'
        '<tr><td style="padding:32px 36px;">'
        f'<p style="color:#0f172a;font-size:16px;margin:0 0 16px;">Здравствуйте, <b>{name}</b>!</p>'
        f'{body}{btn}'
        '<p style="color:#94a3b8;font-size:11px;margin:28px 0 0;text-align:center;">© РУСФИНАНС 24. Это письмо отправлено автоматически, отвечать на него не нужно.</p>'
        '</td></tr></table></td></tr></table></body></html>'
    )


def notify_email(to: str, kind: str, name: str, **kw) -> None:
    """Письмо клиенту о событии по заявке. Ошибки не прерывают работу, результат пишется в email_log."""
    to = (to or "").strip()
    if not to or "@" not in to:
        return
    name = name or "клиент"
    num = kw.get("num")
    n = f" №{num}" if num else ""
    amt = f"{int(float(kw['amount'])):,} ₽".replace(",", " ") if kw.get("amount") else ""
    green, red, amber, blue = "#10b981", "#dc2626", "#f59e0b", "#0ea5e9"
    templates = {
        "postponed": (f"Заявка{n} отложена", "Заявка отложена", amber,
                      ["Ваша заявка временно отложена. Мы вернёмся к её рассмотрению позже и сообщим о решении.",
                       "Статус заявки всегда можно посмотреть в личном кабинете."], "Открыть личный кабинет"),
        "partner_approved": (f"Заявка{n} одобрена — РУСФИНАНС 24", "Заявка одобрена!", green,
                             [f"Ваша заявка одобрена{(' на сумму <b>' + amt + '</b>') if amt else ''}.",
                              "Чтобы получить займ, оформите карту нашего партнёра и пройдите идентификацию. Подробная инструкция — в личном кабинете."], "Открыть личный кабинет"),
        "creditdoctor_approved": (f"Заявка{n} одобрена по программе «Кредитный Доктор»", "Заявка одобрена", green,
                                  ["Ваша заявка одобрена по программе «Кредитный Доктор». Программа поможет восстановить вашу кредитную историю.",
                                   "Подробности — в личном кабинете."], "Открыть личный кабинет"),
        "identification_ok": (f"Идентификация пройдена{n}", "Идентификация пройдена", green,
                              ["Идентификация карты успешно пройдена. Теперь вы можете подписать договор в личном кабинете."], "Подписать договор"),
        "identification_fail": (f"Идентификация не пройдена{n}", "Идентификация не пройдена", red,
                                ["Идентификация карты не пройдена. Проверьте данные карты и отправьте их повторно в личном кабинете."], "Открыть личный кабинет"),
        "disbursed": (f"Займ{n} выдан — РУСФИНАНС 24", "Деньги отправлены!", green,
                      [f"Мы перевели вам <b>{amt}</b>." if amt else "Мы перевели вам деньги.",
                       "Зачисление на карту может занять некоторое время. Условия и график платежей — в личном кабинете."], "Открыть личный кабинет"),
        "car_approved": (f"Автозайм{n} одобрен — РУСФИНАНС 24", "Автозайм одобрен!", green,
                         [f"Ваша заявка на автозайм одобрена{(' на сумму <b>' + amt + '</b>') if amt else ''}.",
                          "Ознакомьтесь с условиями и подпишите договор в личном кабинете."], "Открыть личный кабинет"),
        "car_signing": (f"Автозайм{n}: ждём вашу подпись", "Подпишите договор", blue,
                        ["По вашему автозайму подготовлен договор. Подпишите его в личном кабинете."], "Подписать договор"),
        "car_rejected": (f"По заявке на автозайм{n} принято решение", "По заявке принято решение", red,
                         ["К сожалению, по вашей заявке на автозайм принято отрицательное решение." + (f" Причина: {kw['reason']}." if kw.get("reason") else ""),
                          "Вы можете подать новую заявку позже."], ""),
        "car_disbursed": (f"Автозайм{n} выдан — РУСФИНАНС 24", "Деньги отправлены!", green,
                          [f"Мы перевели вам <b>{amt}</b> по автозайму." if amt else "Автозайм выдан.", "Условия и график платежей — в личном кабинете."], "Открыть личный кабинет"),
        "shop_approved": (f"Займ на покупки{n} одобрен — РУСФИНАНС 24", "Займ на покупки одобрен!", green,
                          [f"Ваша заявка на займ на покупки одобрена{(' на сумму <b>' + amt + '</b>') if amt else ''}.",
                           "Ознакомьтесь с условиями и подпишите договор в личном кабинете."], "Открыть личный кабинет"),
        "shop_signing": (f"Займ на покупки{n}: ждём вашу подпись", "Подпишите договор", blue,
                         ["По вашему займу на покупки подготовлен договор. Подпишите его в личном кабинете."], "Подписать договор"),
        "shop_rejected": (f"По заявке на займ на покупки{n} принято решение", "По заявке принято решение", red,
                          ["К сожалению, по вашей заявке на займ на покупки принято отрицательное решение." + (f" Причина: {kw['reason']}." if kw.get("reason") else ""),
                           "Вы можете подать новую заявку позже."], ""),
        "shop_disbursed": (f"Займ на покупки{n} выдан — РУСФИНАНС 24", "Деньги отправлены!", green,
                           [f"Мы перевели вам <b>{amt}</b> по займу на покупки." if amt else "Займ на покупки выдан.", "Условия и график платежей — в личном кабинете."], "Открыть личный кабинет"),
        "support_reply": ("Ответ службы поддержки — РУСФИНАНС 24", "Ответ службы поддержки", blue,
                          ["Мы ответили на ваше сообщение в чате поддержки. Откройте личный кабинет, чтобы прочитать ответ."], "Открыть личный кабинет"),
    }
    t = templates.get(kind)
    if not t:
        return
    subject, title, color, lines, button = t
    html = _mail_html(title, color, name, lines, button)
    status, err = "sent", None
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    if not smtp_user or not smtp_pass:
        status, err = "failed", "Не заданы SMTP_USER / SMTP_PASSWORD"
    else:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"РУСФИНАНС 24 <{smtp_user}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        try:
            with smtplib.SMTP_SSL("smtp.yandex.ru", 465, timeout=5) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, to, msg.as_string())
        except Exception as ex:
            status, err = "failed", str(ex)[:300]
    try:
        c = psycopg2.connect(os.environ["DATABASE_URL"])
        k = c.cursor()
        e = lambda v: str(v or "").replace("'", "''")
        k.execute(
            f"INSERT INTO {SCHEMA}.email_log (to_email, subject, kind, status, error) "
            f"VALUES ('{e(to)}', '{e(subject)}', '{e(kind)}', '{status}', {('NULL' if not err else chr(39) + e(err) + chr(39))})"
        )
        c.commit(); k.close(); c.close()
    except Exception as ex:
        print(f"[notify_email] log error: {ex}")
    print(f"[notify_email] {kind} -> {to}: {status} {err or ''}")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def tg(text: str):
    tok = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not tok:
        return
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{tok}/sendMessage",
        data=data, headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def check_admin(cur, raw_token: str) -> bool:
    t = raw_token.replace("'", "''")
    cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()")
    return cur.fetchone() is not None


def s(val) -> str:
    return (str(val) if val is not None else "").replace("'", "''")


def redeem_promo(cur, code: str, phone: str, used_for: str):
    """Погашает одноразовый промокод. Возвращает (код, скидка%) или None."""
    c = code.strip().upper().replace("'", "''")
    if not c:
        return None
    ph = phone.replace("'", "''")
    cur.execute(
        f"UPDATE {SCHEMA}.promo_codes SET used_at=NOW(), used_phone='{ph}', used_for='{used_for}' "
        f"WHERE code='{c}' AND used_at IS NULL RETURNING code, discount_percent"
    )
    r = cur.fetchone()
    return (r[0], int(r[1])) if r else None


def known_client_password(cur, phone_e: str):
    for tbl in ("applications", "car_loan_applications", "shopping_loan_applications"):
        cur.execute(
            f"SELECT client_password FROM {SCHEMA}.{tbl} WHERE phone = '{phone_e}' "
            f"AND client_password IS NOT NULL AND client_password <> '' ORDER BY id DESC LIMIT 1"
        )
        r = cur.fetchone()
        if r:
            return r[0]
    return None


def ensure_client_password(cur, table: str, app_id: int, phone_e: str) -> None:
    cur.execute(f"SELECT own_password FROM {SCHEMA}.users WHERE phone = '{phone_e}'")
    _op = cur.fetchone()
    if _op and _op[0]:
        return
    cur.execute(f"SELECT client_password FROM {SCHEMA}.{table} WHERE id = {int(app_id)}")
    r = cur.fetchone()
    if r and r[0]:
        return
    pw = known_client_password(cur, phone_e)
    if not pw:
        pw = secrets.token_hex(4)
        cur.execute(
            f"UPDATE {SCHEMA}.users SET password_hash = '{hashlib.sha256(pw.encode()).hexdigest()}', plain_password = '{pw}' WHERE phone = '{phone_e}'"
        )
    cur.execute(f"UPDATE {SCHEMA}.{table} SET client_password = '{pw}' WHERE id = {int(app_id)}")


def update_sb_fields(cur, table: str, app_id: int, b: dict) -> None:
    def e(k): return str(b.get(k) or "").replace("'", "''")
    sal = b.get("salary")
    try:
        sal_sql = str(float(str(sal).replace(" ", ""))) if sal not in (None, "", "0") else "NULL"
    except ValueError:
        sal_sql = "NULL"
    cur.execute(
        f"UPDATE {SCHEMA}.{table} SET workplace = '{e('workplace')}', position = '{e('position')}', "
        f"active_loans = '{e('activeLoans')}', salary = {sal_sql}, contact_person = '{e('contactPerson')}', "
        f"sb_score = '{e('sbScore')}', card_number = '{e('cardNumber')}' WHERE id = {int(app_id)}"
    )


def reset_client_password(cur, phone_e: str) -> str:
    pw = secrets.token_hex(4)
    pw_hash = hashlib.sha256(pw.encode()).hexdigest()
    cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = '{pw_hash}', plain_password = '{pw}' WHERE phone = '{phone_e}'")
    for tbl in ("applications", "car_loan_applications", "shopping_loan_applications"):
        cur.execute(f"UPDATE {SCHEMA}.{tbl} SET client_password = '{pw}' WHERE phone = '{phone_e}'")
    return pw


def applications_paused() -> bool:
    c = psycopg2.connect(os.environ["DATABASE_URL"])
    k = c.cursor()
    k.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'applications_paused'")
    r = k.fetchone()
    k.close(); c.close()
    return bool(r) and r[0] == "true"

def pause_message() -> str:
    c = psycopg2.connect(os.environ["DATABASE_URL"])
    k = c.cursor()
    k.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'pause_message'")
    r = k.fetchone()
    k.close(); c.close()
    return "Новые заявки временно не принимаются. " + ((r[0] if r and r[0].strip() else "") or "Приносим извинения.")

def handler(event: dict, context) -> dict:
    """Займ на покупку товаров: публичный приём заявок, управление для администратора, статус для клиента."""
    method = event.get("httpMethod", "GET")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")

    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw_token = hdrs.get("x-authorization") or hdrs.get("authorization") or ""
    token = raw_token.replace("Bearer ", "").replace("bearer ", "").strip()

    conn = get_conn()
    cur = conn.cursor()

    # ── POST / ── принять новую заявку (публичный) ────────────────────────────
    if method == "POST" and not sub:
        if applications_paused():
            return {"statusCode": 503, "headers": CORS, "body": json.dumps({"error": pause_message()}, ensure_ascii=False)}
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b

        full_name      = s(b.get("fullName"))
        phone          = s(b.get("phone"))
        email          = s(b.get("email"))
        birth_date     = s(b.get("birthDate"))
        address        = s(b.get("address"))
        living_address = s(b.get("livingAddress"))
        work_address   = s(b.get("workAddress"))
        if passport_taken(cur, b.get("passportSeries"), b.get("passportNumber"), b.get("phone"), b.get("snils")):
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": DUPLICATE_MSG}, ensure_ascii=False)}
        passport_series = s(b.get("passportSeries"))
        passport_number = s(b.get("passportNumber"))
        passport_date  = s(b.get("passportDate"))
        passport_by    = s(b.get("passportBy"))
        snils          = s(b.get("snils"))
        shop_name      = s(b.get("shopName"))
        item_name      = s(b.get("itemName"))
        contact_person = s(b.get("contactPerson"))
        card_number    = s(b.get("cardNumber"))
        file_passport  = s(b.get("filePassport"))
        file_registration = s(b.get("fileRegistration"))
        file_selfie    = s(b.get("fileSelfie"))
        file_snils     = s(b.get("fileSnils"))

        birth_place    = s(b.get("birthPlace"))
        passport_code  = s(b.get("passportCode"))
        workplace      = s(b.get("workplace"))
        position       = s(b.get("position"))
        work_phone     = s(b.get("workPhone"))
        telegram_id    = s(b.get("telegramId"))
        file_prev      = s(b.get("filePreviousPassports"))
        try:
            salary_sql = str(float(b["salary"])) if b.get("salary") else "NULL"
        except (TypeError, ValueError):
            salary_sql = "NULL"

        item_price_raw  = b.get("itemPrice")
        loan_amount_raw = b.get("loanAmount")
        loan_months_raw = b.get("loanMonths")
        item_price  = int(item_price_raw)   if item_price_raw  is not None else 0
        loan_amount = int(loan_amount_raw)  if loan_amount_raw is not None else 0
        loan_months = int(loan_months_raw)  if loan_months_raw is not None else 12
        bd_val = f"'{birth_date}'" if birth_date else "NULL"

        promo_in = (b.get("promoCode") or "").strip()
        promo_code_v, promo_disc_v = None, 0
        if promo_in:
            red = redeem_promo(cur, promo_in, b.get("phone") or "", "shoploan")
            if not red:
                conn.rollback(); cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Промокод недействителен или уже использован"}, ensure_ascii=False)}
            promo_code_v, promo_disc_v = red
        else:
            cur.execute(f"SELECT promo_code, promo_discount FROM {SCHEMA}.users WHERE phone = '{phone}' AND promo_code IS NOT NULL")
            sv = cur.fetchone()
            if sv:
                promo_code_v, promo_disc_v = sv[0], int(sv[1])
                cur.execute(f"UPDATE {SCHEMA}.users SET promo_code=NULL, promo_discount=0 WHERE phone = '{phone}'")
        promo_sql = f"'{promo_code_v}'" if promo_code_v else "NULL"

        cur.execute(
            f"INSERT INTO {SCHEMA}.shopping_loan_applications "
            f"(full_name, phone, email, birth_date, address, passport_series, passport_number, "
            f" passport_date, passport_by, snils, shop_name, item_name, item_price, "
            f" loan_amount, loan_months, contact_person, card_number, "
            f" file_passport, file_registration, file_selfie, file_snils, "
            f" status, created_at, updated_at, promo_code, promo_discount, living_address, work_address, "
            f" birth_place, passport_code, workplace, position, work_phone, salary, telegram_id, file_previous_passports) "
            f"VALUES ('{full_name}','{phone}','{email}',{bd_val},'{address}',"
            f"'{passport_series}','{passport_number}','{passport_date}','{passport_by}',"
            f"'{snils}','{shop_name}','{item_name}',{item_price},"
            f"{loan_amount},{loan_months},'{contact_person}','{card_number}',"
            f"'{file_passport}','{file_registration}','{file_selfie}','{file_snils}',"
            f"'pending',NOW(),NOW(),{promo_sql},{promo_disc_v},'{living_address}','{work_address}',"
            f"'{birth_place}','{passport_code}','{workplace}','{position}','{work_phone}',{salary_sql},'{telegram_id}','{file_prev}') RETURNING id"
        )
        new_id = cur.fetchone()[0]

        # Создаём/находим пользователя и сессию для ЛК
        own_pw_in = str(b.get("password") or "").strip()
        plain_pw = secrets.token_hex(6)
        pw_hash = hashlib.sha256((own_pw_in or plain_pw).encode()).hexdigest()
        own_flag = "TRUE" if own_pw_in else "FALSE"
        ph_e2 = (b.get("phone") or "").replace("'", "''")
        fn_e2 = full_name.replace("'", "''")
        em_e2 = email.replace("'", "''")
        cur.execute(f"SELECT id, own_password FROM {SCHEMA}.users WHERE phone = '{ph_e2}'")
        u = cur.fetchone()
        if not u:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email, own_password, plain_password) "
                f"VALUES ('{ph_e2}', '{pw_hash}', '{fn_e2}', '{em_e2}', {own_flag}, '{(own_pw_in or plain_pw).replace(chr(39), chr(39)*2)}') RETURNING id"
            )
            user_id = cur.fetchone()[0]
            if not own_pw_in:
                cur.execute(f"UPDATE {SCHEMA}.shopping_loan_applications SET client_password = '{plain_pw}' WHERE id = {new_id}")
        else:
            user_id = u[0]
            if own_pw_in and not u[1]:
                cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = '{pw_hash}', own_password = TRUE, plain_password = '{(own_pw_in or plain_pw).replace(chr(39), chr(39)*2)}' WHERE id = {user_id}")
            elif not own_pw_in and not u[1]:
                _kp = known_client_password(cur, ph_e2)
                if _kp:
                    cur.execute(f"UPDATE {SCHEMA}.shopping_loan_applications SET client_password = '{_kp}' WHERE id = {new_id}")

        sess_token = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) "
            f"VALUES ({user_id}, '{sess_token}', '{expires_at}')"
        )
        conn.commit()

        tg(
            f"🛒 <b>Новая заявка на товарный займ #{new_id}</b>\n\n"
            f"👤 <b>ФИО:</b> {b.get('fullName','')}\n"
            f"📞 <b>Телефон:</b> {b.get('phone','')}\n"
            f"🏪 <b>Магазин:</b> {b.get('shopName','—')}\n"
            f"📦 <b>Товар:</b> {b.get('itemName','—')}\n"
            f"💰 <b>Сумма:</b> {loan_amount:,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {loan_months} мес."
        )

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id, "token": sess_token})}

    # ── GET /?sub=list&status=pending ── список заявок для админа ─────────────
    if method == "GET" and sub == "list":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        sf = (qs.get("status", "pending") or "pending").replace("'", "''")
        if sf not in ("pending", "signing", "approved", "rejected", "disbursed"):
            sf = "pending"

        if sf == "disbursed":
            where = "disbursed_at IS NOT NULL"
        else:
            where = f"status = '{sf}'"

        cur.execute(
            f"SELECT id, full_name, phone, email, birth_date, address, passport_series, passport_number, "
            f"passport_date, passport_by, snils, shop_name, item_name, item_price, "
            f"loan_amount, loan_months, contact_person, card_number, "
            f"file_passport, file_registration, file_selfie, file_snils, "
            f"status, reject_reason, approved_amount, approved_months, approved_rate, "
            f"notes, contract_signed, contract_signed_at, created_at, updated_at, disbursed_at, promo_code, promo_discount, "
            f"living_address, work_address, birth_place, passport_code, workplace, position, work_phone, salary, telegram_id, file_previous_passports "
            f", client_password, reviewed_at, active_loans, sb_score, contract_url "
            f"FROM {SCHEMA}.shopping_loan_applications WHERE {where} ORDER BY created_at DESC"
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        result = []
        for row in rows:
            item = {}
            for col, val in zip(cols, row):
                if hasattr(val, "isoformat"):
                    item[col] = val.isoformat()
                elif isinstance(val, Decimal):
                    item[col] = float(val)
                else:
                    item[col] = val
            result.append(item)

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "items": result}, ensure_ascii=False)}

    # ── GET /?sub=get&phone=... ── статус заявки для клиента ──────────────────
    if method == "GET" and sub == "get":
        phone_q = (qs.get("phone") or "").replace("'", "''")
        if not phone_q:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "phone required"})}

        cur.execute(
            f"SELECT id, loan_amount, loan_months, status, reject_reason, approved_amount, "
            f"approved_months, approved_rate, notes, shop_name, item_name, item_price, "
            f"contract_signed, contract_signed_at, created_at, disbursed_at, "
            f"full_name, email, birth_date, address, passport_series, passport_number, passport_date, "
            f"passport_by, snils, contact_person, card_number, promo_code, promo_discount, contract_url "
            f"FROM {SCHEMA}.shopping_loan_applications WHERE phone = '{phone_q}' ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
        keys = ["id","loan_amount","loan_months","status","reject_reason","approved_amount",
                "approved_months","approved_rate","notes","shop_name","item_name","item_price",
                "contract_signed","contract_signed_at","created_at","disbursed_at",
                "full_name","email","birth_date","address","passport_series","passport_number","passport_date",
                "passport_by","snils","contact_person","card_number","promo_code","promo_discount","contract_url"]
        item = {}
        for k, v in zip(keys, row):
            if hasattr(v, "isoformat"):
                item[k] = v.isoformat()
            elif isinstance(v, Decimal):
                item[k] = float(v)
            else:
                item[k] = v

        # История платежей
        cur.execute(
            f"SELECT amount, paid_at, note FROM {SCHEMA}.payments "
            f"WHERE loan_type = 'shoploan' AND loan_id = {item['id']} ORDER BY paid_at DESC"
        )
        payments = [
            {"amount": float(r[0]), "paidAt": msk(r[1]).strftime("%d.%m.%Y в %H:%M"), "note": r[2] or ""}
            for r in cur.fetchall()
        ]
        item["payments"] = payments
        item["paidTotal"] = sum(p["amount"] for p in payments)

        item["earlyPayoff"] = None
        if item.get("status") == "approved" and item.get("disbursed_at"):
            _a = float(item.get("approved_amount") or item.get("loan_amount") or 0)
            _m = int(item.get("approved_months") or item.get("loan_months") or 0)
            _r = float(item.get("approved_rate") or 9) / 100
            _start = datetime.fromisoformat(item["disbursed_at"])
            _em = min(_m, max(0, (datetime.utcnow() - _start).days) // 30 + 1)
            _full = max(0.0, round(_a * (1 + _r * _m)) - item["paidTotal"])
            _early = max(0.0, round(_a * (1 + _r * _em)) - item["paidTotal"])
            if 0 < _early < _full:
                item["earlyPayoff"] = {"months": _em, "remaining": _early, "saving": _full - _early}

        # Расчётный ежемесячный график погашения (если одобрен/выдан)
        item["schedule"] = []
        eff_amount = item.get("approved_amount") or item.get("loan_amount")
        eff_months = item.get("approved_months") or item.get("loan_months")
        eff_rate = item.get("approved_rate")
        promo_d = int(item.get("promo_discount") or 0)
        if eff_rate and promo_d:
            eff_rate = round(float(eff_rate) * (100 - promo_d) / 100, 4)
        item["effective_rate"] = eff_rate
        if item["status"] in ("approved", "signing") and eff_amount and eff_months and eff_rate:
            monthly_principal = float(eff_amount) / int(eff_months)
            remaining = float(eff_amount)
            start = None
            if item.get("disbursed_at"):
                start = datetime.fromisoformat(item["disbursed_at"])
            elif item.get("created_at"):
                start = datetime.fromisoformat(item["created_at"])
            for m in range(1, int(eff_months) + 1):
                interest_m = round(remaining * float(eff_rate) / 100)
                payment_m = round(monthly_principal + interest_m)
                due = (start + timedelta(days=30 * m)).strftime("%d.%m.%Y") if start else None
                item["schedule"].append({
                    "month": m, "dueDate": due, "amount": payment_m,
                    "principal": round(monthly_principal), "interest": interest_m,
                })
                remaining -= monthly_principal

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "item": item}, ensure_ascii=False)}

    # --- POST /?sub=reset_password&id=N — сбросить пароль клиента (админ) ---
    if method == "POST" and sub == "reset_password":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
        rp_id = int(qs.get("id", 0) or 0)
        cur.execute(f"SELECT phone FROM {SCHEMA}.shopping_loan_applications WHERE id = {rp_id}")
        rp_row = cur.fetchone()
        if not rp_row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        new_pw = reset_client_password(cur, str(rp_row[0]).replace("'", "''"))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "password": new_pw})}

    # --- POST /?sub=sb_update&id=N — сохранить данные СБ (админ) ---
    if method == "POST" and sub == "sb_update":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
        sb_id = int(qs.get("id", 0) or 0)
        raw_sb = event.get("body") or "{}"
        sb_b = json.loads(raw_sb) if isinstance(raw_sb, str) else raw_sb
        update_sb_fields(cur, "shopping_loan_applications", sb_id, sb_b)
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── PUT /?sub=update&id=N ── обновить заявку (админ) ─────────────────────
    if method == "PUT" and sub == "update":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        app_id = int(qs.get("id", 0) or 0)
        if not app_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}

        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b

        parts = ["updated_at = NOW()"]
        if b.get("status") in ("approved", "signing", "rejected"):
            parts.append("reviewed_at = COALESCE(reviewed_at, NOW())")
        if "status" in b:
            parts.append(f"status = '{s(b['status'])}'")
        if "reject_reason" in b:
            parts.append(f"reject_reason = '{s(b['reject_reason'])}'")
        if "approved_amount" in b and b["approved_amount"] is not None:
            parts.append(f"approved_amount = {int(b['approved_amount'])}")
        if "approved_months" in b and b["approved_months"] is not None:
            parts.append(f"approved_months = {int(b['approved_months'])}")
        if "approved_rate" in b and b["approved_rate"] is not None:
            parts.append(f"approved_rate = {float(b['approved_rate'])}")
        if "notes" in b:
            parts.append(f"notes = '{s(b['notes'])}'")

        cur.execute(
            f"UPDATE {SCHEMA}.shopping_loan_applications "
            f"SET {', '.join(parts)} WHERE id = {app_id} RETURNING phone, full_name, loan_amount"
        )
        row = cur.fetchone()
        conn.commit()

        if row:
            phone_n, fname, amt = row
            _em = None
            try:
                k9 = conn.cursor()
                k9.execute(f"SELECT email FROM {SCHEMA}.shopping_loan_applications WHERE id = {app_id}")
                _r9 = k9.fetchone(); _em = _r9[0] if _r9 else None; k9.close()
            except Exception:
                conn.rollback()
            _ns = b.get("status", "")
            if _em and _ns in ("approved", "signing", "rejected"):
                notify_email(_em, "shop_" + _ns, fname, num=app_id, amount=(b.get("approved_amount") or amt), reason=b.get("reject_reason", ""))
            if b.get("status") in ("approved", "signing"):
                ensure_client_password(cur, "shopping_loan_applications", app_id, str(phone_n).replace("'", "''"))
                conn.commit()
            new_status = b.get("status", "")
            if new_status == "approved":
                aa = b.get("approved_amount") or amt
                am = b.get("approved_months", 12)
                ar = b.get("approved_rate", 9)
                tg(
                    f"✅ <b>Товарный займ #{app_id} одобрен</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n"
                    f"💰 Одобрено: {int(aa):,} ₽, {am} мес., {ar}%/мес.".replace(",", " ")
                )
            elif new_status == "signing":
                aa = b.get("approved_amount") or amt
                am = b.get("approved_months", 12)
                ar = b.get("approved_rate", 9)
                tg(
                    f"✍️ <b>Товарный займ #{app_id} — на подписании</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n"
                    f"💰 Условия: {int(aa):,} ₽, {am} мес., {ar}%/мес.".replace(",", " ")
                )
            elif new_status == "rejected":
                reason = b.get("reject_reason", "")
                tg(
                    f"❌ <b>Товарный займ #{app_id} отклонён</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n" +
                    (f"📝 Причина: {reason}" if reason else "")
                )

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── PUT /?sub=sign&id=N ── подписать договор (клиент) ────────────────────
    if method == "PUT" and sub == "sign":
        app_id = int(qs.get("id", 0) or 0)
        if not app_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}

        cur.execute(
            f"UPDATE {SCHEMA}.shopping_loan_applications "
            f"SET contract_signed = TRUE, contract_signed_at = NOW(), updated_at = NOW() "
            f"WHERE id = {app_id} AND status = 'approved' RETURNING id, full_name, phone"
        )
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или не одобрена"})}

        tg(f"✍️ <b>Договор подписан #{row[0]}</b>\n👤 {row[1]} | 📞 {row[2]}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── POST /?sub=disburse&id=N ── выдать займ (отметить деньги переведены) ──
    if method == "POST" and sub == "disburse":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        app_id = int(qs.get("id", 0) or 0)
        if not app_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}

        cur.execute(
            f"UPDATE {SCHEMA}.shopping_loan_applications "
            f"SET disbursed_at = NOW(), updated_at = NOW() "
            f"WHERE id = {app_id} RETURNING full_name, phone, approved_amount, loan_amount"
        )
        row = cur.fetchone()
        conn.commit()
        _em2 = None
        if row:
            cur.execute(f"SELECT email FROM {SCHEMA}.shopping_loan_applications WHERE id = {app_id}")
            _r2 = cur.fetchone(); _em2 = _r2[0] if _r2 else None
        cur.close(); conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}

        fname, phone_n, aa, la = row
        amt = aa or la
        if _em2:
            notify_email(_em2, "shop_disbursed", fname, num=app_id, amount=amt)
        tg(
            f"💸 <b>Товарный займ #{app_id} выдан</b>\n"
            f"👤 {fname or '—'} | 📞 {phone_n}\n"
            f"💰 Сумма: {int(float(amt)):,} ₽".replace(",", " ")
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.close(); conn.close()
    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown request"})}
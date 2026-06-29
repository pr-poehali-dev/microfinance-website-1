"""Панель администратора: вход, список клиентов, добавление/редактирование займов. v4"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import urllib.request
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"


def tg(text: str):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        return
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def tg_client(username: str, text: str):
    """Отправляет сообщение клиенту по @username через Telegram-бота."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token or not username:
        return
    chat_id = f"@{username}" if not username.startswith("@") else username
    data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def send_email(to: str, subject: str, html: str):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    if not smtp_user or not smtp_pass or not to:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"PARAFINANS24 <{smtp_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP_SSL("smtp.yandex.ru", 465, timeout=10) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to, msg.as_string())
        print(f"[send-email] sent to {to}")
    except Exception as ex:
        print(f"[send-email] error: {ex}")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def check_admin_token(cur, token: str) -> bool:
    t = token.replace("'", "''")
    cur.execute(
        f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()"
    )
    return cur.fetchone() is not None


def handler(event: dict, context) -> dict:
    """Панель администратора: авторизация и управление займами клиентов."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    headers_in = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw_token = (headers_in.get("x-authorization") or headers_in.get("authorization") or "")
    token = raw_token.replace("Bearer ", "").replace("bearer ", "").strip()
    print(f"[admin] method={method} sub={sub!r} token_len={len(token)}")

    conn = get_conn()
    cur = conn.cursor()

    # --- ВХОД АДМИНИСТРАТОРА ---
    if sub == "" and method == "POST" and body.get("action") == "login":
        password = body.get("password", "")
        admin_password = os.environ.get("ADMIN_PASSWORD", "")
        if not admin_password or password != admin_password:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный пароль"})}

        tok = secrets.token_hex(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_sessions (token, expires_at) "
            f"VALUES ('{tok}', NOW() + INTERVAL '12 hours')"
        )
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": tok})}

    # --- ПРОВЕРКА ТОКЕНА ---
    token_valid = check_admin_token(cur, token)
    print(f"[admin] token_valid={token_valid}")
    if not token_valid:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    # --- СПИСОК КЛИЕНТОВ (GET, sub='') ---
    if sub == "" and method == "GET":
        cur.execute(f"""
            SELECT u.id, u.phone, u.full_name, u.email, u.created_at,
                   COUNT(l.id) AS loan_count,
                   COALESCE(SUM(CASE WHEN l.status != 'paid' THEN l.amount ELSE 0 END), 0) AS debt
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.loans l ON l.user_id = u.id
            GROUP BY u.id ORDER BY u.created_at DESC
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        users = [{"id": r[0], "phone": r[1], "fullName": r[2] or "", "email": r[3] or "",
                  "createdAt": r[4].strftime("%d.%m.%Y"), "loanCount": r[5], "debt": float(r[6])} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users}, ensure_ascii=False)}

    # --- ЗАЙМЫ КЛИЕНТА (GET, sub='loans', userId=...) ---
    if sub == "loans" and method == "GET":
        user_id = int(qs.get("userId", 0))
        cur.execute(f"SELECT id, amount, days, rate, status, created_at FROM {SCHEMA}.loans WHERE user_id = {user_id} ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.execute(f"SELECT phone, full_name FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        cur.close(); conn.close()
        loans = [{"id": r[0], "amount": float(r[1]), "days": r[2], "rate": float(r[3]),
                  "ratePercent": round(float(r[3]) * 100, 1), "status": r[4],
                  "createdAt": r[5].strftime("%d.%m.%Y")} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(
            {"loans": loans, "user": {"phone": u[0] if u else "", "fullName": u[1] if u else ""}},
            ensure_ascii=False
        )}

    # --- ДОБАВИТЬ ЗАЙМ (POST, sub='loans') ---
    if sub == "loans" and method == "POST":
        phone  = (body.get("phone") or "").strip()
        amount = float(body.get("amount", 0))
        days   = int(body.get("days", 0))
        rate   = float(body.get("rate", 0.008))

        if not phone or amount <= 0 or days <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}

        ph_e = phone.replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{ph_e}'")
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент с таким номером не найден"})}

        cur.execute(f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status) VALUES ({user[0]}, {amount}, {days}, {rate}, 'active') RETURNING id")
        loan_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        interest = round(amount * rate * days)
        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"💰 <b>Новый займ выдан</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Клиент:</b> {phone}\n"
            f"💵 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"📈 <b>Ставка:</b> {round(rate * 100, 1)}%/день\n"
            f"💳 <b>К возврату:</b> {int(amount + interest):,} ₽\n".replace(",", " ") +
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ИЗМЕНИТЬ СТАТУС ЗАЙМА (PUT, sub='loan', loanId=...) ---
    if sub == "loan" and method == "PUT":
        loan_id = qs.get("loanId")
        status  = body.get("status", "active")
        lid = int(loan_id) if loan_id else 0
        st_e = status.replace("'", "''")
        cur.execute(f"SELECT l.amount, u.phone FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id WHERE l.id = {lid}")
        row = cur.fetchone()
        cur.execute(f"UPDATE {SCHEMA}.loans SET status = '{st_e}' WHERE id = {lid}")
        conn.commit(); cur.close(); conn.close()

        STATUS_LABELS = {"active": "Активен ✅", "paid": "Погашен ✔️", "overdue": "Просрочен ⚠️", "review": "На рассмотрении 🔍"}
        if row:
            tg(
                f"🔄 <b>Статус займа изменён</b>\n\n"
                f"📞 <b>Клиент:</b> {row[1]}\n"
                f"💵 <b>Сумма:</b> {int(row[0]):,} ₽\n".replace(",", " ") +
                f"🔖 <b>Займ №:</b> {loan_id}\n"
                f"📌 <b>Новый статус:</b> {STATUS_LABELS.get(status, status)}"
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ЗАРЕГИСТРИРОВАТЬ КЛИЕНТА (POST, sub='register') ---
    if sub == "register" and method == "POST":
        phone     = (body.get("phone") or "").strip()
        full_name = (body.get("fullName") or "").strip()
        password  = (body.get("password") or "").strip()

        if not phone or not password:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Телефон и пароль обязательны"})}

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        ph_e = phone.replace("'", "''")
        fn_e = (full_name or "").replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{ph_e}'")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Клиент уже зарегистрирован"})}

        cur.execute(f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name) VALUES ('{ph_e}', '{pw_hash}', '{fn_e}') RETURNING id")
        uid = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"👤 <b>Новый клиент зарегистрирован</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"🙍 <b>ФИО:</b> {full_name or '—'}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "userId": uid})}

    # --- СПИСОК ЗАЯВОК (GET, sub='applications') — все статусы за один запрос ---
    if sub == "applications" and method == "GET":
        status_filter = qs.get("status", "all")
        print(f"[applications] status_filter={status_filter!r}")
        where_clause = "" if status_filter == "all" else f"WHERE a.status = '{status_filter.replace(chr(39), chr(39)*2)}'"
        cur.execute(f"""
            SELECT a.id, a.full_name, a.phone, a.email, a.amount, a.days, a.birth_date,
                   a.passport_series, a.passport_number, a.status, a.created_at, a.reject_reason,
                   a.telegram_id, a.birth_place, a.passport_date, a.passport_code, a.passport_by,
                   a.file_passport, a.file_registration, a.file_selfie, a.file_previous_passports,
                   a.workplace, a.position, a.active_loans, a.salary, a.contact_person, a.sb_score,
                   a.approved_amount, a.client_password, a.card_number,
                   a.approved_rate, a.approved_days,
                   l.id AS loan_id, l.signed, l.signed_at, l.status AS loan_status, l.disbursed_at,
                   a.snils, a.work_phone, a.card_number_transfer, a.is_credit_doctor
            FROM {SCHEMA}.applications a
            LEFT JOIN LATERAL (
                SELECT lo.id, lo.signed, lo.signed_at, lo.status, lo.disbursed_at
                FROM {SCHEMA}.loans lo
                JOIN {SCHEMA}.users u ON u.id = lo.user_id
                WHERE u.phone = a.phone
                ORDER BY lo.created_at DESC LIMIT 1
            ) l ON true
            {where_clause} ORDER BY a.created_at DESC
        """)
        rows = cur.fetchall()
        print(f"[applications] found {len(rows)} rows")
        cur.close(); conn.close()
        apps = [{
            "id": r[0], "fullName": r[1] or "", "phone": r[2], "email": r[3] or "",
            "amount": float(r[4]) if r[4] else 0, "days": r[5] or 0,
            "birthDate": str(r[6]) if r[6] else "", "passportSeries": r[7] or "",
            "passportNumber": r[8] or "", "status": r[9],
            "createdAt": r[10].strftime("%d.%m.%Y в %H:%M"), "rejectReason": r[11] or "",
            "telegramId": r[12] or "", "birthPlace": r[13] or "",
            "passportDate": str(r[14]) if r[14] else "", "passportCode": r[15] or "",
            "passportBy": r[16] or "",
            "filePassport": r[17] or "", "fileRegistration": r[18] or "",
            "fileSelfie": r[19] or "", "filePreviousPassports": r[20] or "",
            "workplace": r[21] or "", "position": r[22] or "",
            "activeLoans": r[23] or "", "salary": float(r[24]) if r[24] else 0,
            "contactPerson": r[25] or "", "sbScore": r[26] or "",
            "approvedAmount": float(r[27]) if r[27] else None,
            "clientPassword": r[28] or "",
            "cardNumber": r[29] or "",
            "approvedRate": float(r[30]) if r[30] else None,
            "approvedDays": int(r[31]) if r[31] else None,
            "loanId": r[32],
            "loanSigned": bool(r[33]) if r[33] is not None else False,
            "loanSignedAt": r[34].strftime("%d.%m.%Y в %H:%M") if r[34] else None,
            "loanStatus": r[35] or None,
            "loanDisbursedAt": r[36].strftime("%d.%m.%Y в %H:%M") if r[36] else None,
            "snils": r[37] or "",
            "workPhone": r[38] or "",
            "cardNumberTransfer": r[39] or "",
            "isCreditDoctor": bool(r[40]) if r[40] is not None else False,
        } for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"applications": apps}, ensure_ascii=False)}

    # --- ОДОБРИТЬ ЗАЯВКУ (POST, sub='approve', appId=...) ---
    if sub == "approve" and method == "POST":
        app_id = qs.get("appId")
        rate = float(body.get("rate", 0.008))
        approved_amount = body.get("amount")  # Если админ изменил сумму

        app_id_esc = str(app_id).replace("'", "''")
        cur.execute(f"""
            SELECT full_name, phone, amount, days, telegram_id, email
            FROM {SCHEMA}.applications WHERE id = '{app_id_esc}' AND status = 'pending'
        """)
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или уже обработана"})}

        full_name, phone, amount, days, tg_username, client_email = app
        # Используем сумму от администратора если указана, иначе из заявки
        if approved_amount:
            amount = float(approved_amount)

        # Находим или создаём пользователя, всегда генерируем новый пароль
        import secrets as _s, hashlib as _h, string as _str
        alphabet = _str.ascii_letters + _str.digits
        plain_password = (
            _s.choice(_str.ascii_uppercase) +
            "".join(_s.choice(_str.ascii_lowercase) for _ in range(4)) +
            "".join(_s.choice(_str.digits) for _ in range(3)) +
            _s.choice("!@#$") +
            "".join(_s.choice(alphabet) for _ in range(3))
        )
        pw_hash = _h.sha256(plain_password.encode()).hexdigest()

        phone_esc = phone.replace("'", "''")
        fn_esc = (full_name or "").replace("'", "''")
        em_esc = (client_email or "").replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone_esc}'")
        user = cur.fetchone()
        if not user:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
                f"VALUES ('{phone_esc}', '{pw_hash}', '{fn_esc}', '{em_esc}') RETURNING id"
            )
            user_id = cur.fetchone()[0]
        else:
            user_id = user[0]
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash='{pw_hash}' WHERE id={user_id}")

        # Создаём займ со статусом review — клиент сам подпишет договор в ЛК
        cur.execute(
            f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status, offer_amount, offer_days, offer_rate) "
            f"VALUES ({user_id},{amount},{days},{rate},'review',{amount},{days},{rate}) RETURNING id"
        )
        loan_id = cur.fetchone()[0]

        # Обновляем статус заявки, сохраняем сумму, ставку, срок и пароль клиента
        pw_esc = plain_password.replace("'", "''")
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET status='approved', reviewed_at=NOW(), "
            f"approved_amount={amount}, approved_rate={rate}, approved_days={days}, "
            f"client_password='{pw_esc}' WHERE id='{app_id_esc}'"
        )
        conn.commit(); cur.close(); conn.close()

        # Генерируем PDF договора асинхронно (не блокируем ответ)
        try:
            import urllib.request as _ur
            contract_payload = json.dumps({"appId": int(app_id), "loanId": loan_id}).encode()
            contract_req = _ur.Request(
                "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3",
                data=contract_payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
                method="POST"
            )
            _ur.urlopen(contract_req, timeout=60)
            print(f"[admin] contract generated for app_id={app_id}")
        except Exception as ex:
            print(f"[admin] contract generation error: {ex}")

        interest = round(float(amount) * rate * int(days))
        total = float(amount) + interest
        now = datetime.now().strftime("%d.%m.%Y в %H:%М")

        tg(
            f"✅ <b>Заявка одобрена</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        if tg_username:
            tg_client(
                tg_username,
                f"✅ <b>Ваша заявка одобрена!</b>\n\n"
                f"💰 <b>Сумма займа:</b> {int(amount):,} ₽\n".replace(",", " ") +
                f"📅 <b>Срок:</b> {days} дн.\n"
                f"📈 <b>Ставка:</b> {round(rate * 100, 1)}%/день\n"
                f"💳 <b>К возврату:</b> {int(total):,} ₽\n\n".replace(",", " ") +
                f"Деньги будут переведены на вашу карту. Ожидайте звонка специалиста."
            )
        if client_email:
            amount_fmt = f"{int(amount):,}".replace(",", " ")
            total_fmt = f"{int(total):,}".replace(",", " ")
            send_email(
                to=client_email,
                subject=f"Ваш займ #{loan_id} одобрен — PARAFINANS24",
                html=f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F0A1E;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0A1E;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1030;border-radius:16px;overflow:hidden;border:1px solid rgba(74,222,128,0.3);">
        <tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">PARAFINANS24</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">✅ Займ одобрен!</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0 0 16px;">Здравствуйте, <b style="color:#fff;">{full_name or phone}</b>!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;line-height:1.6;">Ваша заявка рассмотрена и <b style="color:#4ade80;">одобрена</b>. Деньги будут переведены на вашу карту. Ожидайте звонка специалиста.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(74,222,128,0.1);border-radius:12px;border:1px solid rgba(74,222,128,0.3);margin-bottom:20px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Сумма займа</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{amount_fmt} ₽</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Срок</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{days} дней</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Ставка</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{round(rate * 100, 1)}% в день</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">К возврату</span></td>
                  <td align="right" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;"><b style="color:#4ade80;font-size:20px;">{total_fmt} ₽</b></td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 8px;">Данные для входа в личный кабинет:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.15);border-radius:12px;border:1px solid rgba(124,58,237,0.3);margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;">ТЕЛЕФОН</p>
              <p style="margin:0 0 16px;color:#fff;font-size:18px;font-weight:bold;">{phone}</p>
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;">ПАРОЛЬ</p>
              <p style="margin:0;color:#c084fc;font-size:22px;font-weight:bold;letter-spacing:2px;">{plain_password}</p>
            </td></tr>
          </table>
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;text-align:center;">© PARAFINANS24 · Это письмо отправлено автоматически</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ОТКАЗАТЬ ПО ЗАЯВКЕ (POST, sub='reject', appId=...) ---
    if sub == "reject" and method == "POST":
        app_id = qs.get("appId")
        reason = (body.get("reason") or "").strip()

        app_id_esc = str(app_id).replace("'", "''")
        reason_esc = reason.replace("'", "''")
        cur.execute(f"""
            SELECT full_name, phone, amount, telegram_id, email
            FROM {SCHEMA}.applications WHERE id = '{app_id_esc}' AND status = 'pending'
        """)
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или уже обработана"})}

        full_name, phone, amount, tg_username, client_email = app
        reason_val = f"'{reason_esc}'" if reason_esc else "NULL"
        cur.execute(f"UPDATE {SCHEMA}.applications SET status='rejected', reviewed_at=NOW(), reject_reason={reason_val} WHERE id='{app_id_esc}'")
        conn.commit(); cur.close(); conn.close()

        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"❌ <b>Заявка отклонена</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            (f"📝 <b>Причина:</b> {reason}" if reason else "")
        )
        if tg_username:
            tg_client(tg_username,
                f"❌ <b>По вашей заявке принято отрицательное решение.</b>\n\n"
                + (f"📝 <b>Причина:</b> {reason}\n\n" if reason else "")
                + "Вы можете подать новую заявку позже или связаться с нами для уточнения деталей."
            )
        if client_email:
            reason_block = f'<p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 16px;"><b style="color:#f87171;">Причина:</b> {reason}</p>' if reason else ""
            send_email(
                to=client_email,
                subject="По вашей заявке принято решение — PARAFINANS24",
                html=f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F0A1E;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0A1E;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1030;border-radius:16px;overflow:hidden;border:1px solid rgba(239,68,68,0.3);">
        <tr><td style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">PARAFINANS24</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">По заявке принято решение</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0 0 16px;">Здравствуйте, <b style="color:#fff;">{full_name or phone}</b>!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 16px;line-height:1.6;">К сожалению, по вашей заявке на займ принято <b style="color:#f87171;">отрицательное решение</b>.</p>
          {reason_block}
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">Вы можете подать новую заявку позже или связаться с нами для уточнения деталей.</p>
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;text-align:center;">© PARAFINANS24 · Это письмо отправлено автоматически</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОТЛОЖИТЬ ЗАЯВКУ (POST, sub='postpone', appId=...) ---
    if sub == "postpone" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.applications SET status='postponed', reviewed_at=NOW() WHERE id='{app_id_e}' AND status='pending'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПАРТНЁРСКОЕ ОДОБРЕНИЕ (POST, sub='partner_approve', appId=..., body: {amount, days, rate}) ---
    if sub == "partner_approve" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        body = json.loads(event.get("body") or "{}") if isinstance(event.get("body"), str) else (event.get("body") or {})
        p_amount = float(body.get("amount", 0)) if body.get("amount") else None
        p_days = int(body.get("days", 0)) if body.get("days") else None
        p_rate = float(body.get("rate", 0)) if body.get("rate") else None
        cur.execute(f"SELECT full_name, phone, telegram_id FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND status='pending'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, tg_username = app
        set_parts = ["status='partner_card'", "reviewed_at=NOW()"]
        if p_amount: set_parts.append(f"approved_amount={p_amount}")
        if p_days: set_parts.append(f"approved_days={p_days}")
        if p_rate: set_parts.append(f"approved_rate={p_rate}")
        cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(set_parts)} WHERE id='{app_id_e}'")
        conn.commit(); cur.close(); conn.close()
        loan_info = ""
        if p_amount and p_days and p_rate:
            interest = round(p_amount * p_rate * p_days)
            loan_info = f"\n\n💰 <b>Условия займа:</b>\nСумма: {int(p_amount):,} ₽\nСрок: {p_days} дней\nСтавка: {round(p_rate*100,1)}% в день\nК возврату: {int(p_amount+interest):,} ₽"
        if tg_username:
            tg_client(tg_username,
                f"✅ <b>Ваша заявка одобрена!</b>{loan_info}\n\n"
                "Для получения займа вам необходимо оформить карту нашего партнёра.\n"
                "Подробности — в вашем личном кабинете."
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОДОБРЕНИЕ КАК КРЕДИТНЫЙ ДОКТОР (POST, sub='creditdoctor_approve', appId=..., body: {amount, days, rate}) ---
    if sub == "creditdoctor_approve" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        body = json.loads(event.get("body") or "{}") if isinstance(event.get("body"), str) else (event.get("body") or {})
        p_amount = float(body.get("amount", 0)) if body.get("amount") else None
        p_days = int(body.get("days", 0)) if body.get("days") else None
        p_rate = float(body.get("rate", 0)) if body.get("rate") else None
        cur.execute(f"SELECT full_name, phone, telegram_id FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND status='pending'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, tg_username = app
        set_parts = ["status='partner_card'", "is_credit_doctor=true", "reviewed_at=NOW()"]
        if p_amount: set_parts.append(f"approved_amount={p_amount}")
        if p_days: set_parts.append(f"approved_days={p_days}")
        if p_rate: set_parts.append(f"approved_rate={p_rate}")
        cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(set_parts)} WHERE id='{app_id_e}'")
        conn.commit(); cur.close(); conn.close()
        loan_info = ""
        if p_amount and p_days and p_rate:
            interest = round(p_amount * p_rate * p_days)
            loan_info = f"\n\n💰 <b>Условия займа:</b>\nСумма: {int(p_amount):,} ₽\nСрок: {p_days} дней\nСтавка: {round(p_rate*100,1)}% в день\nК возврату: {int(p_amount+interest):,} ₽"
        if tg_username:
            tg_client(tg_username,
                f"💊 <b>Ваша заявка одобрена по программе «Кредитный Доктор»!</b>{loan_info}\n\n"
                "Программа поможет восстановить вашу кредитную историю.\n"
                "Подробности — в вашем личном кабинете."
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- НАПОМНИТЬ КЛИЕНТУ В TELEGRAM (POST, sub='partner_remind', appId=...) ---
    if sub == "partner_remind" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, telegram_id, approved_amount, approved_days, approved_rate FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND status='partner_card'")
        app = cur.fetchone()
        cur.close(); conn.close()
        if not app:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, tg_username, p_amount, p_days, p_rate = app
        if not tg_username:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "У клиента нет Telegram"})}
        loan_info = ""
        if p_amount and p_days and p_rate:
            interest = round(float(p_amount) * float(p_rate) * int(p_days))
            loan_info = f"\n\n💰 <b>Условия займа:</b>\nСумма: {int(float(p_amount)):,} ₽\nСрок: {p_days} дней\nСтавка: {round(float(p_rate)*100,1)}% в день\nК возврату: {int(float(p_amount)+interest):,} ₽"
        tg_client(tg_username,
            f"🔔 <b>Напоминание по вашей заявке</b>{loan_info}\n\n"
            "Для получения займа необходимо оформить карту нашего партнёра.\n"
            "Войдите в личный кабинет по номеру телефона и нажмите кнопку «Оформить карту партнёра»."
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ВЕРНУТЬ ЗАЯВКУ В ОЖИДАНИЕ (POST, sub='restore', appId=...) ---
    if sub == "restore" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.applications SET status='pending', reviewed_at=NULL WHERE id='{app_id_e}' AND status IN ('postponed','approved','rejected','partner_card')")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- СОЗДАТЬ ОФФЕР ДЛЯ КЛИЕНТА (POST, sub='offer', userId=...) ---
    if sub == "offer" and method == "POST":
        user_id = int(qs.get("userId", 0))
        offer_amount = float(body.get("offerAmount", 0))
        offer_days   = int(body.get("offerDays", 0))
        offer_rate   = float(body.get("offerRate", 0.008))

        if not user_id or offer_amount <= 0 or offer_days <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status, offer_amount, offer_days, offer_rate, signed) "
            f"VALUES ({user_id}, {offer_amount}, {offer_days}, {offer_rate}, 'review', {offer_amount}, {offer_days}, {offer_rate}, FALSE) RETURNING id"
        )
        loan_id = cur.fetchone()[0]
        conn.commit()

        cur.execute(f"SELECT phone, full_name FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        cur.close(); conn.close()

        phone_u = u[0] if u else ""
        name_u  = u[1] if u else phone_u
        interest = round(offer_amount * offer_rate * offer_days)
        total = int(offer_amount + interest)
        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"📋 <b>Создан оффер для клиента</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {name_u}\n"
            f"📞 <b>Телефон:</b> {phone_u}\n"
            f"💵 <b>Сумма:</b> {int(offer_amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {offer_days} дн.\n"
            f"📈 <b>Ставка:</b> {round(offer_rate * 100, 1)}%/день\n"
            f"💳 <b>К возврату:</b> {total:,} ₽\n".replace(",", " ") +
            f"🔖 <b>Займ №:</b> {loan_id}\n"
            f"⏳ <i>Ожидает подписи клиента</i>"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ЗАРЕГИСТРИРОВАТЬ КЛИЕНТА (POST, sub='register') ---
    if sub == "register" and method == "POST":
        phone    = (body.get("phone") or "").strip()
        full_name = (body.get("fullName") or "").strip()
        password  = (body.get("password") or "").strip()

        if not phone or not password:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Телефон и пароль обязательны"})}

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        phone_e = phone.replace("'", "''")
        fn_e    = full_name.replace("'", "''")

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone_e}'")
        existing = cur.fetchone()
        if existing:
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Клиент с таким номером уже существует"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name) "
            f"VALUES ('{phone_e}', '{pw_hash}', '{fn_e}') RETURNING id"
        )
        user_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"👤 <b>Новый клиент зарегистрирован</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"👤 <b>ФИО:</b> {full_name or '—'}\n"
            f"🔖 <b>ID:</b> {user_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "userId": user_id}, ensure_ascii=False)}

    # --- ВЫДАТЬ ЗАЙМ (POST, sub='disburse', loanId=...) ---
    if sub == "disburse" and method == "POST":
        loan_id = int(qs.get("loanId", 0))
        if not loan_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан loanId"})}

        cur.execute(
            f"SELECT l.amount, l.days, l.rate, u.phone, u.full_name, u.id "
            f"FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id "
            f"WHERE l.id = {loan_id}"
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Займ не найден"})}

        amount, days, rate, phone, full_name, user_id = row
        cur.execute(
            f"UPDATE {SCHEMA}.loans SET status='active', signed=TRUE, signed_at=COALESCE(signed_at, NOW()) WHERE id={loan_id}"
        )
        conn.commit(); cur.close(); conn.close()

        interest = round(float(amount) * float(rate) * int(days))
        total = float(amount) + interest
        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"💸 <b>Займ выдан</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💵 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"📈 <b>Ставка:</b> {round(float(rate) * 100, 1)}%/день\n"
            f"💳 <b>К возврату:</b> {int(total):,} ₽\n".replace(",", " ") +
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОБНОВИТЬ ДАННЫЕ КЛИЕНТА (POST, sub='user_update', userId=...) ---
    if sub == "user_update" and method == "POST":
        user_id = int(qs.get("userId", 0))
        if not user_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан userId"})}

        full_name = (body.get("fullName") or "").replace("'", "''")
        phone     = (body.get("phone") or "").replace("'", "''")
        email     = (body.get("email") or "").replace("'", "''")
        new_pass  = (body.get("password") or "").strip()

        sets = [f"full_name = '{full_name}'", f"phone = '{phone}'", f"email = '{email}'"]
        if new_pass:
            pw_hash = hashlib.sha256(new_pass.encode()).hexdigest()
            sets.append(f"password_hash = '{pw_hash}'")

        cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(sets)} WHERE id = {user_id}")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    # --- ЗАГРУЗИТЬ ДОКУМЕНТЫ КЛИЕНТА (POST, sub='docs_upload', userId=...) ---
    if sub == "docs_upload" and method == "POST":
        import base64, boto3
        user_id = int(qs.get("userId", 0))
        if not user_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан userId"})}

        cur.execute(f"SELECT phone FROM {SCHEMA}.users WHERE id = {user_id}")
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент не найден"})}
        phone = row[0]

        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1")
        app_row = cur.fetchone()
        if not app_row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        app_id = app_row[0]

        s3 = boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])
        access_key = os.environ["AWS_ACCESS_KEY_ID"]
        now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        phone_clean = phone.replace("+", "")

        FILE_MAP = {
            "passportMain":      ("file_passport",          "passport_main"),
            "registration":      ("file_registration",      "registration"),
            "selfie":            ("file_selfie",            "selfie"),
            "previousPassports": ("file_previous_passports","previous_passports"),
        }
        sets = []
        for key, (col, suffix) in FILE_MAP.items():
            b64 = body.get(key, "")
            if not b64:
                continue
            file_data = base64.b64decode(b64)
            s3_key = f"applications/{now_ts}_{phone_clean}_{suffix}.webp"
            s3.put_object(Bucket="files", Key=s3_key, Body=file_data, ContentType="image/webp")
            url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{s3_key}"
            col_e = url.replace("'", "''")
            sets.append(f"{col} = '{col_e}'")

        if sets:
            cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(sets)} WHERE id = {app_id}")
            conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОБНОВИТЬ ПОЛЯ СБ ЗАЯВКИ (POST, sub='app_update', appId=...) ---
    if sub == "app_update" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        workplace     = (body.get("workplace") or "").replace("'", "''")
        position      = (body.get("position") or "").replace("'", "''")
        active_loans  = (body.get("activeLoans") or "").replace("'", "''")
        salary_raw    = body.get("salary")
        salary        = float(salary_raw) if salary_raw not in (None, "", "0") else None
        contact_person = (body.get("contactPerson") or "").replace("'", "''")
        sb_score      = (body.get("sbScore") or "").replace("'", "''")
        card_number   = (body.get("cardNumber") or "").replace("'", "''")

        salary_sql = str(salary) if salary is not None else "NULL"
        cur.execute(f"""
            UPDATE {SCHEMA}.applications SET
                workplace = '{workplace}',
                position = '{position}',
                active_loans = '{active_loans}',
                salary = {salary_sql},
                contact_person = '{contact_person}',
                sb_score = '{sb_score}',
                card_number = '{card_number}'
            WHERE id = '{app_id_e}'
        """)
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ВЫДАТЬ ВИРТУАЛЬНУЮ КАРТУ PARAFINANS (POST, sub='issue_card', appId=...) ---
    if sub == "issue_card" and method == "POST":
        import random, string
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        card_limit = float(body.get("limit", 0))
        card_rate = float(body.get("rate", 0))

        if not card_limit or not card_rate:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите лимит и ставку"})}

        cur.execute(f"SELECT full_name, phone FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}

        full_name, phone = app

        # Генерация данных карты
        card_number = "4276 " + " ".join("".join([str(random.randint(0,9)) for _ in range(4)]) for _ in range(3))
        now_dt = datetime.now()
        expiry_month = str(now_dt.month).zfill(2)
        expiry_year = str((now_dt.year + 3) % 100).zfill(2)
        expiry = f"{expiry_month}/{expiry_year}"
        cvv = "".join([str(random.randint(0,9)) for _ in range(3)])
        holder = (full_name or "CARD HOLDER").upper()[:26]

        cur.execute(f"""
            UPDATE {SCHEMA}.applications SET
                virtual_card_number = '{card_number}',
                virtual_card_expiry = '{expiry}',
                virtual_card_cvv = '{cvv}',
                virtual_card_holder = '{holder.replace("'","''")}',
                virtual_card_limit = {card_limit},
                virtual_card_rate = {card_rate},
                virtual_card_status = 'pending',
                virtual_card_issued_at = NOW()
            WHERE id = '{app_id_e}'
        """)
        conn.commit()

        tg(
            f"💳 <b>Виртуальная карта PARAFINANS выдана</b>\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Лимит:</b> {int(card_limit):,} ₽\n".replace(",", " ") +
            f"📈 <b>Ставка:</b> {card_rate}%/день\n"
            f"🔖 <b>Заявка №:</b> {app_id}"
        )
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПОДТВЕРДИТЬ/АКТИВИРОВАТЬ КАРТУ (POST, sub='activate_card', appId=...) ---
    if sub == "activate_card" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, phone, virtual_card_status FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, vc_status = app
        if vc_status not in ("pending", "active"):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Карта не выдана или уже активна"})}
        cur.execute(f"UPDATE {SCHEMA}.applications SET virtual_card_status='active' WHERE id='{app_id_e}'")
        conn.commit()
        tg(f"✅ <b>Карта PARAFINANS активирована</b>\n\n👤 {full_name or phone}\n📞 {phone}")
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.close(); conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Маршрут не найден"})}
"""Отправка заявки на займ: сохранение в БД + файлы в S3 + уведомление в Telegram."""
import json
import os
import urllib.request
from datetime import datetime
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"

FILE_KEYS = {
    "passportMain": "passport_main",
    "registration": "registration",
    "selfie": "selfie",
    "previousPassports": "previous_passports",
}

FILE_LABELS = {
    "passportMain": "Паспорт — главная страница",
    "registration": "Прописка",
    "selfie": "Селфи с паспортом",
    "previousPassports": "О ранее выданных паспортах",
}

DB_FILE_COLS = {
    "passportMain": "file_passport",
    "registration": "file_registration",
    "selfie": "file_selfie",
    "previousPassports": "file_previous_passports",
}



def send_telegram_message(token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def esc(val: str) -> str:
    return val.replace("'", "''")


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


def handler(event: dict, context) -> dict:
    """Приём заявки на займ: данные + параллельная загрузка фото в S3."""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    raw_body = event.get("body") or "{}"
    body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body

    full_name = (body.get("fullName") or "").strip()
    phone = (body.get("phone") or "").strip()
    email = (body.get("email") or "").strip()
    amount_raw = (body.get("amount") or "").strip()
    days_raw = (body.get("days") or "").strip()
    birth_date = (body.get("birthDate") or "").strip()
    passport_series = (body.get("passportSeries") or "").strip()
    passport_number = (body.get("passportNumber") or "").strip()
    passport_date = (body.get("passportDate") or "").strip()
    passport_code = (body.get("passportCode") or "").strip()
    passport_by = (body.get("passportBy") or "").strip()
    birth_place = (body.get("birthPlace") or "").strip()
    telegram_username = (body.get("telegramId") or "").strip().lstrip("@")

    if not full_name or not phone or not amount_raw:
        return {"statusCode": 400, "headers": cors_headers,
                "body": json.dumps({"error": "Заполните все поля"}, ensure_ascii=False)}

    try:
        amount = float(amount_raw)
    except Exception:
        amount = 0.0
    try:
        days = int(days_raw)
    except Exception:
        days = 0

    # Файлы уже загружены фронтендом в S3 — получаем готовые URL
    file_urls: dict[str, str] = {}
    for key in FILE_KEYS:
        val = body.get(key, "")
        if val and val.startswith("http"):
            file_urls[key] = val

    # Сохраняем в БД
    import hashlib as _h, secrets as _s, string as _str
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    app_id = None
    plain_password = None

    try:
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{esc(phone)}'")
        if not cur.fetchone():
            plain_password = (
                _s.choice(_str.ascii_uppercase) +
                "".join(_s.choice(_str.ascii_lowercase) for _ in range(4)) +
                "".join(_s.choice(_str.digits) for _ in range(3)) +
                _s.choice("!@#$") +
                "".join(_s.choice(_str.ascii_letters + _str.digits) for _ in range(3))
            )
            pw_hash = _h.sha256(plain_password.encode()).hexdigest()
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
                f"VALUES ('{esc(phone)}', '{pw_hash}', '{esc(full_name)}', '{esc(email)}')"
            )

        fp  = file_urls.get("passportMain", "")
        fr  = file_urls.get("registration", "")
        fs  = file_urls.get("selfie", "")
        fpp = file_urls.get("previousPassports", "")

        bd_val  = f"'{esc(birth_date)}'" if birth_date else "NULL"
        bp_val  = f"'{esc(birth_place)}'" if birth_place else "NULL"
        ps_val  = f"'{esc(passport_series)}'" if passport_series else "NULL"
        pn_val  = f"'{esc(passport_number)}'" if passport_number else "NULL"
        pd_val  = f"'{esc(passport_date)}'" if passport_date else "NULL"
        pc_val  = f"'{esc(passport_code)}'" if passport_code else "NULL"
        pb_val  = f"'{esc(passport_by)}'" if passport_by else "NULL"
        tg_val  = f"'{esc(telegram_username)}'" if telegram_username else "NULL"
        em_val  = f"'{esc(email)}'" if email else "NULL"
        fp_val  = f"'{esc(fp)}'" if fp else "NULL"
        fr_val  = f"'{esc(fr)}'" if fr else "NULL"
        fs_val  = f"'{esc(fs)}'" if fs else "NULL"
        fpp_val = f"'{esc(fpp)}'" if fpp else "NULL"

        cur.execute(f"""
            INSERT INTO {SCHEMA}.applications
                (full_name, phone, email, amount, days, birth_date, birth_place,
                 passport_series, passport_number, passport_date, passport_code, passport_by,
                 telegram_id, status,
                 file_passport, file_registration, file_selfie, file_previous_passports)
            VALUES (
                '{esc(full_name)}', '{esc(phone)}', {em_val}, {amount}, {days},
                {bd_val}, {bp_val}, {ps_val}, {pn_val}, {pd_val}, {pc_val}, {pb_val},
                {tg_val}, 'pending',
                {fp_val}, {fr_val}, {fs_val}, {fpp_val}
            ) RETURNING id
        """)
        app_id = cur.fetchone()[0]
        conn.commit()
        print(f"[send-application] saved app_id={app_id}")
    except Exception as ex:
        print(f"[send-application] DB error: {ex}")
        conn.rollback()
    finally:
        cur.close(); conn.close()

    if plain_password and email:
        email_html = f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F0A1E;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0A1E;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1030;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">PARAFINANS24</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Ваша заявка принята</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0 0 16px;">Здравствуйте, <b style="color:#fff;">{full_name or phone}</b>!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">
            Ваша заявка #{app_id} принята и находится на рассмотрении.<br>Мы свяжемся с вами в течение 15 минут.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.15);border-radius:12px;border:1px solid rgba(124,58,237,0.3);margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;">ТЕЛЕФОН</p>
              <p style="margin:0 0 16px;color:#fff;font-size:18px;font-weight:bold;">{phone}</p>
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;">ПАРОЛЬ</p>
              <p style="margin:0;color:#c084fc;font-size:22px;font-weight:bold;letter-spacing:2px;">{plain_password}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
        send_email(to=email, subject=f"Заявка #{app_id} принята — данные для входа", html=email_html)

    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    now = datetime.now().strftime("%d.%m.%Y в %H:%M")
    docs_count = len(file_urls)
    app_label = f" (#{app_id})" if app_id else ""
    text = (
        f"🚀 <b>Новая заявка — PARAFINANS24{app_label}</b>\n"
        f"⏱ {now}\n\n"
        f"👤 <b>ФИО:</b> {full_name}\n"
        f"🎂 <b>Дата рождения:</b> {birth_date or '—'}\n"
        f"📍 <b>Место рождения:</b> {birth_place or '—'}\n"
        f"📞 <b>Телефон:</b> {phone}\n"
        f"📧 <b>Email:</b> {email or '—'}\n"
        f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
        f"📅 <b>Срок:</b> {days} дн.\n\n"
        f"📋 <b>Паспортные данные:</b>\n"
        f"  Серия/Номер: {passport_series} {passport_number}\n"
        f"  Дата выдачи: {passport_date or '—'}\n"
        f"  Код: {passport_code or '—'}\n"
        f"  Кем выдан: {passport_by or '—'}\n\n"
        f"📎 <b>Документы загружены:</b> {docs_count} из {len(FILE_KEYS)}\n"
        f"💬 <b>Telegram:</b> {'@' + telegram_username if telegram_username else '—'}"
    )
    if file_urls:
        doc_lines = "\n".join(
            f'📄 <a href="{url}">{FILE_LABELS[key]}</a>'
            for key, url in file_urls.items()
        )
        text += f"\n\n🔗 <b>Документы:</b>\n{doc_lines}"

    send_telegram_message(tg_token, TELEGRAM_CHAT_ID, text)

    # Создаём сессию для автоматического входа клиента в ЛК
    session_token = None
    try:
        import secrets as _sec
        from datetime import timedelta
        conn2 = psycopg2.connect(os.environ["DATABASE_URL"])
        cur2 = conn2.cursor()
        cur2.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{esc(phone)}'")
        user_row = cur2.fetchone()
        if user_row:
            user_id = user_row[0]
            session_token = _sec.token_hex(32)
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()
            cur2.execute(
                f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) "
                f"VALUES ({user_id}, '{session_token}', '{expires_at}')"
            )
            conn2.commit()
        cur2.close(); conn2.close()
    except Exception as ex:
        print(f"[send-application] session error: {ex}")

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True, "appId": app_id, "token": session_token}, ensure_ascii=False),
    }
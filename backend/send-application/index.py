"""Отправка заявки на займ: сохранение в БД + файлы в S3 + уведомление в Telegram."""
import json
import base64
import os
import urllib.request
from datetime import datetime
import psycopg2
import boto3

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


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def upload_file(s3, key: str, data: bytes, content_type: str) -> str:
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=content_type)
    access_key = os.environ["AWS_ACCESS_KEY_ID"]
    return f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"


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
    """Приём заявки и загрузка фото по отдельности."""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    method = event.get("httpMethod", "POST")
    raw_body = event.get("body") or "{}"
    body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body

    # ── PUT: загрузка одного фото для существующей заявки ──────────────────
    if method == "PUT":
        app_id = body.get("appId")
        file_key = body.get("fileKey")  # passportMain / registration / selfie / previousPassports
        b64 = body.get("file", "")
        filename = body.get("fileName", f"{file_key}.webp")

        if not app_id or not file_key or not b64:
            return {"statusCode": 400, "headers": cors_headers,
                    "body": json.dumps({"error": "Не указан appId, fileKey или file"})}

        if file_key not in FILE_KEYS:
            return {"statusCode": 400, "headers": cors_headers,
                    "body": json.dumps({"error": "Неизвестный тип файла"})}

        try:
            file_data = base64.b64decode(b64)
        except Exception:
            return {"statusCode": 400, "headers": cors_headers,
                    "body": json.dumps({"error": "Ошибка декодирования файла"})}

        s3 = s3_client()
        now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webp"
        s3_key = f"applications/{now_ts}_{app_id}_{FILE_KEYS[file_key]}.{ext}"
        ct = "image/webp" if ext == "webp" else "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

        try:
            url = upload_file(s3, s3_key, file_data, ct)
            print(f"[send-application] uploaded {file_key} for app#{app_id} -> {url}")
        except Exception as ex:
            print(f"[send-application] s3 error: {ex}")
            return {"statusCode": 500, "headers": cors_headers,
                    "body": json.dumps({"error": "Ошибка загрузки файла"})}

        db_col = DB_FILE_COLS[file_key]
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        try:
            cur.execute(f"UPDATE {SCHEMA}.applications SET {db_col} = '{esc(url)}' WHERE id = {int(app_id)}")
            conn.commit()
        finally:
            cur.close(); conn.close()

        # Если все 4 фото загружены — шлём Telegram-уведомление
        conn2 = psycopg2.connect(os.environ["DATABASE_URL"])
        cur2 = conn2.cursor()
        try:
            cur2.execute(
                f"SELECT full_name, phone, email, amount, days, "
                f"passport_series, passport_number, passport_date, passport_code, passport_by, "
                f"birth_date, birth_place, telegram_id, "
                f"file_passport, file_registration, file_selfie, file_previous_passports "
                f"FROM {SCHEMA}.applications WHERE id = {int(app_id)}"
            )
            row = cur2.fetchone()
        finally:
            cur2.close(); conn2.close()

        if row:
            (full_name, phone, email, amount, days,
             ps, pn, pd, pc, pb,
             birth_date, birth_place, tg_username,
             fp, fr, fs, fpp) = row

            file_urls = {k: v for k, v in
                         [("passportMain", fp), ("registration", fr),
                          ("selfie", fs), ("previousPassports", fpp)] if v}

            if len(file_urls) == 4:
                tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
                now_fmt = datetime.now().strftime("%d.%m.%Y в %H:%M")
                text = (
                    f"🚀 <b>Новая заявка — PARAFINANS24 (#{app_id})</b>\n"
                    f"⏱ {now_fmt}\n\n"
                    f"👤 <b>ФИО:</b> {full_name}\n"
                    f"🎂 <b>Дата рождения:</b> {birth_date or '—'}\n"
                    f"📍 <b>Место рождения:</b> {birth_place or '—'}\n"
                    f"📞 <b>Телефон:</b> {phone}\n"
                    f"📧 <b>Email:</b> {email or '—'}\n"
                    f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
                    f"📅 <b>Срок:</b> {days} дн.\n\n"
                    f"📋 <b>Паспорт:</b> {ps or ''} {pn or ''} | {pd or '—'} | {pc or '—'}\n"
                    f"   Кем выдан: {pb or '—'}\n\n"
                    f"💬 <b>Telegram:</b> {'@' + tg_username if tg_username else '—'}\n\n"
                    f"🔗 <b>Документы:</b>\n" +
                    "\n".join(f'📄 <a href="{url}">{FILE_LABELS[k]}</a>' for k, url in file_urls.items())
                )
                send_telegram_message(tg_token, TELEGRAM_CHAT_ID, text)

        return {"statusCode": 200, "headers": cors_headers,
                "body": json.dumps({"success": True, "url": url}, ensure_ascii=False)}

    # ── POST: создание заявки без фото ─────────────────────────────────────
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

        bd_val  = f"'{esc(birth_date)}'" if birth_date else "NULL"
        bp_val  = f"'{esc(birth_place)}'" if birth_place else "NULL"
        ps_val  = f"'{esc(passport_series)}'" if passport_series else "NULL"
        pn_val  = f"'{esc(passport_number)}'" if passport_number else "NULL"
        pd_val  = f"'{esc(passport_date)}'" if passport_date else "NULL"
        pc_val  = f"'{esc(passport_code)}'" if passport_code else "NULL"
        pb_val  = f"'{esc(passport_by)}'" if passport_by else "NULL"
        tg_val  = f"'{esc(telegram_username)}'" if telegram_username else "NULL"
        em_val  = f"'{esc(email)}'" if email else "NULL"

        cur.execute(f"""
            INSERT INTO {SCHEMA}.applications
                (full_name, phone, email, amount, days, birth_date, birth_place,
                 passport_series, passport_number, passport_date, passport_code, passport_by,
                 telegram_id, status)
            VALUES (
                '{esc(full_name)}', '{esc(phone)}', {em_val}, {amount}, {days},
                {bd_val}, {bp_val}, {ps_val}, {pn_val}, {pd_val}, {pc_val}, {pb_val},
                {tg_val}, 'pending'
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
        send_email(
            to=email,
            subject=f"Заявка #{app_id} принята — данные для входа",
            html=email_html,
        )

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True, "appId": app_id}, ensure_ascii=False),
    }

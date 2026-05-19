"""Отправка заявки на займ с документами: менеджеру и клиенту."""
import json
import smtplib
import base64
import mimetypes
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from datetime import datetime

SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "aleks020990@ya.ru"
MANAGER_EMAIL = "aleks020990@ya.ru"

FILE_LABELS = {
    "passportMain": "Паспорт — главная страница",
    "registration": "Прописка",
    "selfie": "Селфи с паспортом",
    "previousPassports": "О ранее выданных паспортах",
}


def send_manager_email(server, from_addr, to_addr, subject, html, attachments):
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.attach(MIMEText(html, "html", "utf-8"))
    for label, filename, data in attachments:
        mime_type, _ = mimetypes.guess_type(filename)
        maintype, subtype = (mime_type or "application/octet-stream").split("/", 1)
        part = MIMEBase(maintype, subtype)
        part.set_payload(data)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)
    server.sendmail(from_addr, to_addr, msg.as_string())


def send_client_email(server, from_addr, to_addr, subject, html):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.attach(MIMEText(html, "html", "utf-8"))
    server.sendmail(from_addr, to_addr, msg.as_string())


def handler(event: dict, context) -> dict:
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    raw_body = event.get("body") or "{}"
    body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body

    full_name = body.get("fullName", body.get("name", "")).strip()
    phone = body.get("phone", "").strip()
    email = body.get("email", "").strip()
    amount = body.get("amount", "").strip()
    birth_date = body.get("birthDate", "").strip()
    passport_series = body.get("passportSeries", "").strip()
    passport_number = body.get("passportNumber", "").strip()
    passport_date = body.get("passportDate", "").strip()
    passport_code = body.get("passportCode", "").strip()
    passport_by = body.get("passportBy", "").strip()
    birth_place = body.get("birthPlace", "").strip()

    if not full_name or not phone or not email or not amount:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Заполните все поля"}, ensure_ascii=False),
        }

    attachments = []
    for key, label in FILE_LABELS.items():
        b64 = body.get(key, "")
        filename = body.get(f"{key}_name", f"{key}.jpg")
        if b64:
            try:
                file_data = base64.b64decode(b64)
                attachments.append((label, filename, file_data))
            except Exception:
                pass

    now = datetime.now().strftime("%d.%m.%Y в %H:%M")
    password = os.environ.get("SMTP_PASSWORD", "")

    docs_status = f"{len(attachments)} из {len(FILE_LABELS)}" if attachments else "не приложены"
    docs_rows = "".join(
        f'<tr style="background:{"#f9f9f9" if i % 2 == 0 else "white"}"><td style="padding:8px 10px;color:#666;">{label}</td><td style="padding:8px 10px;color:#22c55e;font-weight:bold;">✓ прикреплён</td></tr>'
        for i, (label, _, _) in enumerate(attachments)
    )

    manager_html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color:#7C3AED;margin-top:0;">🚀 Новая заявка — PARAFINANS24</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px 0;color:#666;width:45%;">ФИО</td><td style="padding:10px 0;font-weight:bold;color:#111;">{full_name}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:10px;color:#666;">Дата рождения</td><td style="padding:10px;font-weight:bold;color:#111;">{birth_date}</td></tr>
          <tr><td style="padding:10px 0;color:#666;">Телефон</td><td style="padding:10px 0;font-weight:bold;color:#111;">{phone}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:10px;color:#666;">Email</td><td style="padding:10px;font-weight:bold;color:#111;">{email}</td></tr>
          <tr><td style="padding:10px 0;color:#666;">Сумма</td><td style="padding:10px 0;font-weight:bold;color:#7C3AED;font-size:18px;">{amount} ₽</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:10px;color:#666;">Место рождения</td><td style="padding:10px;font-weight:bold;color:#111;">{birth_place}</td></tr>
        </table>
        <h3 style="color:#7C3AED;margin:24px 0 10px;">Паспортные данные</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#666;width:45%;">Серия / Номер</td><td style="padding:8px 0;font-weight:bold;color:#111;">{passport_series} {passport_number}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 10px;color:#666;">Дата выдачи</td><td style="padding:8px 10px;font-weight:bold;color:#111;">{passport_date}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Код подразделения</td><td style="padding:8px 0;font-weight:bold;color:#111;">{passport_code}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 10px;color:#666;">Кем выдан</td><td style="padding:8px 10px;font-weight:bold;color:#111;">{passport_by}</td></tr>
        </table>
        <h3 style="color:#7C3AED;margin:24px 0 10px;">Документы ({docs_status})</h3>
        <table style="width:100%;border-collapse:collapse;">{docs_rows}</table>
        <div style="margin-top:20px;padding:15px;background:#f0ebff;border-radius:8px;color:#7C3AED;font-size:13px;">
          ⏱ Свяжитесь с клиентом в течение 15 минут · {now}
        </div>
      </div>
    </body></html>
    """

    client_html = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
      <div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:64px;height:64px;background:linear-gradient(135deg,#7C3AED,#A855F7);border-radius:16px;margin:0 auto 16px;line-height:64px;font-size:32px;text-align:center;">✅</div>
          <h2 style="color:#7C3AED;margin:0;">Заявка принята!</h2>
        </div>
        <p style="color:#444;font-size:15px;">Здравствуйте, <strong>{full_name}</strong>!</p>
        <p style="color:#444;font-size:15px;">Мы получили вашу заявку. Специалист свяжется с вами <strong>в течение 15 минут</strong> по номеру <strong>{phone}</strong>.</p>
        <div style="background:#f0ebff;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#666;font-size:13px;">Запрошенная сумма</p>
          <p style="margin:6px 0 0;color:#7C3AED;font-size:24px;font-weight:bold;">{amount} ₽</p>
        </div>
        <p style="color:#888;font-size:13px;">Вопросы — звоните: <strong>+7 (495) 663-51-24</strong></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="color:#bbb;font-size:11px;text-align:center;">PARAFINANS24 · Лицензия ЦБ РФ · {now}</p>
      </div>
    </body></html>
    """

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, password)
        send_manager_email(server, SMTP_USER, MANAGER_EMAIL, f"Новая заявка — {full_name}", manager_html, attachments)
        send_client_email(server, SMTP_USER, email, "Ваша заявка принята — PARAFINANS24", client_html)

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True}),
    }

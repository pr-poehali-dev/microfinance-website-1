"""Отправка заявки на займ на email менеджера."""
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "aleks020990@ya.ru"
TO_EMAIL = "aleks020990@ya.ru"


def handler(event: dict, context) -> dict:
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = json.loads(event.get("body") or "{}")
    name = body.get("name", "").strip()
    phone = body.get("phone", "").strip()
    amount = body.get("amount", "").strip()

    if not name or not phone or not amount:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Заполните все поля"}, ensure_ascii=False),
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Новая заявка на займ от {name}"
    msg["From"] = SMTP_USER
    msg["To"] = TO_EMAIL

    html = f"""
    <html><body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #7C3AED; margin-top: 0;">🚀 Новая заявка на займ</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; width: 40%;">Имя</td>
            <td style="padding: 10px 0; font-weight: bold; color: #111;">{name}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; color: #666;">Телефон</td>
            <td style="padding: 10px; font-weight: bold; color: #111;">{phone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666;">Сумма</td>
            <td style="padding: 10px 0; font-weight: bold; color: #7C3AED; font-size: 18px;">{amount} ₽</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f0ebff; border-radius: 8px; color: #7C3AED; font-size: 13px;">
          Свяжитесь с клиентом в течение 15 минут
        </div>
      </div>
    </body></html>
    """

    msg.attach(MIMEText(html, "html"))

    password = os.environ.get("SMTP_PASSWORD", "")
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, password)
        server.sendmail(SMTP_USER, TO_EMAIL, msg.as_string())

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True}),
    }
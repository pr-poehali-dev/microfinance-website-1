"""Отправка заявки на займ: менеджеру и клиенту. v3"""
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime

SMTP_HOST = "smtp.yandex.ru"
SMTP_PORT = 465
SMTP_USER = "aleks020990@ya.ru"
MANAGER_EMAIL = "aleks020990@ya.ru"


def send_email(server, from_addr, to_addr, subject, html):
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

    name = body.get("name", "").strip()
    phone = body.get("phone", "").strip()
    email = body.get("email", "").strip()
    amount = body.get("amount", "").strip()

    if not name or not phone or not email or not amount:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Заполните все поля"}, ensure_ascii=False),
        }

    now = datetime.now().strftime("%d.%m.%Y в %H:%M")
    password = os.environ.get("SMTP_PASSWORD", "")

    manager_html = f"""
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
            <td style="padding: 10px 0; color: #666;">Email</td>
            <td style="padding: 10px 0; font-weight: bold; color: #111;">{email}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; color: #666;">Сумма</td>
            <td style="padding: 10px; font-weight: bold; color: #7C3AED; font-size: 18px;">{amount} ₽</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666;">Время</td>
            <td style="padding: 10px 0; color: #555;">{now}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f0ebff; border-radius: 8px; color: #7C3AED; font-size: 13px;">
          ⏱ Свяжитесь с клиентом в течение 15 минут
        </div>
      </div>
    </body></html>
    """

    client_html = f"""
    <html><body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #7C3AED, #A855F7); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; line-height: 64px;">✅</div>
          <h2 style="color: #7C3AED; margin: 0;">Заявка принята!</h2>
        </div>
        <p style="color: #444; font-size: 15px;">Здравствуйте, <strong>{name}</strong>!</p>
        <p style="color: #444; font-size: 15px;">Мы получили вашу заявку на займ. Наш специалист свяжется с вами <strong>в течение 15 минут</strong> по номеру <strong>{phone}</strong>.</p>
        <div style="background: #f0ebff; border-radius: 10px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 13px;">Запрошенная сумма</p>
          <p style="margin: 6px 0 0; color: #7C3AED; font-size: 24px; font-weight: bold;">{amount} ₽</p>
        </div>
        <p style="color: #888; font-size: 13px;">Если у вас есть вопросы — звоните: <strong>+7 (495) 663-51-24</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #bbb; font-size: 11px; text-align: center;">БыстроЗайм · Лицензия ЦБ РФ · {now}</p>
      </div>
    </body></html>
    """

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, password)
        send_email(server, SMTP_USER, MANAGER_EMAIL, f"Новая заявка на займ от {name}", manager_html)
        send_email(server, SMTP_USER, email, "Ваша заявка на займ принята — БыстроЗайм", client_html)

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True}),
    }
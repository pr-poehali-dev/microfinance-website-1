"""Отправка заявки на карту PARAFINANS менеджеру через Telegram."""
import json
import os
import urllib.request
from datetime import datetime

TELEGRAM_CHAT_ID = "8540431915"


def send_telegram_message(token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req)


def handler(event: dict, context) -> dict:
    """Отправка заявки на карту PARAFINANS в Telegram."""
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    raw_body = event.get("body") or "{}"
    body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body

    full_name = body.get("fullName", "").strip()
    phone = body.get("phone", "").strip()
    email = body.get("email", "").strip()
    limit = body.get("limit", "").strip()

    if not full_name or not phone:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": {"error": "Заполните все поля"},
        }

    now = datetime.now().strftime("%d.%m.%Y в %H:%M")
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")

    limit_fmt = f"{int(limit):,}".replace(",", " ") + " ₽" if limit else "не указан"

    text = (
        f"💳 <b>Заявка на карту PARAFINANS</b>\n"
        f"⏱ {now}\n\n"
        f"👤 <b>ФИО:</b> {full_name}\n"
        f"📞 <b>Телефон:</b> {phone}\n"
        f"📧 <b>Email:</b> {email}\n"
        f"💰 <b>Желаемый лимит:</b> {limit_fmt}"
    )

    send_telegram_message(token, TELEGRAM_CHAT_ID, text)

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True}),
    }
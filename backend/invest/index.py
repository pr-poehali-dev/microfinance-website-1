"""Приём заявок на инвестирование и их список для администратора."""
import json
import os
import re
import urllib.request
from datetime import timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def resp(code: int, data: dict) -> dict:
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}


def esc(v: str) -> str:
    return str(v).replace("'", "''")


def tg(text: str):
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not tg_token:
        return
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{tg_token}/sendMessage",
        data=data, headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Приём заявок инвесторов (POST) и список для админки (GET, ?sub=list; POST ?sub=status)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {**CORS, "Access-Control-Max-Age": "86400"}, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    if sub in ("list", "status", "count"):
        hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
        tok = (hdrs.get("x-authorization") or hdrs.get("authorization") or "").replace("Bearer ", "").replace("bearer ", "").strip()
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{esc(tok)}' AND expires_at > NOW()")
        if not cur.fetchone():
            cur.close(); conn.close()
            return resp(401, {"error": "Не авторизован"})

        if sub == "count":
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.investment_requests WHERE status = 'new'")
            n = cur.fetchone()[0]
            cur.close(); conn.close()
            return resp(200, {"new": n})

        if sub == "status" and method == "POST":
            rid = int(body.get("id", 0) or 0)
            st = body.get("status", "")
            if st not in ("new", "processed"):
                cur.close(); conn.close()
                return resp(400, {"error": "Неверный статус"})
            cur.execute(f"UPDATE {SCHEMA}.investment_requests SET status = '{st}' WHERE id = {rid}")
            conn.commit(); cur.close(); conn.close()
            return resp(200, {"ok": True})

        cur.execute(
            f"SELECT id, full_name, birth_date, phone, email, status, created_at, amount "
            f"FROM {SCHEMA}.investment_requests ORDER BY (status = 'processed'), created_at DESC LIMIT 500"
        )
        items = [{
            "id": r[0], "fullName": r[1], "birthDate": r[2], "phone": r[3], "email": r[4], "status": r[5],
            "createdAt": (r[6] + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M"),
            "amount": int(r[7]) if r[7] else None,
        } for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {"items": items})

    if method != "POST":
        return resp(405, {"error": "Метод не поддерживается"})

    full_name = " ".join(str(body.get("fullName", "")).split())[:255]
    birth_date = str(body.get("birthDate", "")).strip()[:32]
    phone = str(body.get("phone", "")).strip()[:32]
    email = str(body.get("email", "")).strip()[:255]
    try:
        amount = int(float(str(body.get("amount", "")).replace(" ", "").replace(",", ".")))
    except ValueError:
        amount = 0

    if len(full_name.split()) < 2:
        return resp(400, {"error": "Укажите фамилию, имя и отчество"})
    if amount < 300000 or amount > 15000000:
        return resp(400, {"error": "Сумма должна быть от 300 000 до 15 000 000 ₽"})
    if not birth_date:
        return resp(400, {"error": "Укажите дату рождения"})
    if len(re.sub(r"\D", "", phone)) < 10:
        return resp(400, {"error": "Укажите номер телефона"})
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return resp(400, {"error": "Укажите корректную почту"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.investment_requests (full_name, birth_date, phone, email, amount) "
        f"VALUES ('{esc(full_name)}', '{esc(birth_date)}', '{esc(phone)}', '{esc(email)}', {amount}) RETURNING id"
    )
    rid = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close()

    tg(f"💼 <b>Заявка на инвестирование #{rid}</b>\n{full_name}\nДата рождения: {birth_date}\nТел.: {phone}\nПочта: {email}\nСумма: {amount:,} ₽".replace(",", " "))
    return resp(200, {"ok": True, "id": rid})

"""Колесо фортуны: выбор приза на сервере, один прокрут на посетителя."""
import json
import os
import random
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Visitor-Id",
}

PRIZES = [
    ("rub100", "Скидка 100 ₽"),
    ("rub200", "Скидка 200 ₽"),
    ("rub300", "Скидка 300 ₽"),
    ("rub400", "Скидка 400 ₽"),
    ("rub500", "Скидка 500 ₽"),
    ("pct5", "Скидка 5%"),
    ("pct10", "Скидка 10%"),
    ("pct20", "Скидка 20%"),
    ("pct30", "Скидка 30%"),
    ("pct40", "Скидка 40%"),
    ("pct50", "Скидка 50%"),
    ("approve100", "100% одобрение займа"),
    ("zero1", "1-й займ под 0%"),
    ("zero2", "2-й займ под 0%"),
]


def resp(code, data):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(data, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Возвращает приз посетителя: GET — уже выпавший, POST — крутить колесо (один раз)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
    vid = str(qs.get("visitorId") or body.get("visitorId") or "").strip()
    vid = "".join(ch for ch in vid if ch.isalnum() or ch in "-_")[:64]
    if len(vid) < 8:
        return resp(400, {"error": "Нет идентификатора посетителя"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(f"SELECT prize_key, prize_label FROM {SCHEMA}.wheel_spins WHERE visitor_id = '{vid}'")
    row = cur.fetchone()

    if event.get("httpMethod") == "GET":
        cur.close(); conn.close()
        if row:
            return resp(200, {"spun": True, "prizeKey": row[0], "prizeLabel": row[1]})
        return resp(200, {"spun": False})

    if row:
        cur.close(); conn.close()
        return resp(200, {"spun": True, "already": True, "prizeKey": row[0], "prizeLabel": row[1]})

    key, label = random.choice(PRIZES)
    cur.execute(
        f"INSERT INTO {SCHEMA}.wheel_spins (visitor_id, prize_key, prize_label) "
        f"VALUES ('{vid}', '{key}', '{label}') ON CONFLICT (visitor_id) DO NOTHING"
    )
    conn.commit()
    cur.close(); conn.close()
    return resp(200, {"spun": True, "already": False, "prizeKey": key, "prizeLabel": label})

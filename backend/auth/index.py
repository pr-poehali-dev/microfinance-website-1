"""Авторизация: регистрация и вход по номеру телефона + пароль."""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2


SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    """Регистрация и вход пользователя по телефону и паролю."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    action = body.get("action", "")
    phone = (body.get("phone") or "").strip()
    password = (body.get("password") or "").strip()

    if not phone or not password:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите телефон и пароль"})}

    conn = get_conn()
    cur = conn.cursor()

    if action == "register":
        full_name = (body.get("fullName") or "").strip()
        email = (body.get("email") or "").strip()
        pw_hash = hash_password(password)

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Повторная регистрация невозможна. Войдите в личный кабинет."})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) VALUES (%s, %s, %s, %s) RETURNING id",
            (phone, pw_hash, full_name, email)
        )
        user_id = cur.fetchone()[0]

    elif action == "login":
        pw_hash = hash_password(password)
        cur.execute(f"SELECT id, full_name FROM {SCHEMA}.users WHERE phone = %s AND password_hash = %s", (phone, pw_hash))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный номер телефона или пароль"})}
        user_id = row[0]
    else:
        cur.close(); conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    token = secrets.token_hex(32)
    expires_at = datetime.now() + timedelta(days=30)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (user_id, token, expires_at)
    )

    cur.execute(f"SELECT id, phone, full_name, email FROM {SCHEMA}.users WHERE id = %s", (user_id,))
    u = cur.fetchone()
    conn.commit(); cur.close(); conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "token": token,
            "user": {"id": u[0], "phone": u[1], "fullName": u[2] or "", "email": u[3] or ""}
        }, ensure_ascii=False)
    }
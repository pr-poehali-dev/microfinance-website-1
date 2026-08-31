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
    phone = (body.get("phone") or "").strip().replace("'", "''")
    password = (body.get("password") or "").strip()

    if not phone:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите номер телефона"})}

    conn = get_conn()
    cur = conn.cursor()

    # --- ВХОД ПО НОМЕРУ ТЕЛЕФОНА (для клиентов с одобренной заявкой) ---
    if action == "phone_login":
        cur.execute(f"SELECT id, blocked_until FROM {SCHEMA}.users WHERE phone = '{phone}'")
        user_row = cur.fetchone()
        if not user_row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Аккаунт не найден. Сначала подайте заявку на займ."})}

        if user_row[1] and user_row[1] > datetime.now():
            cur.close(); conn.close()
            until_str = user_row[1].strftime("%d.%m.%Y %H:%M")
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": f"Доступ временно заблокирован до {until_str}"})}

        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{phone}' AND status IN ('approved', 'partner_card') LIMIT 1")
        if not cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вход по номеру телефона доступен только клиентам с одобренной заявкой."})}

        user_id = user_row[0]
        token = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) "
            f"VALUES ({user_id}, '{token}', '{expires_at}')"
        )
        cur.execute(f"SELECT id, phone, full_name, email FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": token, "user": {"id": u[0], "phone": u[1], "fullName": u[2] or "", "email": u[3] or ""}}, ensure_ascii=False)}

    if not password:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите пароль"})}

    if action == "register":
        full_name = (body.get("fullName") or "").strip().replace("'", "''")
        email = (body.get("email") or "").strip().replace("'", "''")
        pw_hash = hash_password(password)

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone}'")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Повторная регистрация невозможна. Войдите в личный кабинет."})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
            f"VALUES ('{phone}', '{pw_hash}', '{full_name}', '{email}') RETURNING id"
        )
        user_id = cur.fetchone()[0]

    elif action == "login":
        pw_hash = hash_password(password)
        cur.execute(f"SELECT id, full_name, blocked_until FROM {SCHEMA}.users WHERE phone = '{phone}' AND password_hash = '{pw_hash}'")
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный номер телефона или пароль"})}
        if row[2] and row[2] > datetime.now():
            cur.close(); conn.close()
            until_str = row[2].strftime("%d.%m.%Y %H:%M")
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": f"Доступ временно заблокирован до {until_str}"})}
        user_id = row[0]
    else:
        cur.close(); conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    token = secrets.token_hex(32)
    expires_at = datetime.now() + timedelta(days=30)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) "
        f"VALUES ({user_id}, '{token}', '{expires_at}')"
    )

    cur.execute(f"SELECT id, phone, full_name, email FROM {SCHEMA}.users WHERE id = {user_id}")
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
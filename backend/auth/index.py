"""Авторизация: регистрация и вход по номеру телефона + пароль."""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2



from datetime import timedelta as _msk_td


def msk(dt):
    """Переводит время из UTC (как хранится в БД) в московское (UTC+3) для показа."""
    return dt + _msk_td(hours=3) if dt else dt

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

MAX_FAILS = 5
LOCK_MINUTES = 15


def lock_left(cur, key):
    """Сколько минут осталось до конца блокировки (0 — не заблокирован)."""
    k = key.replace("'", "''")
    cur.execute(f"SELECT CEIL(EXTRACT(EPOCH FROM (locked_until - NOW())) / 60) FROM {SCHEMA}.login_attempts WHERE key = '{k}' AND locked_until > NOW()")
    r = cur.fetchone()
    return int(r[0]) if r else 0


def register_fail(cur, key):
    k = key.replace("'", "''")
    cur.execute(
        f"INSERT INTO {SCHEMA}.login_attempts (key, fails, updated_at) VALUES ('{k}', 1, NOW()) "
        f"ON CONFLICT (key) DO UPDATE SET fails = CASE WHEN {SCHEMA}.login_attempts.updated_at < NOW() - INTERVAL '{LOCK_MINUTES} minutes' THEN 1 ELSE {SCHEMA}.login_attempts.fails + 1 END, updated_at = NOW()"
    )
    cur.execute(
        f"UPDATE {SCHEMA}.login_attempts SET locked_until = NOW() + INTERVAL '{LOCK_MINUTES} minutes', fails = 0 "
        f"WHERE key = '{k}' AND fails >= {MAX_FAILS}"
    )


def clear_fails(cur, key):
    k = key.replace("'", "''")
    cur.execute(f"DELETE FROM {SCHEMA}.login_attempts WHERE key = '{k}'")


def client_ip(event):
    return str(((event.get("requestContext") or {}).get("identity") or {}).get("sourceIp") or "unknown")


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
        cur.close(); conn.close()
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вход только по номеру телефона отключён. Войдите по телефону и паролю"})}
    if action == "phone_login_disabled":
        cur.execute(f"SELECT id, blocked_until FROM {SCHEMA}.users WHERE phone = '{phone}'")
        user_row = cur.fetchone()
        if not user_row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Аккаунт не найден. Сначала подайте заявку на займ."})}

        if user_row[1] and user_row[1] > datetime.now():
            cur.close(); conn.close()
            until_str = msk(user_row[1]).strftime("%d.%m.%Y %H:%M")
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
            f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email, plain_password, own_password) "
            f"VALUES ('{phone}', '{pw_hash}', '{full_name}', '{email}', '{password.replace(chr(39), chr(39)*2)}', TRUE) RETURNING id"
        )
        user_id = cur.fetchone()[0]

    elif action == "login":
        lkey = f"user:{phone}:{client_ip(event)}"
        left = lock_left(cur, lkey)
        if left:
            cur.close(); conn.close()
            return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": f"Слишком много неверных попыток. Попробуйте через {left} мин."}, ensure_ascii=False)}
        pw_hash = hash_password(password)
        cur.execute(f"SELECT id, full_name, blocked_until FROM {SCHEMA}.users WHERE phone = '{phone}' AND password_hash = '{pw_hash}'")
        row = cur.fetchone()
        if not row:
            register_fail(cur, lkey)
            conn.commit()
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный номер телефона или пароль"})}
        clear_fails(cur, lkey)
        if row[2] and row[2] > datetime.now():
            cur.close(); conn.close()
            until_str = msk(row[2]).strftime("%d.%m.%Y %H:%M")
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
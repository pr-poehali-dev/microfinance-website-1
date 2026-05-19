"""Получение займов пользователя по токену сессии."""
import json
import os
from datetime import datetime
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_user_by_token(cur, token: str):
    cur.execute(
        f"SELECT u.id, u.phone, u.full_name, u.email FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """Получение займов и данных текущего пользователя по токену."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = (event.get("headers") or {}).get("X-Authorization", "").replace("Bearer ", "").strip()
    if not token:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    conn = get_conn()
    cur = conn.cursor()

    user = get_user_by_token(cur, token)
    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла, войдите снова"})}

    user_id, phone, full_name, email = user

    cur.execute(
        f"SELECT id, amount, days, rate, status, created_at FROM {SCHEMA}.loans WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,)
    )
    rows = cur.fetchall()
    cur.close(); conn.close()

    loans = []
    for row in rows:
        loan_id, amount, days, rate, status, created_at = row
        interest = round(float(amount) * float(rate) * days)
        loans.append({
            "id": loan_id,
            "amount": float(amount),
            "days": days,
            "rate": float(rate),
            "ratePercent": round(float(rate) * 100, 1),
            "interest": interest,
            "total": float(amount) + interest,
            "status": status,
            "createdAt": created_at.strftime("%d.%m.%Y"),
        })

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "user": {"id": user_id, "phone": phone, "fullName": full_name or "", "email": email or ""},
            "loans": loans
        }, ensure_ascii=False)
    }

"""Получение займов пользователя по токену сессии."""
import json
import os
from datetime import datetime
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
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
    """Получение займов пользователя и подписание оффера."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw_token = hdrs.get("x-authorization") or hdrs.get("authorization") or ""
    token = raw_token.replace("Bearer ", "").replace("bearer ", "").strip()
    if not token:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    conn = get_conn()
    cur = conn.cursor()

    user = get_user_by_token(cur, token)
    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла, войдите снова"})}

    user_id, phone, full_name, email = user

    # --- СОХРАНИТЬ НОМЕР КАРТЫ/СБП (PATCH) ---
    if event.get("httpMethod") == "PATCH":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        card_number = (b.get("cardNumber") or "").strip()
        if not card_number:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер карты или телефон СБП"})}
        ph_e = phone.replace("'", "''")
        card_e = card_number.replace("'", "''")
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET card_number='{card_e}' "
            f"WHERE id = (SELECT id FROM {SCHEMA}.applications WHERE phone='{ph_e}' AND status='approved' ORDER BY created_at DESC LIMIT 1)"
        )
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПОДПИСАТЬ ОФФЕР (PUT, loanId=...) ---
    if event.get("httpMethod") == "PUT":
        qs = event.get("queryStringParameters") or {}
        loan_id = int(qs.get("loanId", 0))
        if not loan_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан loanId"})}

        cur.execute(
            f"SELECT id FROM {SCHEMA}.loans WHERE id = {loan_id} AND user_id = {user_id} AND signed = FALSE AND status = 'review'"
        )
        if not cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Оффер не найден или уже подписан"})}

        cur.execute(
            f"UPDATE {SCHEMA}.loans SET signed = TRUE, signed_at = NOW(), status = 'active' WHERE id = {loan_id}"
        )
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.execute(
        f"SELECT id, amount, days, rate, status, created_at, signed, offer_amount, offer_days, offer_rate FROM {SCHEMA}.loans WHERE user_id = {user_id} ORDER BY created_at DESC"
    )
    rows = cur.fetchall()

    # Получаем последнюю заявку пользователя
    cur.execute(
        f"SELECT id, amount, days, status, created_at, approved_amount, approved_rate, approved_days, reject_reason, card_number "
        f"FROM {SCHEMA}.applications "
        f"WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1"
    )
    app_row = cur.fetchone()
    application = None
    if app_row:
        app_amount = float(app_row[1]) if app_row[1] else 0
        app_days = app_row[2] or 0
        approved_amount = float(app_row[5]) if app_row[5] else None
        approved_rate = float(app_row[6]) if app_row[6] else 0.008
        approved_days = int(app_row[7]) if app_row[7] else app_days
        # Рассчитываем сумму к возврату
        eff_amount = approved_amount if approved_amount else app_amount
        approved_interest = round(eff_amount * approved_rate * approved_days)
        approved_total = eff_amount + approved_interest
        application = {
            "id": app_row[0],
            "amount": app_amount,
            "days": app_days,
            "status": app_row[3],
            "createdAt": app_row[4].strftime("%d.%m.%Y"),
            "approvedAmount": approved_amount,
            "approvedRate": approved_rate,
            "approvedRatePercent": round(approved_rate * 100, 1),
            "approvedDays": approved_days,
            "approvedTotal": approved_total,
            "rejectReason": app_row[8] or "",
            "cardNumber": app_row[9] or "",
        }

    cur.close(); conn.close()

    loans = []
    for row in rows:
        loan_id, amount, days, rate, status, created_at, signed, offer_amount, offer_days, offer_rate = row
        interest = round(float(amount) * float(rate) * days)
        loan_data = {
            "id": loan_id,
            "amount": float(amount),
            "days": days,
            "rate": float(rate),
            "ratePercent": round(float(rate) * 100, 1),
            "interest": interest,
            "total": float(amount) + interest,
            "status": status,
            "createdAt": created_at.strftime("%d.%m.%Y"),
            "signed": signed,
        }
        if status == "review" and not signed and offer_amount:
            oa = float(offer_amount)
            od = offer_days or days
            or_ = float(offer_rate) if offer_rate else float(rate)
            oi = round(oa * or_ * od)
            loan_data["offer"] = {
                "amount": oa,
                "days": od,
                "rate": or_,
                "ratePercent": round(or_ * 100, 1),
                "total": oa + oi,
            }
        loans.append(loan_data)

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "user": {"id": user_id, "phone": phone, "fullName": full_name or "", "email": email or ""},
            "loans": loans,
            "application": application,
        }, ensure_ascii=False)
    }
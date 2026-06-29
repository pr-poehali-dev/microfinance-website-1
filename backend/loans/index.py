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
    t = token.replace("'", "''")
    cur.execute(
        f"SELECT u.id, u.phone, u.full_name, u.email FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = '{t}' AND s.expires_at > NOW()"
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
        confirm = b.get("confirm", False)
        if not card_number:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер карты или телефон СБП"})}
        ph_e = phone.replace("'", "''")
        card_e = card_number.replace("'", "''")
        # Сохраняем карту для approved и partner_card
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET card_number='{card_e}' "
            f"WHERE id = (SELECT id FROM {SCHEMA}.applications WHERE phone='{ph_e}' AND status IN ('approved','partner_card') ORDER BY created_at DESC LIMIT 1)"
        )
        conn.commit()
        # Если клиент нажал "Подтвердить займ" — отправляем уведомление администратору
        confirm_card = b.get("confirm_card", False)

        if confirm_card:
            # Клиент подтвердил виртуальную карту PARAFINANS — активируем
            cur.execute(
                f"UPDATE {SCHEMA}.applications SET virtual_card_status='active' "
                f"WHERE phone='{ph_e}' AND virtual_card_status='pending' AND virtual_card_number IS NOT NULL"
            )
            conn.commit()
            import urllib.request
            tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
            chat_id = "8540431915"
            cur.execute(
                f"SELECT id, full_name, virtual_card_limit, virtual_card_rate FROM {SCHEMA}.applications "
                f"WHERE phone='{ph_e}' AND virtual_card_number IS NOT NULL ORDER BY created_at DESC LIMIT 1"
            )
            vc_row = cur.fetchone()
            if tg_token and vc_row:
                vc_id, vc_name, vc_limit, vc_rate = vc_row
                text = (
                    f"✅ <b>Клиент активировал карту PARAFINANS</b>\n\n"
                    f"👤 <b>ФИО:</b> {vc_name or phone}\n"
                    f"📞 <b>Телефон:</b> {phone}\n"
                    f"💰 <b>Лимит:</b> {int(float(vc_limit)):,} ₽\n".replace(",", " ") +
                    f"📈 <b>Ставка:</b> {float(vc_rate)}%/день\n"
                    f"🔖 <b>Заявка №:</b> {vc_id}"
                )
                data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
                req = urllib.request.Request(
                    f"https://api.telegram.org/bot{tg_token}/sendMessage",
                    data=data, headers={"Content-Type": "application/json"}
                )
                try:
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if confirm:
            import urllib.request
            tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
            chat_id = "8540431915"
            cur.execute(
                f"SELECT id, full_name, amount, approved_amount, approved_days, approved_rate, status FROM {SCHEMA}.applications "
                f"WHERE phone='{ph_e}' AND status IN ('approved','partner_card') ORDER BY created_at DESC LIMIT 1"
            )
            app_row = cur.fetchone()
            if tg_token and app_row:
                app_id, full_name, amount, appr_amount, appr_days, appr_rate, status = app_row
                eff = float(appr_amount) if appr_amount else float(amount)
                rate_v = float(appr_rate) if appr_rate else 0.008
                days_v = int(appr_days) if appr_days else 0
                interest = round(eff * rate_v * days_v)
                status_label = "партнёр" if status == "partner_card" else "одобрен"
                text = (
                    f"✅ <b>Клиент подтвердил займ ({status_label})</b>\n\n"
                    f"👤 <b>ФИО:</b> {full_name or phone}\n"
                    f"📞 <b>Телефон:</b> {phone}\n"
                    f"💳 <b>Карта/СБП:</b> {card_number}\n"
                    f"💰 <b>Сумма:</b> {int(eff):,} ₽\n".replace(",", " ") +
                    f"📅 <b>Срок:</b> {days_v} дн.\n"
                    f"📈 <b>Ставка:</b> {round(rate_v * 100, 1)}%/день\n"
                    f"💵 <b>К возврату:</b> {int(eff + interest):,} ₽\n".replace(",", " ") +
                    f"🔖 <b>Заявка №:</b> {app_id}"
                )
                data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
                req = urllib.request.Request(
                    f"https://api.telegram.org/bot{tg_token}/sendMessage",
                    data=data, headers={"Content-Type": "application/json"}
                )
                try:
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass
        cur.close(); conn.close()
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
        f"SELECT id, amount, days, status, created_at, approved_amount, approved_rate, approved_days, reject_reason, card_number, contract_url, "
        f"virtual_card_number, virtual_card_expiry, virtual_card_cvv, virtual_card_holder, virtual_card_limit, virtual_card_rate, virtual_card_status, "
        f"is_credit_doctor "
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
            "contractUrl": app_row[10] or "",
            "virtualCard": {
                "number": app_row[11] or "",
                "expiry": app_row[12] or "",
                "cvv": app_row[13] or "",
                "holder": app_row[14] or "",
                "limit": float(app_row[15]) if app_row[15] else 0,
                "rate": float(app_row[16]) if app_row[16] else 0,
                "status": app_row[17] or "none",
            } if app_row[11] else None,
            "isCreditDoctor": bool(app_row[18]) if app_row[18] is not None else False,
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
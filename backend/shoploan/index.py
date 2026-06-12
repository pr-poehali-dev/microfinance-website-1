"""Займ на покупку товаров: приём заявок, управление из админки, статус для клиента. v1"""
import json
import os
import urllib.request
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def tg(text: str):
    tok = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not tok:
        return
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{tok}/sendMessage",
        data=data, headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def check_admin(cur, raw_token: str) -> bool:
    t = raw_token.replace("'", "''")
    cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()")
    return cur.fetchone() is not None


def s(val) -> str:
    return (str(val) if val is not None else "").replace("'", "''")


def handler(event: dict, context) -> dict:
    """Займ на покупку товаров: публичный приём заявок, управление для администратора, статус для клиента."""
    method = event.get("httpMethod", "GET")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")

    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw_token = hdrs.get("x-authorization") or hdrs.get("authorization") or ""
    token = raw_token.replace("Bearer ", "").replace("bearer ", "").strip()

    conn = get_conn()
    cur = conn.cursor()

    # ── POST / ── принять новую заявку (публичный) ────────────────────────────
    if method == "POST" and not sub:
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b

        full_name      = s(b.get("fullName"))
        phone          = s(b.get("phone"))
        email          = s(b.get("email"))
        birth_date     = s(b.get("birthDate"))
        address        = s(b.get("address"))
        passport_series = s(b.get("passportSeries"))
        passport_number = s(b.get("passportNumber"))
        passport_date  = s(b.get("passportDate"))
        passport_by    = s(b.get("passportBy"))
        snils          = s(b.get("snils"))
        shop_name      = s(b.get("shopName"))
        item_name      = s(b.get("itemName"))
        contact_person = s(b.get("contactPerson"))
        card_number    = s(b.get("cardNumber"))
        file_passport  = s(b.get("filePassport"))
        file_registration = s(b.get("fileRegistration"))
        file_selfie    = s(b.get("fileSelfie"))
        file_snils     = s(b.get("fileSnils"))

        item_price_raw  = b.get("itemPrice")
        loan_amount_raw = b.get("loanAmount")
        loan_months_raw = b.get("loanMonths")
        item_price  = int(item_price_raw)   if item_price_raw  is not None else 0
        loan_amount = int(loan_amount_raw)  if loan_amount_raw is not None else 0
        loan_months = int(loan_months_raw)  if loan_months_raw is not None else 12
        bd_val = f"'{birth_date}'" if birth_date else "NULL"

        cur.execute(
            f"INSERT INTO {SCHEMA}.shopping_loan_applications "
            f"(full_name, phone, email, birth_date, address, passport_series, passport_number, "
            f" passport_date, passport_by, snils, shop_name, item_name, item_price, "
            f" loan_amount, loan_months, contact_person, card_number, "
            f" file_passport, file_registration, file_selfie, file_snils, "
            f" status, created_at, updated_at) "
            f"VALUES ('{full_name}','{phone}','{email}',{bd_val},'{address}',"
            f"'{passport_series}','{passport_number}','{passport_date}','{passport_by}',"
            f"'{snils}','{shop_name}','{item_name}',{item_price},"
            f"{loan_amount},{loan_months},'{contact_person}','{card_number}',"
            f"'{file_passport}','{file_registration}','{file_selfie}','{file_snils}',"
            f"'pending',NOW(),NOW()) RETURNING id"
        )
        new_id = cur.fetchone()[0]
        conn.commit()

        tg(
            f"🛒 <b>Новая заявка на товарный займ #{new_id}</b>\n\n"
            f"👤 <b>ФИО:</b> {b.get('fullName','')}\n"
            f"📞 <b>Телефон:</b> {b.get('phone','')}\n"
            f"🏪 <b>Магазин:</b> {b.get('shopName','—')}\n"
            f"📦 <b>Товар:</b> {b.get('itemName','—')}\n"
            f"💰 <b>Сумма:</b> {loan_amount:,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {loan_months} мес."
        )

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}

    # ── GET /?sub=list&status=pending ── список заявок для админа ─────────────
    if method == "GET" and sub == "list":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        sf = (qs.get("status", "pending") or "pending").replace("'", "''")
        if sf not in ("pending", "approved", "rejected"):
            sf = "pending"

        cur.execute(
            f"SELECT id, full_name, phone, email, birth_date, address, passport_series, passport_number, "
            f"passport_date, passport_by, snils, shop_name, item_name, item_price, "
            f"loan_amount, loan_months, contact_person, card_number, "
            f"file_passport, file_registration, file_selfie, file_snils, "
            f"status, reject_reason, approved_amount, approved_months, approved_rate, "
            f"notes, contract_signed, contract_signed_at, created_at, updated_at "
            f"FROM {SCHEMA}.shopping_loan_applications WHERE status = '{sf}' ORDER BY created_at DESC"
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        result = []
        for row in rows:
            item = {}
            for col, val in zip(cols, row):
                if hasattr(val, "isoformat"):
                    item[col] = val.isoformat()
                else:
                    item[col] = val
            result.append(item)

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "items": result}, ensure_ascii=False)}

    # ── GET /?sub=get&phone=... ── статус заявки для клиента ──────────────────
    if method == "GET" and sub == "get":
        phone_q = (qs.get("phone") or "").replace("'", "''")
        if not phone_q:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "phone required"})}

        cur.execute(
            f"SELECT id, loan_amount, loan_months, status, reject_reason, approved_amount, "
            f"approved_months, approved_rate, notes, shop_name, item_name, item_price, "
            f"contract_signed, contract_signed_at, created_at "
            f"FROM {SCHEMA}.shopping_loan_applications WHERE phone = '{phone_q}' ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
        keys = ["id","loan_amount","loan_months","status","reject_reason","approved_amount",
                "approved_months","approved_rate","notes","shop_name","item_name","item_price",
                "contract_signed","contract_signed_at","created_at"]
        item = {}
        for k, v in zip(keys, row):
            item[k] = v.isoformat() if hasattr(v, "isoformat") else v
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "item": item}, ensure_ascii=False)}

    # ── PUT /?sub=update&id=N ── обновить заявку (админ) ─────────────────────
    if method == "PUT" and sub == "update":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        app_id = int(qs.get("id", 0) or 0)
        if not app_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}

        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b

        parts = ["updated_at = NOW()"]
        if "status" in b:
            parts.append(f"status = '{s(b['status'])}'")
        if "reject_reason" in b:
            parts.append(f"reject_reason = '{s(b['reject_reason'])}'")
        if "approved_amount" in b and b["approved_amount"] is not None:
            parts.append(f"approved_amount = {int(b['approved_amount'])}")
        if "approved_months" in b and b["approved_months"] is not None:
            parts.append(f"approved_months = {int(b['approved_months'])}")
        if "approved_rate" in b and b["approved_rate"] is not None:
            parts.append(f"approved_rate = {float(b['approved_rate'])}")
        if "notes" in b:
            parts.append(f"notes = '{s(b['notes'])}'")

        cur.execute(
            f"UPDATE {SCHEMA}.shopping_loan_applications "
            f"SET {', '.join(parts)} WHERE id = {app_id} RETURNING phone, full_name, loan_amount"
        )
        row = cur.fetchone()
        conn.commit()

        if row:
            phone_n, fname, amt = row
            new_status = b.get("status", "")
            if new_status == "approved":
                aa = b.get("approved_amount") or amt
                am = b.get("approved_months", 12)
                ar = b.get("approved_rate", 9)
                tg(
                    f"✅ <b>Товарный займ #{app_id} одобрен</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n"
                    f"💰 Одобрено: {int(aa):,} ₽, {am} мес., {ar}%/мес.".replace(",", " ")
                )
            elif new_status == "rejected":
                reason = b.get("reject_reason", "")
                tg(
                    f"❌ <b>Товарный займ #{app_id} отклонён</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n" +
                    (f"📝 Причина: {reason}" if reason else "")
                )

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── PUT /?sub=sign&id=N ── подписать договор (клиент) ────────────────────
    if method == "PUT" and sub == "sign":
        app_id = int(qs.get("id", 0) or 0)
        if not app_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}

        cur.execute(
            f"UPDATE {SCHEMA}.shopping_loan_applications "
            f"SET contract_signed = TRUE, contract_signed_at = NOW(), updated_at = NOW() "
            f"WHERE id = {app_id} AND status = 'approved' RETURNING id, full_name, phone"
        )
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или не одобрена"})}

        tg(f"✍️ <b>Договор подписан #{row[0]}</b>\n👤 {row[1]} | 📞 {row[2]}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.close(); conn.close()
    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown request"})}

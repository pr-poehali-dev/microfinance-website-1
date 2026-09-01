"""Приём и управление заявками на займ под залог автомобиля. v3"""
import json
import os
import secrets
import hashlib
import urllib.request
import psycopg2
from datetime import datetime, timedelta
from decimal import Decimal

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


def check_admin(cur, raw_token: str) -> bool:
    t = raw_token.replace("'", "''")
    cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()")
    return cur.fetchone() is not None


def handler(event: dict, context) -> dict:
    """Заявки на займ под залог автомобиля: приём от клиентов, управление из админки."""
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

    # --- POST / — принять новую заявку (публичный) ---
    if method == "POST" and not sub:
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b

        def s(k): return (b.get(k) or "").replace("'", "''")

        full_name       = s("fullName")
        phone           = s("phone")
        email           = s("email")
        birth_date      = s("birthDate")
        address         = s("address")
        passport_serial = s("passportSerial")
        passport_num    = s("passportNum")
        passport_issued = s("passportIssued")
        car_brand       = s("carBrand")
        car_model       = s("carModel")
        contact_person  = s("contactPerson")
        card_number     = s("cardNumber")

        car_year    = int(b["carYear"])    if b.get("carYear")    else 0
        car_mileage = int(b["carMileage"]) if b.get("carMileage") else 0
        loan_amount = float(b["loanAmount"]) if b.get("loanAmount") else 0
        loan_months = int(b["loanMonths"])   if b.get("loanMonths")  else 0
        bd_val = f"'{birth_date}'" if birth_date else "NULL"

        cur.execute(
            f"INSERT INTO {SCHEMA}.car_loan_applications "
            f"(full_name, phone, email, birth_date, address, passport_serial, passport_num, passport_issued, "
            f" car_brand, car_model, car_year, car_mileage, contact_person, card_number, loan_amount, loan_months, "
            f" status, created_at, updated_at) "
            f"VALUES ('{full_name}','{phone}','{email}',{bd_val},'{address}','{passport_serial}','{passport_num}',"
            f"'{passport_issued}','{car_brand}','{car_model}',{car_year},{car_mileage},'{contact_person}',"
            f"'{card_number}',{loan_amount},{loan_months},'pending',NOW(),NOW()) RETURNING id"
        )
        new_id = cur.fetchone()[0]

        # Создаём/обновляем пользователя и сессию для ЛК
        plain_pw = secrets.token_hex(6)
        pw_hash = hashlib.sha256(plain_pw.encode()).hexdigest()
        ph_e = phone.replace("'", "''")
        fn_e = full_name.replace("'", "''")
        em_e = email.replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{ph_e}'")
        u = cur.fetchone()
        if not u:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
                f"VALUES ('{ph_e}', '{pw_hash}', '{fn_e}', '{em_e}') RETURNING id"
            )
            user_id = cur.fetchone()[0]
        else:
            user_id = u[0]

        sess_token = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) "
            f"VALUES ({user_id}, '{sess_token}', '{expires_at}')"
        )
        conn.commit()

        tg(
            f"🚗 <b>Новая заявка на автозайм #{new_id}</b>\n\n"
            f"👤 <b>ФИО:</b> {b.get('fullName','')}\n"
            f"📞 <b>Телефон:</b> {b.get('phone','')}\n"
            f"🚘 <b>Авто:</b> {b.get('carBrand','')} {b.get('carModel','')} {b.get('carYear','')}\n"
            f"💰 <b>Сумма:</b> {int(loan_amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {loan_months} мес."
        )

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id, "token": sess_token})}

    # --- GET /?sub=list&status=pending — список для админа ---
    if method == "GET" and sub == "list":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        sf = (qs.get("status", "pending") or "pending").replace("'", "''")
        if sf not in ("pending", "signing", "approved", "rejected", "disbursed"):
            sf = "pending"

        # disbursed — все у кого проставлен disbursed_at, независимо от статуса
        if sf == "disbursed":
            where = "disbursed_at IS NOT NULL"
        else:
            where = f"status = '{sf}'"

        cur.execute(
            f"SELECT id, full_name, phone, email, birth_date, address, passport_serial, passport_num, "
            f"passport_issued, car_brand, car_model, car_year, car_mileage, contact_person, card_number, "
            f"loan_amount, loan_months, status, reject_reason, approved_amount, approved_months, "
            f"approved_rate, notes, created_at, updated_at, disbursed_at "
            f"FROM {SCHEMA}.car_loan_applications WHERE {where} ORDER BY created_at DESC"
        )
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        result = []
        for row in rows:
            item = {}
            for col, val in zip(cols, row):
                if hasattr(val, "isoformat"):
                    item[col] = val.isoformat()
                elif isinstance(val, Decimal):
                    item[col] = float(val)
                else:
                    item[col] = val
            result.append(item)

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "items": result}, ensure_ascii=False)}

    # --- GET /?sub=get&id=N — одна заявка для клиента по телефону ---
    if method == "GET" and sub == "get":
        phone_q = (qs.get("phone") or "").replace("'", "''")
        if not phone_q:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "phone required"})}

        cur.execute(
            f"SELECT id, loan_amount, loan_months, status, reject_reason, approved_amount, approved_months, "
            f"approved_rate, notes, car_brand, car_model, car_year, created_at, disbursed_at, "
            f"full_name, email, birth_date, address, passport_serial, passport_num, passport_issued, "
            f"car_mileage, contact_person, card_number "
            f"FROM {SCHEMA}.car_loan_applications WHERE phone = '{phone_q}' ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
        keys = ["id","loan_amount","loan_months","status","reject_reason","approved_amount","approved_months",
                "approved_rate","notes","car_brand","car_model","car_year","created_at","disbursed_at",
                "full_name","email","birth_date","address","passport_serial","passport_num","passport_issued",
                "car_mileage","contact_person","card_number"]
        item = {}
        for k, v in zip(keys, row):
            if hasattr(v, "isoformat"):
                item[k] = v.isoformat()
            elif isinstance(v, Decimal):
                item[k] = float(v)
            else:
                item[k] = v

        # История платежей
        cur.execute(
            f"SELECT amount, paid_at, note FROM {SCHEMA}.payments "
            f"WHERE loan_type = 'carloan' AND loan_id = {item['id']} ORDER BY paid_at DESC"
        )
        payments = [
            {"amount": float(r[0]), "paidAt": r[1].strftime("%d.%m.%Y в %H:%M"), "note": r[2] or ""}
            for r in cur.fetchall()
        ]
        item["payments"] = payments
        item["paidTotal"] = sum(p["amount"] for p in payments)

        # Расчётный ежемесячный график погашения (если одобрен/выдан)
        item["schedule"] = []
        eff_amount = item.get("approved_amount") or item.get("loan_amount")
        eff_months = item.get("approved_months") or item.get("loan_months")
        eff_rate = item.get("approved_rate")
        if item["status"] in ("approved", "signing") and eff_amount and eff_months and eff_rate:
            monthly_principal = float(eff_amount) / int(eff_months)
            remaining = float(eff_amount)
            start = None
            if item.get("disbursed_at"):
                start = datetime.fromisoformat(item["disbursed_at"])
            elif item.get("created_at"):
                start = datetime.fromisoformat(item["created_at"])
            for m in range(1, int(eff_months) + 1):
                interest_m = round(remaining * float(eff_rate) / 100)
                payment_m = round(monthly_principal + interest_m)
                due = (start + timedelta(days=30 * m)).strftime("%d.%m.%Y") if start else None
                item["schedule"].append({
                    "month": m, "dueDate": due, "amount": payment_m,
                    "principal": round(monthly_principal), "interest": interest_m,
                })
                remaining -= monthly_principal

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "item": item}, ensure_ascii=False)}

    # --- PUT /?sub=update&id=N — обновить заявку (админ) ---
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
            v = str(b["status"]).replace("'", "''")
            parts.append(f"status = '{v}'")
        if "reject_reason" in b:
            v = str(b["reject_reason"]).replace("'", "''")
            parts.append(f"reject_reason = '{v}'")
        if "approved_amount" in b and b["approved_amount"] is not None:
            parts.append(f"approved_amount = {float(b['approved_amount'])}")
        if "approved_months" in b and b["approved_months"] is not None:
            parts.append(f"approved_months = {int(b['approved_months'])}")
        if "approved_rate" in b and b["approved_rate"] is not None:
            parts.append(f"approved_rate = {float(b['approved_rate'])}")
        if "notes" in b:
            v = str(b["notes"]).replace("'", "''")
            parts.append(f"notes = '{v}'")

        cur.execute(f"UPDATE {SCHEMA}.car_loan_applications SET {', '.join(parts)} WHERE id = {app_id} RETURNING phone, full_name, loan_amount")
        row = cur.fetchone()
        conn.commit()

        if row:
            phone_n, fname, amt = row
            new_status = b.get("status", "")
            if new_status == "approved":
                aa = b.get("approved_amount") or amt
                am = b.get("approved_months", 12)
                ar = b.get("approved_rate", 12)
                tg(
                    f"✅ <b>Автозайм #{app_id} одобрен</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n"
                    f"💰 Одобрено: {int(float(aa)):,} ₽, {am} мес., {ar}%/мес.".replace(",", " ")
                )
            elif new_status == "signing":
                aa = b.get("approved_amount") or amt
                am = b.get("approved_months", 12)
                ar = b.get("approved_rate", 12)
                tg(
                    f"✍️ <b>Автозайм #{app_id} — на подписании</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n"
                    f"💰 Условия: {int(float(aa)):,} ₽, {am} мес., {ar}%/мес.".replace(",", " ")
                )
            elif new_status == "rejected":
                reason = b.get("reject_reason", "")
                tg(
                    f"❌ <b>Автозайм #{app_id} отклонён</b>\n"
                    f"👤 {fname} | 📞 {phone_n}\n" +
                    (f"📝 Причина: {reason}" if reason else "")
                )

        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- POST /?sub=disburse&id=N — выдать займ (отметить деньги переведены) ---
    if method == "POST" and sub == "disburse":
        if not check_admin(cur, token):
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

        app_id = int(qs.get("id", 0) or 0)
        if not app_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}

        cur.execute(
            f"UPDATE {SCHEMA}.car_loan_applications "
            f"SET disbursed_at = NOW(), updated_at = NOW() "
            f"WHERE id = {app_id} RETURNING full_name, phone, approved_amount, loan_amount"
        )
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}

        fname, phone_n, aa, la = row
        amt = aa or la
        tg(
            f"💸 <b>Автозайм #{app_id} выдан</b>\n"
            f"👤 {fname or '—'} | 📞 {phone_n}\n"
            f"💰 Сумма: {int(float(amt)):,} ₽".replace(",", " ")
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.close(); conn.close()
    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown request"})}
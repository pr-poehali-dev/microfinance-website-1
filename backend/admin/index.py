"""Панель администратора: вход, список клиентов, добавление/редактирование займов. v4"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import urllib.request
import psycopg2


from datetime import timedelta as _msk_td


def msk(dt):
    """Переводит время из UTC (как хранится в БД) в московское (UTC+3) для показа."""
    return dt + _msk_td(hours=3) if dt else dt


CARD_MIN_PAYMENT_PERCENT = 30
CARD_SCHEDULE_WEEKS = 8


def card_payment_schedule(issued_at, debt):
    """Еженедельный график платежей по карте: даты от выдачи карты (МСК), минимальный платёж 30% от общего долга."""
    if not issued_at:
        return []
    start = (issued_at + timedelta(hours=3)).date()
    today = (datetime.utcnow() + timedelta(hours=3)).date()
    k = 1
    while start + timedelta(weeks=k) < today:
        k += 1
    min_payment = round(float(debt) * CARD_MIN_PAYMENT_PERCENT / 100)
    return [{
        "week": i + 1,
        "dueDate": (start + timedelta(weeks=k + i)).strftime("%d.%m.%Y"),
        "amount": min_payment,
        "isNext": i == 0,
    } for i in range(CARD_SCHEDULE_WEEKS)]

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"

OVERDUE_DAILY_PENALTY_RATE = 0.07  # 7% от суммы основного долга (loans.amount, с учётом страховки) за каждый день просрочки


def calc_loan_penalty(amount, days, rate, disbursed_at, created_at, paid_total, db_status, penalty_waived=0):
    """Пеня за просрочку обычного займа (loans): 7%/день от amount за каждый день сверх срока.
    penalty_waived — сумма пени, прощённая администратором (уменьшает начисленную пеню, не ниже нуля).
    Возвращает (effective_status, total_due, is_overdue, overdue_days, penalty_amount)."""
    base_interest = round(float(amount) * float(rate) * int(days))
    base_total = float(amount) + base_interest
    if db_status not in ("active", "overdue") or not disbursed_at:
        return db_status, base_total, False, 0, 0.0
    due_date = (disbursed_at + timedelta(days=int(days))).date()
    today = datetime.now().date()
    if today <= due_date or float(paid_total) >= base_total:
        return "active", base_total, False, 0, 0.0
    overdue_days = (today - due_date).days
    penalty_raw = round(float(amount) * OVERDUE_DAILY_PENALTY_RATE * overdue_days)
    penalty = max(0, penalty_raw - float(penalty_waived or 0))
    return "overdue", base_total + penalty, True, overdue_days, penalty


def tg(text: str):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        return
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def tg_client(username: str, text: str):
    """Отправляет сообщение клиенту по @username через Telegram-бота."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token or not username:
        return
    chat_id = f"@{username}" if not username.startswith("@") else username
    data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def send_email(to: str, subject: str, html: str):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    if not smtp_user or not smtp_pass or not to:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"РУСФИНАНС 24 <{smtp_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP_SSL("smtp.yandex.ru", 465, timeout=4) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to, msg.as_string())
        print(f"[send-email] sent to {to}")
    except Exception as ex:
        print(f"[send-email] error: {ex}")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def promo_rate(cur, app_id_e: str, rate):
    """Снижает ставку на процент скидки промокода заявки (скидка действует на проценты)."""
    if rate is None:
        return rate
    cur.execute(f"SELECT promo_discount FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
    r = cur.fetchone()
    d = int(r[0]) if r and r[0] else 0
    return round(float(rate) * (100 - d) / 100, 5) if d else rate


def check_admin_token(cur, token: str) -> bool:
    t = token.replace("'", "''")
    cur.execute(
        f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()"
    )
    return cur.fetchone() is not None


def handler(event: dict, context) -> dict:
    """Панель администратора: авторизация и управление займами клиентов."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    headers_in = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw_token = (headers_in.get("x-authorization") or headers_in.get("authorization") or "")
    token = raw_token.replace("Bearer ", "").replace("bearer ", "").strip()
    print(f"[admin] method={method} sub={sub!r} token_len={len(token)}")

    conn = get_conn()
    cur = conn.cursor()

    # --- ВХОД АДМИНИСТРАТОРА ---
    if sub == "" and method == "POST" and body.get("action") == "login":
        password = body.get("password", "")
        admin_password = os.environ.get("ADMIN_PASSWORD", "")
        if not admin_password or password != admin_password:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный пароль"})}

        tok = secrets.token_hex(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_sessions (token, expires_at) "
            f"VALUES ('{tok}', NOW() + INTERVAL '12 hours')"
        )
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": tok})}

    # --- ПРОВЕРКА ТОКЕНА ---
    token_valid = check_admin_token(cur, token)
    print(f"[admin] token_valid={token_valid}")
    if not token_valid:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    # --- СПИСОК КЛИЕНТОВ (GET, sub='') ---
    if sub == "" and method == "GET":
        cur.execute(f"""
            SELECT u.id, u.phone, u.full_name, u.email, u.created_at,
                   COUNT(l.id) AS loan_count,
                   COALESCE(SUM(CASE WHEN l.status != 'paid' THEN l.amount ELSE 0 END), 0) AS debt
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.loans l ON l.user_id = u.id
            GROUP BY u.id ORDER BY u.created_at DESC
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        users = [{"id": r[0], "phone": r[1], "fullName": r[2] or "", "email": r[3] or "",
                  "createdAt": r[4].strftime("%d.%m.%Y"), "loanCount": r[5], "debt": float(r[6])} for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users}, ensure_ascii=False)}

    # --- ЗАЙМЫ КЛИЕНТА (GET, sub='loans', userId=...) ---
    if sub == "loans" and method == "GET":
        user_id = int(qs.get("userId", 0))
        cur.execute(f"SELECT id, amount, days, rate, status, created_at, disbursed_at, penalty_waived FROM {SCHEMA}.loans WHERE user_id = {user_id} ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.execute(f"SELECT phone, full_name FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        loan_ids = [str(r[0]) for r in rows]
        paid_map: dict = {}
        if loan_ids:
            cur.execute(f"SELECT loan_id, COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id IN ({','.join(loan_ids)}) GROUP BY loan_id")
            for lid, s in cur.fetchall():
                paid_map[lid] = float(s)
        cur.close(); conn.close()
        loans = []
        for r in rows:
            lid, amount, days, rate, status, created_at, disbursed_at, penalty_waived = r
            paid_total = paid_map.get(lid, 0.0)
            eff_status, total_due, is_overdue, overdue_days, penalty = calc_loan_penalty(
                amount, days, rate, disbursed_at, created_at, paid_total, status, penalty_waived
            )
            loans.append({
                "id": lid, "amount": float(amount), "days": days, "rate": float(rate),
                "ratePercent": round(float(rate) * 100, 1), "status": eff_status,
                "createdAt": created_at.strftime("%d.%m.%Y"),
                "totalDue": total_due, "isOverdue": is_overdue,
                "overdueDays": overdue_days, "penaltyAmount": penalty,
                "penaltyWaived": float(penalty_waived or 0),
            })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(
            {"loans": loans, "user": {"phone": u[0] if u else "", "fullName": u[1] if u else ""}},
            ensure_ascii=False
        )}

    # --- ДОБАВИТЬ ЗАЙМ (POST, sub='loans') ---
    if sub == "loans" and method == "POST":
        phone  = (body.get("phone") or "").strip()
        amount = float(body.get("amount", 0))
        days   = int(body.get("days", 0))
        rate   = float(body.get("rate", 0.008))

        if not phone or amount <= 0 or days <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}

        ph_e = phone.replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{ph_e}'")
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент с таким номером не найден"})}

        cur.execute(f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status) VALUES ({user[0]}, {amount}, {days}, {rate}, 'active') RETURNING id")
        loan_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        interest = round(amount * rate * days)
        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")
        tg(
            f"💰 <b>Новый займ выдан</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Клиент:</b> {phone}\n"
            f"💵 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"📈 <b>Ставка:</b> {round(rate * 100, 1)}%/день\n"
            f"💳 <b>К возврату:</b> {int(amount + interest):,} ₽\n".replace(",", " ") +
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ИЗМЕНИТЬ СТАТУС ЗАЙМА (PUT, sub='loan', loanId=...) ---
    if sub == "loan" and method == "PUT":
        loan_id = qs.get("loanId")
        status  = body.get("status", "active")
        lid = int(loan_id) if loan_id else 0
        st_e = status.replace("'", "''")
        cur.execute(f"SELECT l.amount, u.phone FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id WHERE l.id = {lid}")
        row = cur.fetchone()
        cur.execute(f"UPDATE {SCHEMA}.loans SET status = '{st_e}' WHERE id = {lid}")
        conn.commit(); cur.close(); conn.close()

        STATUS_LABELS = {"active": "Активен ✅", "paid": "Погашен ✔️", "overdue": "Просрочен ⚠️", "review": "На рассмотрении 🔍"}
        if row:
            tg(
                f"🔄 <b>Статус займа изменён</b>\n\n"
                f"📞 <b>Клиент:</b> {row[1]}\n"
                f"💵 <b>Сумма:</b> {int(row[0]):,} ₽\n".replace(",", " ") +
                f"🔖 <b>Займ №:</b> {loan_id}\n"
                f"📌 <b>Новый статус:</b> {STATUS_LABELS.get(status, status)}"
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- СПИСАТЬ ПЕНЮ ЗА ПРОСРОЧКУ (POST, sub='waive_penalty', loanId=..., body: {mode: 'full'|'amount', amount?}) ---
    if sub == "waive_penalty" and method == "POST":
        loan_id = int(qs.get("loanId", 0) or 0)
        if not loan_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан loanId"})}

        mode = (body.get("mode") or "full").strip()
        custom_amount = body.get("amount")

        cur.execute(
            f"SELECT l.amount, l.days, l.rate, l.disbursed_at, l.created_at, l.status, l.penalty_waived, u.phone "
            f"FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id WHERE l.id = {loan_id}"
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Займ не найден"})}
        amount, days, rate, disbursed_at, created_at, status, penalty_waived, phone = row

        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id={loan_id}")
        paid_total = float(cur.fetchone()[0])

        # Текущая пеня без учёта уже списанного — чтобы понять, сколько ещё можно списать
        _, _, is_overdue, overdue_days, current_penalty = calc_loan_penalty(
            amount, days, rate, disbursed_at, created_at, paid_total, status, penalty_waived
        )
        if not is_overdue or current_penalty <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "У займа нет начисленной пени для списания"})}

        if mode == "amount":
            add = float(custom_amount or 0)
            if add <= 0:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму списания больше нуля"})}
            add = min(add, current_penalty)
        else:
            add = current_penalty

        new_waived = float(penalty_waived or 0) + add
        cur.execute(f"UPDATE {SCHEMA}.loans SET penalty_waived = {new_waived} WHERE id = {loan_id}")
        conn.commit()

        # Пересчитываем итоговые цифры после списания
        eff_status, total_due, is_overdue2, overdue_days2, penalty_after = calc_loan_penalty(
            amount, days, rate, disbursed_at, created_at, paid_total, status, new_waived
        )
        cur.close(); conn.close()

        tg(
            f"🎁 <b>Списана пеня за просрочку</b>\n\n"
            f"📞 <b>Клиент:</b> {phone}\n"
            f"🔖 <b>Займ №:</b> {loan_id}\n"
            f"➖ <b>Списано:</b> {int(add):,} ₽\n".replace(",", " ") +
            f"📌 <b>Остаток пени:</b> {int(penalty_after):,} ₽".replace(",", " ")
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True, "waivedNow": add, "penaltyWaived": new_waived,
            "penaltyAmount": penalty_after, "totalDue": total_due, "isOverdue": is_overdue2,
        })}

    # --- ЗАРЕГИСТРИРОВАТЬ КЛИЕНТА (POST, sub='register') ---
    if sub == "register" and method == "POST":
        phone     = (body.get("phone") or "").strip()
        full_name = (body.get("fullName") or "").strip()
        password  = (body.get("password") or "").strip()

        if not phone or not password:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Телефон и пароль обязательны"})}

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        ph_e = phone.replace("'", "''")
        fn_e = (full_name or "").replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{ph_e}'")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Клиент уже зарегистрирован"})}

        cur.execute(f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name) VALUES ('{ph_e}', '{pw_hash}', '{fn_e}') RETURNING id")
        uid = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")
        tg(
            f"👤 <b>Новый клиент зарегистрирован</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"🙍 <b>ФИО:</b> {full_name or '—'}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "userId": uid})}

    # --- СПИСОК ЗАЯВОК (GET, sub='applications') — все статусы за один запрос ---
    if sub == "applications" and method == "GET":
        status_filter = qs.get("status", "all")
        print(f"[applications] status_filter={status_filter!r}")
        where_clause = "WHERE COALESCE(a.is_card_request, FALSE) = FALSE" if status_filter == "all" else f"WHERE COALESCE(a.is_card_request, FALSE) = FALSE AND a.status = '{status_filter.replace(chr(39), chr(39)*2)}'"
        cur.execute(f"""
            SELECT a.id, a.full_name, a.phone, a.email, a.amount, a.days, a.birth_date,
                   a.passport_series, a.passport_number, a.status, a.created_at, a.reject_reason,
                   a.telegram_id, a.birth_place, a.passport_date, a.passport_code, a.passport_by,
                   a.file_passport, a.file_registration, a.file_selfie, a.file_previous_passports,
                   a.workplace, a.position, a.active_loans, a.salary, a.contact_person, a.sb_score,
                   a.approved_amount, a.client_password, a.card_number,
                   a.approved_rate, a.approved_days,
                   l.id AS loan_id, l.signed, l.signed_at, l.status AS loan_status, l.disbursed_at,
                   a.snils, a.work_phone, a.card_number_transfer, a.is_credit_doctor,
                   a.video_call_requested, a.virtual_card_days, u2.blocked_until,
                   a.reviewed_at, l.created_at AS loan_created_at,
                   COALESCE(hist.loans_count, 0), COALESCE(hist.paid_count, 0), COALESCE(hist.overdue_count, 0),
                   COALESCE(hist.total_borrowed, 0), COALESCE(hist.apps_count, 0), a.partner_card_url,
                   a.virtual_card_status, a.virtual_card_limit, a.virtual_card_signed_at, a.is_card_request,
                   a.promo_code, a.promo_discount, a.profile_updated_at, a.profile_changes
            FROM {SCHEMA}.applications a
            LEFT JOIN LATERAL (
                SELECT lo.id, lo.signed, lo.signed_at, lo.status, lo.disbursed_at, lo.created_at
                FROM {SCHEMA}.loans lo
                JOIN {SCHEMA}.users u ON u.id = lo.user_id
                WHERE u.phone = a.phone
                ORDER BY lo.created_at DESC LIMIT 1
            ) l ON true
            LEFT JOIN {SCHEMA}.users u2 ON u2.phone = a.phone
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(lo2.id) AS loans_count,
                    COUNT(lo2.id) FILTER (WHERE lo2.status = 'paid') AS paid_count,
                    COUNT(lo2.id) FILTER (WHERE lo2.status = 'overdue') AS overdue_count,
                    COALESCE(SUM(lo2.amount), 0) AS total_borrowed,
                    (SELECT COUNT(*) FROM {SCHEMA}.applications a2 WHERE a2.phone = a.phone AND a2.id != a.id) AS apps_count
                FROM {SCHEMA}.loans lo2
                JOIN {SCHEMA}.users u3 ON u3.id = lo2.user_id
                WHERE u3.phone = a.phone
            ) hist ON true
            {where_clause} ORDER BY a.created_at DESC
        """)
        rows = cur.fetchall()
        print(f"[applications] found {len(rows)} rows")
        cur.execute(f"SELECT DISTINCT ON (loan_id) loan_id, amount, created_at FROM {SCHEMA}.loan_payment_notices WHERE loan_type = 'loan' AND status = 'new' ORDER BY loan_id, id DESC")
        loan_notice_map = {n[0]: {"amount": float(n[1]), "createdAt": msk(n[2]).strftime("%d.%m.%Y в %H:%M")} for n in cur.fetchall()}
        cur.close(); conn.close()
        apps = [{
            "id": r[0], "fullName": r[1] or "", "phone": r[2], "email": r[3] or "",
            "amount": float(r[4]) if r[4] else 0, "days": r[5] or 0,
            "birthDate": str(r[6]) if r[6] else "", "passportSeries": r[7] or "",
            "passportNumber": r[8] or "", "status": r[9],
            "createdAt": msk(r[10]).strftime("%d.%m.%Y в %H:%M"), "rejectReason": r[11] or "",
            "telegramId": r[12] or "", "birthPlace": r[13] or "",
            "passportDate": str(r[14]) if r[14] else "", "passportCode": r[15] or "",
            "passportBy": r[16] or "",
            "filePassport": r[17] or "", "fileRegistration": r[18] or "",
            "fileSelfie": r[19] or "", "filePreviousPassports": r[20] or "",
            "workplace": r[21] or "", "position": r[22] or "",
            "activeLoans": r[23] or "", "salary": float(r[24]) if r[24] else 0,
            "contactPerson": r[25] or "", "sbScore": r[26] or "",
            "approvedAmount": float(r[27]) if r[27] else None,
            "clientPassword": r[28] or "",
            "cardNumber": r[29] or "",
            "approvedRate": float(r[30]) if r[30] else None,
            "approvedDays": int(r[31]) if r[31] else None,
            "loanId": r[32],
            "loanNotice": loan_notice_map.get(r[32]) if r[32] else None,
            "loanSigned": bool(r[33]) if r[33] is not None else False,
            "loanSignedAt": msk(r[34]).strftime("%d.%m.%Y в %H:%M") if r[34] else None,
            "loanStatus": r[35] or None,
            "loanDisbursedAt": msk(r[36]).strftime("%d.%m.%Y в %H:%M") if r[36] else None,
            "snils": r[37] or "",
            "workPhone": r[38] or "",
            "cardNumberTransfer": r[39] or "",
            "isCreditDoctor": bool(r[40]) if r[40] is not None else False,
            "isCardRequest": bool(r[55]) if len(r) > 55 and r[55] else False,
            "promoCode": r[56] if len(r) > 56 and r[56] else "",
            "promoDiscount": int(r[57]) if len(r) > 57 and r[57] else 0,
            "profileUpdatedAt": msk(r[58]).strftime("%d.%m.%Y в %H:%M") if len(r) > 58 and r[58] else None,
            "profileChanges": r[59] if len(r) > 59 and r[59] else "",
            "videoCallRequested": bool(r[41]) if r[41] is not None else False,
            "virtualCardDays": int(r[42]) if r[42] else None,
            "blockedUntil": msk(r[43]).strftime("%d.%m.%Y %H:%M") if r[43] else None,
            "reviewedAt": msk(r[44]).strftime("%d.%m.%Y в %H:%M") if r[44] else None,
            "loanCreatedAt": msk(r[45]).strftime("%d.%m.%Y в %H:%M") if r[45] else None,
            "prevLoansCount": int(r[46]) if r[46] else 0,
            "prevPaidCount": int(r[47]) if r[47] else 0,
            "prevOverdueCount": int(r[48]) if r[48] else 0,
            "totalBorrowed": float(r[49]) if r[49] else 0,
            "isRepeatClient": (int(r[46]) if r[46] else 0) > 0 or (int(r[50]) if r[50] else 0) > 0,
            "partnerCardUrl": r[51] or "",
            "virtualCardStatus": r[52] or "none",
            "virtualCardLimit": float(r[53]) if r[53] else None,
            "virtualCardSignedAt": msk(r[54]).strftime("%d.%m.%Y в %H:%M") if r[54] else None,
        } for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"applications": apps}, ensure_ascii=False)}

    # --- ОДОБРИТЬ ЗАЯВКУ (POST, sub='approve', appId=...) ---
    if sub == "approve" and method == "POST":
        app_id = qs.get("appId")
        rate = float(body.get("rate", 0.008))
        approved_amount = body.get("amount")  # Если админ изменил сумму
        approved_days = body.get("days")  # Если админ изменил срок
        partner_card_url = (body.get("partnerCardUrl") or "").strip()

        app_id_esc = str(app_id).replace("'", "''")
        cur.execute(f"""
            SELECT full_name, phone, amount, days, telegram_id, email
            FROM {SCHEMA}.applications WHERE id = '{app_id_esc}' AND status = 'pending'
        """)
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или уже обработана"})}

        full_name, phone, amount, days, tg_username, client_email = app
        rate = promo_rate(cur, app_id_esc, rate)
        # Используем сумму и срок от администратора если указаны, иначе из заявки
        if approved_amount:
            amount = float(approved_amount)
        if approved_days:
            days = int(approved_days)

        # Страхование жизни и здоровья: 50% от суммы, выдаваемой клиенту на руки.
        # Клиент получает на карту исходную сумму (amount), а тело долга,
        # на которое начисляются проценты, увеличивается на страховку.
        insurance_amount = round(amount * 0.5)
        debt_amount = amount + insurance_amount

        # Находим или создаём пользователя, всегда генерируем новый пароль
        import secrets as _s, hashlib as _h, string as _str
        alphabet = _str.ascii_letters + _str.digits
        plain_password = (
            _s.choice(_str.ascii_uppercase) +
            "".join(_s.choice(_str.ascii_lowercase) for _ in range(4)) +
            "".join(_s.choice(_str.digits) for _ in range(3)) +
            _s.choice("!@#$") +
            "".join(_s.choice(alphabet) for _ in range(3))
        )
        pw_hash = _h.sha256(plain_password.encode()).hexdigest()

        phone_esc = phone.replace("'", "''")
        fn_esc = (full_name or "").replace("'", "''")
        em_esc = (client_email or "").replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone_esc}'")
        user = cur.fetchone()
        if not user:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
                f"VALUES ('{phone_esc}', '{pw_hash}', '{fn_esc}', '{em_esc}') RETURNING id"
            )
            user_id = cur.fetchone()[0]
        else:
            user_id = user[0]
            cur.execute(f"UPDATE {SCHEMA}.users SET password_hash='{pw_hash}' WHERE id={user_id}")

        # Создаём займ со статусом review — клиент сам подпишет договор в ЛК.
        # amount в loans — это тело долга (сумма + страховка), проценты считаются от него.
        cur.execute(
            f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status, offer_amount, offer_days, offer_rate, insurance_amount) "
            f"VALUES ({user_id},{debt_amount},{days},{rate},'review',{debt_amount},{days},{rate},{insurance_amount}) RETURNING id"
        )
        loan_id = cur.fetchone()[0]

        # Обновляем статус заявки, сохраняем сумму, ставку, срок, страховку и пароль клиента
        pw_esc = plain_password.replace("'", "''")
        partner_url_sql = f", partner_card_url='{partner_card_url.replace(chr(39), chr(39)*2)}'" if partner_card_url else ""
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET status='approved', reviewed_at=NOW(), "
            f"approved_amount={amount}, approved_rate={rate}, approved_days={days}, insurance_amount={insurance_amount}, "
            f"client_password='{pw_esc}'{partner_url_sql} WHERE id='{app_id_esc}'"
        )
        conn.commit(); cur.close(); conn.close()

        # Запускаем генерацию PDF договора — не ждём её завершения (короткий таймаут,
        # сама генерация продолжится на стороне generate-contract независимо от ответа здесь)
        try:
            import urllib.request as _ur
            contract_payload = json.dumps({"appId": int(app_id), "loanId": loan_id}).encode()
            contract_req = _ur.Request(
                "https://functions.poehali.dev/9cdc3bea-1348-49df-a7a3-4aeef6088ff3",
                data=contract_payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
                method="POST"
            )
            _ur.urlopen(contract_req, timeout=3)
            print(f"[admin] contract generated for app_id={app_id}")
        except Exception as ex:
            print(f"[admin] contract generation error (non-blocking): {ex}")

        interest = round(debt_amount * rate * int(days))
        total = debt_amount + interest
        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")

        tg(
            f"✅ <b>Заявка одобрена</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Сумма на руки:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"🛡 <b>Страховка (50%):</b> {int(insurance_amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        if tg_username:
            tg_client(
                tg_username,
                f"✅ <b>Ваша заявка одобрена!</b>\n\n"
                f"💰 <b>Сумма займа:</b> {int(amount):,} ₽\n".replace(",", " ") +
                f"🛡 <b>Страхование жизни и здоровья (50%):</b> {int(insurance_amount):,} ₽\n".replace(",", " ") +
                f"📅 <b>Срок:</b> {days} дн.\n"
                f"📈 <b>Ставка:</b> {round(rate * 100, 1)}%/день\n"
                f"💳 <b>К возврату:</b> {int(total):,} ₽\n\n".replace(",", " ") +
                f"Деньги будут переведены на вашу карту. Ожидайте звонка специалиста."
            )
        if client_email:
            amount_fmt = f"{int(amount):,}".replace(",", " ")
            insurance_fmt = f"{int(insurance_amount):,}".replace(",", " ")
            total_fmt = f"{int(total):,}".replace(",", " ")
            send_email(
                to=client_email,
                subject=f"Ваш займ #{loan_id} одобрен — РУСФИНАНС 24",
                html=f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F0A1E;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0A1E;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1030;border-radius:16px;overflow:hidden;border:1px solid rgba(74,222,128,0.3);">
        <tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">РУСФИНАНС 24</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">✅ Займ одобрен!</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0 0 16px;">Здравствуйте, <b style="color:#fff;">{full_name or phone}</b>!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;line-height:1.6;">Ваша заявка рассмотрена и <b style="color:#4ade80;">одобрена</b>. Деньги будут переведены на вашу карту. Ожидайте звонка специалиста.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(74,222,128,0.1);border-radius:12px;border:1px solid rgba(74,222,128,0.3);margin-bottom:20px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Сумма займа</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{amount_fmt} ₽</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Страхование жизни и здоровья (50%)</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{insurance_fmt} ₽</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Срок</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{days} дней</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">Ставка</span></td>
                  <td align="right"><b style="color:#fff;font-size:16px;">{round(rate * 100, 1)}% в день</b></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;"><span style="color:rgba(255,255,255,0.5);font-size:13px;">К возврату</span></td>
                  <td align="right" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;"><b style="color:#4ade80;font-size:20px;">{total_fmt} ₽</b></td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 8px;">Данные для входа в личный кабинет:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.15);border-radius:12px;border:1px solid rgba(124,58,237,0.3);margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;">ТЕЛЕФОН</p>
              <p style="margin:0 0 16px;color:#fff;font-size:18px;font-weight:bold;">{phone}</p>
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;">ПАРОЛЬ</p>
              <p style="margin:0;color:#c084fc;font-size:22px;font-weight:bold;letter-spacing:2px;">{plain_password}</p>
            </td></tr>
          </table>
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;text-align:center;">© РУСФИНАНС 24 · Это письмо отправлено автоматически</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ОТКАЗАТЬ ПО ЗАЯВКЕ (POST, sub='reject', appId=...) ---
    if sub == "reject" and method == "POST":
        app_id = qs.get("appId")
        reason = (body.get("reason") or "").strip()

        app_id_esc = str(app_id).replace("'", "''")
        reason_esc = reason.replace("'", "''")
        cur.execute(f"""
            SELECT full_name, phone, amount, telegram_id, email
            FROM {SCHEMA}.applications WHERE id = '{app_id_esc}' AND status = 'pending'
        """)
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или уже обработана"})}

        full_name, phone, amount, tg_username, client_email = app
        reason_val = f"'{reason_esc}'" if reason_esc else "NULL"
        cur.execute(f"UPDATE {SCHEMA}.applications SET status='rejected', reviewed_at=NOW(), reject_reason={reason_val} WHERE id='{app_id_esc}'")
        conn.commit(); cur.close(); conn.close()

        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")
        tg(
            f"❌ <b>Заявка отклонена</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            (f"📝 <b>Причина:</b> {reason}" if reason else "")
        )
        if tg_username:
            tg_client(tg_username,
                f"❌ <b>По вашей заявке принято отрицательное решение.</b>\n\n"
                + (f"📝 <b>Причина:</b> {reason}\n\n" if reason else "")
                + "Вы можете подать новую заявку позже или связаться с нами для уточнения деталей."
            )
        if client_email:
            reason_block = f'<p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 16px;"><b style="color:#f87171;">Причина:</b> {reason}</p>' if reason else ""
            send_email(
                to=client_email,
                subject="По вашей заявке принято решение — РУСФИНАНС 24",
                html=f"""<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F0A1E;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0A1E;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1030;border-radius:16px;overflow:hidden;border:1px solid rgba(239,68,68,0.3);">
        <tr><td style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:bold;">РУСФИНАНС 24</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">По заявке принято решение</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0 0 16px;">Здравствуйте, <b style="color:#fff;">{full_name or phone}</b>!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 16px;line-height:1.6;">К сожалению, по вашей заявке на займ принято <b style="color:#f87171;">отрицательное решение</b>.</p>
          {reason_block}
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;line-height:1.6;">Вы можете подать новую заявку позже или связаться с нами для уточнения деталей.</p>
          <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;text-align:center;">© РУСФИНАНС 24 · Это письмо отправлено автоматически</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПРОМОКОДЫ: список (GET, sub='promo_codes') ---
    if sub == "promo_codes" and method == "GET":
        cur.execute(
            f"SELECT id, code, discount_percent, created_at, used_at, used_phone, used_for "
            f"FROM {SCHEMA}.promo_codes ORDER BY (used_at IS NOT NULL), discount_percent, id DESC"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        codes = [{
            "id": r[0], "code": r[1], "discount": r[2],
            "createdAt": msk(r[3]).strftime("%d.%m.%Y %H:%M"),
            "usedAt": msk(r[4]).strftime("%d.%m.%Y %H:%M") if r[4] else None,
            "usedPhone": r[5] or "", "usedFor": r[6] or "",
        } for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"codes": codes}, ensure_ascii=False)}

    # --- ПРОМОКОДЫ: создать пачку (POST, sub='promo_generate', body: {discount, count}) ---
    if sub == "promo_generate" and method == "POST":
        disc = int(body.get("discount", 0) or 0)
        cnt = int(body.get("count", 1) or 1)
        if disc not in (10, 20, 30, 40, 50) or cnt < 1 or cnt > 50:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Скидка 10-50%, количество 1-50"})}
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        created = []
        for _ in range(cnt):
            for _try in range(10):
                code = "".join(secrets.choice(alphabet) for _ in range(8))
                cur.execute(
                    f"INSERT INTO {SCHEMA}.promo_codes (code, discount_percent) VALUES ('{code}', {disc}) "
                    f"ON CONFLICT (code) DO NOTHING RETURNING code"
                )
                if cur.fetchone():
                    created.append(code)
                    break
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "codes": created})}

    # --- ПРОМОКОДЫ: удалить неиспользованный (POST, sub='promo_delete', id=...) ---
    if sub == "promo_delete" and method == "POST":
        pid = int(qs.get("id", 0) or 0)
        cur.execute(f"DELETE FROM {SCHEMA}.promo_codes WHERE id={pid} AND used_at IS NULL")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОТЛОЖИТЬ ЗАЯВКУ (POST, sub='postpone', appId=...) ---
    if sub == "postpone" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.applications SET status='postponed', reviewed_at=NOW() WHERE id='{app_id_e}' AND status='pending'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПАРТНЁРСКОЕ ОДОБРЕНИЕ (POST, sub='partner_approve', appId=..., body: {amount, days, rate}) ---
    if sub == "partner_approve" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        body = json.loads(event.get("body") or "{}") if isinstance(event.get("body"), str) else (event.get("body") or {})
        p_amount = float(body.get("amount", 0)) if body.get("amount") else None
        p_days = int(body.get("days", 0)) if body.get("days") else None
        p_rate = float(body.get("rate", 0)) if body.get("rate") else None
        p_card_url = (body.get("partnerCardUrl") or "").strip()
        cur.execute(f"SELECT full_name, phone, telegram_id, email FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND status='pending'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, tg_username, client_email = app
        p_rate = promo_rate(cur, app_id_e, p_rate)
        # Страхование жизни и здоровья: 50% от суммы, выдаваемой клиенту на руки.
        p_insurance = round(p_amount * 0.5) if p_amount else None
        p_debt = (p_amount + p_insurance) if p_amount else None
        set_parts = ["status='partner_card'", "reviewed_at=NOW()"]
        if p_amount: set_parts.append(f"approved_amount={p_amount}")
        if p_days: set_parts.append(f"approved_days={p_days}")
        if p_rate: set_parts.append(f"approved_rate={p_rate}")
        if p_insurance is not None: set_parts.append(f"insurance_amount={p_insurance}")
        if p_card_url: set_parts.append(f"partner_card_url='{p_card_url.replace(chr(39), chr(39)*2)}'")
        cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(set_parts)} WHERE id='{app_id_e}'")

        # Находим или создаём пользователя и создаём займ в статусе review —
        # чтобы клиент мог подписать договор, а факт подписи сохранялся в БД (loans.signed)
        if p_amount and p_days and p_rate:
            import secrets as _s, hashlib as _h, string as _str
            phone_esc = phone.replace("'", "''")
            fn_esc = (full_name or "").replace("'", "''")
            em_esc = (client_email or "").replace("'", "''")
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone_esc}'")
            existing_user = cur.fetchone()
            if not existing_user:
                alphabet = _str.ascii_letters + _str.digits
                plain_password = (
                    _s.choice(_str.ascii_uppercase) +
                    "".join(_s.choice(_str.ascii_lowercase) for _ in range(4)) +
                    "".join(_s.choice(_str.digits) for _ in range(3)) +
                    _s.choice("!@#$") +
                    "".join(_s.choice(alphabet) for _ in range(3))
                )
                pw_hash = _h.sha256(plain_password.encode()).hexdigest()
                pw_esc = plain_password.replace("'", "''")
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
                    f"VALUES ('{phone_esc}', '{pw_hash}', '{fn_esc}', '{em_esc}') RETURNING id"
                )
                user_id = cur.fetchone()[0]
                cur.execute(f"UPDATE {SCHEMA}.applications SET client_password='{pw_esc}' WHERE id='{app_id_e}'")
            else:
                user_id = existing_user[0]
            cur.execute(
                f"SELECT id FROM {SCHEMA}.loans WHERE user_id={user_id} AND status='review'"
            )
            if not cur.fetchone():
                cur.execute(
                    f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status, insurance_amount) "
                    f"VALUES ({user_id}, {p_debt}, {p_days}, {p_rate}, 'review', {p_insurance})"
                )
        conn.commit(); cur.close(); conn.close()
        loan_info = ""
        if p_amount and p_days and p_rate:
            interest = round(p_debt * p_rate * p_days)
            loan_info = f"\n\n💰 <b>Условия займа:</b>\nСумма: {int(p_amount):,} ₽\n🛡 Страхование (50%): {int(p_insurance):,} ₽\nСрок: {p_days} дней\nСтавка: {round(p_rate*100,1)}% в день\nК возврату: {int(p_debt+interest):,} ₽"
        if tg_username:
            tg_client(tg_username,
                f"✅ <b>Ваша заявка одобрена!</b>{loan_info}\n\n"
                "Для получения займа вам необходимо оформить карту нашего партнёра.\n"
                "Подробности — в вашем личном кабинете."
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОДОБРЕНИЕ КАК КРЕДИТНЫЙ ДОКТОР (POST, sub='creditdoctor_approve', appId=..., body: {amount, days, rate}) ---
    if sub == "creditdoctor_approve" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        body = json.loads(event.get("body") or "{}") if isinstance(event.get("body"), str) else (event.get("body") or {})
        p_amount = float(body.get("amount", 0)) if body.get("amount") else None
        p_days = int(body.get("days", 0)) if body.get("days") else None
        p_rate = float(body.get("rate", 0)) if body.get("rate") else None
        p_card_url = (body.get("partnerCardUrl") or "").strip()
        cur.execute(f"SELECT full_name, phone, telegram_id, email FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND status='pending'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, tg_username, client_email = app
        p_rate = promo_rate(cur, app_id_e, p_rate)
        # Страхование жизни и здоровья: 50% от суммы, выдаваемой клиенту на руки.
        p_insurance = round(p_amount * 0.5) if p_amount else None
        p_debt = (p_amount + p_insurance) if p_amount else None
        set_parts = ["status='partner_card'", "is_credit_doctor=true", "reviewed_at=NOW()"]
        if p_amount: set_parts.append(f"approved_amount={p_amount}")
        if p_days: set_parts.append(f"approved_days={p_days}")
        if p_rate: set_parts.append(f"approved_rate={p_rate}")
        if p_insurance is not None: set_parts.append(f"insurance_amount={p_insurance}")
        if p_card_url: set_parts.append(f"partner_card_url='{p_card_url.replace(chr(39), chr(39)*2)}'")
        cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(set_parts)} WHERE id='{app_id_e}'")

        # Находим или создаём пользователя и создаём займ в статусе review —
        # чтобы клиент мог подписать договор, а факт подписи сохранялся в БД (loans.signed)
        if p_amount and p_days and p_rate:
            import secrets as _s, hashlib as _h, string as _str
            phone_esc = phone.replace("'", "''")
            fn_esc = (full_name or "").replace("'", "''")
            em_esc = (client_email or "").replace("'", "''")
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone_esc}'")
            existing_user = cur.fetchone()
            if not existing_user:
                alphabet = _str.ascii_letters + _str.digits
                plain_password = (
                    _s.choice(_str.ascii_uppercase) +
                    "".join(_s.choice(_str.ascii_lowercase) for _ in range(4)) +
                    "".join(_s.choice(_str.digits) for _ in range(3)) +
                    _s.choice("!@#$") +
                    "".join(_s.choice(alphabet) for _ in range(3))
                )
                pw_hash = _h.sha256(plain_password.encode()).hexdigest()
                pw_esc = plain_password.replace("'", "''")
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name, email) "
                    f"VALUES ('{phone_esc}', '{pw_hash}', '{fn_esc}', '{em_esc}') RETURNING id"
                )
                user_id = cur.fetchone()[0]
                cur.execute(f"UPDATE {SCHEMA}.applications SET client_password='{pw_esc}' WHERE id='{app_id_e}'")
            else:
                user_id = existing_user[0]
            cur.execute(
                f"SELECT id FROM {SCHEMA}.loans WHERE user_id={user_id} AND status='review'"
            )
            if not cur.fetchone():
                cur.execute(
                    f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status, insurance_amount) "
                    f"VALUES ({user_id}, {p_debt}, {p_days}, {p_rate}, 'review', {p_insurance})"
                )
        conn.commit(); cur.close(); conn.close()
        loan_info = ""
        if p_amount and p_days and p_rate:
            interest = round(p_debt * p_rate * p_days)
            loan_info = f"\n\n💰 <b>Условия займа:</b>\nСумма: {int(p_amount):,} ₽\n🛡 Страхование (50%): {int(p_insurance):,} ₽\nСрок: {p_days} дней\nСтавка: {round(p_rate*100,1)}% в день\nК возврату: {int(p_debt+interest):,} ₽"
        if tg_username:
            tg_client(tg_username,
                f"💊 <b>Ваша заявка одобрена по программе «Кредитный Доктор»!</b>{loan_info}\n\n"
                "Программа поможет восстановить вашу кредитную историю.\n"
                "Подробности — в вашем личном кабинете."
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- НАПОМНИТЬ КЛИЕНТУ В TELEGRAM (POST, sub='partner_remind', appId=...) ---
    if sub == "partner_remind" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, telegram_id, approved_amount, approved_days, approved_rate, insurance_amount FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND status='partner_card'")
        app = cur.fetchone()
        cur.close(); conn.close()
        if not app:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, tg_username, p_amount, p_days, p_rate, p_insurance = app
        if not tg_username:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "У клиента нет Telegram"})}
        loan_info = ""
        if p_amount and p_days and p_rate:
            p_insurance = float(p_insurance) if p_insurance else 0
            p_debt = float(p_amount) + p_insurance
            interest = round(p_debt * float(p_rate) * int(p_days))
            insurance_line = f"\n🛡 Страхование (50%): {int(p_insurance):,} ₽".replace(",", " ") if p_insurance else ""
            loan_info = f"\n\n💰 <b>Условия займа:</b>\nСумма: {int(float(p_amount)):,} ₽{insurance_line}\nСрок: {p_days} дней\nСтавка: {round(float(p_rate)*100,1)}% в день\nК возврату: {int(p_debt+interest):,} ₽"
        tg_client(tg_username,
            f"🔔 <b>Напоминание по вашей заявке</b>{loan_info}\n\n"
            "Для получения займа необходимо оформить карту нашего партнёра.\n"
            "Войдите в личный кабинет по номеру телефона и нажмите кнопку «Оформить карту партнёра»."
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ВЕРНУТЬ ЗАЯВКУ В ОЖИДАНИЕ (POST, sub='restore', appId=...) ---
    if sub == "restore" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.applications SET status='pending', reviewed_at=NULL WHERE id='{app_id_e}' AND status IN ('postponed','approved','rejected','partner_card')")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- СОЗДАТЬ ОФФЕР ДЛЯ КЛИЕНТА (POST, sub='offer', userId=...) ---
    if sub == "offer" and method == "POST":
        user_id = int(qs.get("userId", 0))
        offer_amount = float(body.get("offerAmount", 0))
        offer_days   = int(body.get("offerDays", 0))
        offer_rate   = float(body.get("offerRate", 0.008))

        if not user_id or offer_amount <= 0 or offer_days <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status, offer_amount, offer_days, offer_rate, signed) "
            f"VALUES ({user_id}, {offer_amount}, {offer_days}, {offer_rate}, 'review', {offer_amount}, {offer_days}, {offer_rate}, FALSE) RETURNING id"
        )
        loan_id = cur.fetchone()[0]
        conn.commit()

        cur.execute(f"SELECT phone, full_name FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        cur.close(); conn.close()

        phone_u = u[0] if u else ""
        name_u  = u[1] if u else phone_u
        interest = round(offer_amount * offer_rate * offer_days)
        total = int(offer_amount + interest)
        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")
        tg(
            f"📋 <b>Создан оффер для клиента</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {name_u}\n"
            f"📞 <b>Телефон:</b> {phone_u}\n"
            f"💵 <b>Сумма:</b> {int(offer_amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {offer_days} дн.\n"
            f"📈 <b>Ставка:</b> {round(offer_rate * 100, 1)}%/день\n"
            f"💳 <b>К возврату:</b> {total:,} ₽\n".replace(",", " ") +
            f"🔖 <b>Займ №:</b> {loan_id}\n"
            f"⏳ <i>Ожидает подписи клиента</i>"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ЗАРЕГИСТРИРОВАТЬ КЛИЕНТА (POST, sub='register') ---
    if sub == "register" and method == "POST":
        phone    = (body.get("phone") or "").strip()
        full_name = (body.get("fullName") or "").strip()
        password  = (body.get("password") or "").strip()

        if not phone or not password:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Телефон и пароль обязательны"})}

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        phone_e = phone.replace("'", "''")
        fn_e    = full_name.replace("'", "''")

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{phone_e}'")
        existing = cur.fetchone()
        if existing:
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Клиент с таким номером уже существует"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name) "
            f"VALUES ('{phone_e}', '{pw_hash}', '{fn_e}') RETURNING id"
        )
        user_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")
        tg(
            f"👤 <b>Новый клиент зарегистрирован</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"👤 <b>ФИО:</b> {full_name or '—'}\n"
            f"🔖 <b>ID:</b> {user_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "userId": user_id}, ensure_ascii=False)}

    # --- ВЫДАТЬ ЗАЙМ (POST, sub='disburse', loanId=...) ---
    if sub == "disburse" and method == "POST":
        loan_id = int(qs.get("loanId", 0))
        if not loan_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан loanId"})}

        cur.execute(
            f"SELECT l.amount, l.days, l.rate, u.phone, u.full_name, u.id "
            f"FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id "
            f"WHERE l.id = {loan_id}"
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Займ не найден"})}

        amount, days, rate, phone, full_name, user_id = row
        cur.execute(
            f"UPDATE {SCHEMA}.loans SET status='active', signed=TRUE, signed_at=COALESCE(signed_at, NOW()), disbursed_at=NOW() WHERE id={loan_id}"
        )
        conn.commit(); cur.close(); conn.close()

        interest = round(float(amount) * float(rate) * int(days))
        total = float(amount) + interest
        now = msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")
        tg(
            f"💸 <b>Займ выдан</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💵 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"📈 <b>Ставка:</b> {round(float(rate) * 100, 1)}%/день\n"
            f"💳 <b>К возврату:</b> {int(total):,} ₽\n".replace(",", " ") +
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- СПИСОК ВСЕХ ВЫДАННЫХ ЗАЙМОВ (GET, sub='disbursed') ---
    if sub == "disbursed" and method == "GET":
        now = datetime.now()

        def calc_overdue(amount, months_or_days, rate, disbursed_at, created_at, paid_total, monthly: bool):
            """Считает переплату по графику и определяет просрочку + ближайшую дату платежа."""
            if not amount or not months_or_days or not rate:
                return False, None, float(amount or 0)
            start = disbursed_at or created_at
            if not start:
                return False, None, float(amount)
            if monthly:
                months = int(months_or_days)
                monthly_principal = float(amount) / months
                remaining = float(amount)
                cumulative = 0.0
                next_due = None
                overdue = False
                for m in range(1, months + 1):
                    interest_m = round(remaining * float(rate) / 100)
                    payment_m = round(monthly_principal + interest_m)
                    due_dt = start + timedelta(days=30 * m)
                    cumulative += payment_m
                    if paid_total < cumulative:
                        next_due = due_dt
                        if due_dt < now:
                            overdue = True
                        break
                    remaining -= monthly_principal
                total_due = round(float(amount) * (1 + float(rate) / 100 * months))
                return overdue, next_due, total_due
            else:
                days = int(months_or_days)
                due_dt = start + timedelta(days=days)
                total_due = float(amount) + round(float(amount) * float(rate) * days)
                overdue = due_dt < now and paid_total < total_due
                next_due = due_dt if paid_total < total_due else None
                return overdue, next_due, total_due

        # Платежи по всем займам сразу (чтобы не делать N запросов)
        cur.execute(f"SELECT loan_type, loan_id, COALESCE(SUM(amount),0) FROM {SCHEMA}.payments GROUP BY loan_type, loan_id")
        paid_map: dict = {}
        for lt, lid, s in cur.fetchall():
            paid_map[(lt, lid)] = float(s)

        # Основные займы (loans)
        cur.execute(f"""
            SELECT l.id, u.full_name, u.phone, u.email,
                   l.amount, l.days, l.rate,
                   l.disbursed_at, l.created_at, l.status,
                   a.telegram_id, l.penalty_waived
            FROM {SCHEMA}.loans l
            JOIN {SCHEMA}.users u ON u.id = l.user_id
            LEFT JOIN LATERAL (
                SELECT telegram_id FROM {SCHEMA}.applications WHERE phone = u.phone ORDER BY created_at DESC LIMIT 1
            ) a ON true
            WHERE l.disbursed_at IS NOT NULL
            ORDER BY l.disbursed_at DESC
        """)
        loan_rows = cur.fetchall()

        # Авто займы
        cur.execute(f"""
            SELECT id, full_name, phone, email,
                   loan_amount, loan_months, approved_rate, approved_amount, approved_months,
                   CONCAT(car_brand, ' ', car_model, ' ', COALESCE(car_year::text, '')) AS car_info,
                   disbursed_at, created_at
            FROM {SCHEMA}.car_loan_applications
            WHERE disbursed_at IS NOT NULL
            ORDER BY disbursed_at DESC
        """)
        car_rows = cur.fetchall()

        # Товарные займы
        cur.execute(f"""
            SELECT id, full_name, phone, email,
                   loan_amount, loan_months, approved_rate, approved_amount, approved_months,
                   CONCAT(COALESCE(shop_name,''), ' — ', COALESCE(item_name,'')) AS item_info,
                   disbursed_at, created_at
            FROM {SCHEMA}.shopping_loan_applications
            WHERE disbursed_at IS NOT NULL
            ORDER BY disbursed_at DESC
        """)
        shop_rows = cur.fetchall()

        cur.execute(f"SELECT DISTINCT ON (loan_type, loan_id) loan_type, loan_id, amount, created_at FROM {SCHEMA}.loan_payment_notices WHERE status = 'new' ORDER BY loan_type, loan_id, id DESC")
        notice_map = {(n[0], n[1]): {"amount": float(n[2]), "createdAt": msk(n[3]).strftime("%d.%m.%Y в %H:%M")} for n in cur.fetchall()}

        cur.close(); conn.close()

        all_items = []
        for r in loan_rows:
            loan_id, full_name, phone, email, amount, days, rate, disbursed_at, created_at, status, tg_id, penalty_waived = r
            paid_total = paid_map.get(("loan", loan_id), 0.0)
            eff_status, total_due, is_overdue, overdue_days, penalty = calc_loan_penalty(
                amount, days, rate, disbursed_at, created_at, paid_total, status, penalty_waived
            )
            next_due = (disbursed_at + timedelta(days=int(days))) if disbursed_at and paid_total < total_due and status != "paid" else None
            all_items.append({
                "type": "loan", "id": loan_id,
                "fullName": full_name or "", "phone": phone, "email": email or "",
                "loanAmount": float(amount) if amount else 0,
                "loanMonths": days or 0,
                "rate": float(rate) if rate else None,
                "approvedAmount": None,
                "carInfo": "", "itemInfo": "",
                "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
                "createdAt": created_at.strftime("%d.%m.%Y") if created_at else "",
                "telegramId": tg_id or "",
                "paidTotal": paid_total,
                "totalDue": total_due,
                "isOverdue": is_overdue and status != "paid",
                "overdueDays": overdue_days,
                "penaltyAmount": penalty,
                "nextDueDate": next_due.strftime("%d.%m.%Y") if next_due else None,
            })
        for r in car_rows:
            app_id, full_name, phone, email, loan_amount, loan_months, appr_rate, appr_amount, appr_months, car_info, disbursed_at, created_at = r
            eff_amount = appr_amount or loan_amount
            eff_months = appr_months or loan_months
            paid_total = paid_map.get(("carloan", app_id), 0.0)
            overdue, next_due, total_due = calc_overdue(eff_amount, eff_months, appr_rate, disbursed_at, created_at, paid_total, monthly=True)
            all_items.append({
                "type": "carloan", "id": app_id,
                "fullName": full_name or "", "phone": phone, "email": email or "",
                "loanAmount": float(loan_amount) if loan_amount else 0,
                "loanMonths": loan_months or 0,
                "rate": float(appr_rate) if appr_rate else None,
                "approvedAmount": float(appr_amount) if appr_amount else None,
                "carInfo": car_info or "", "itemInfo": "",
                "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
                "createdAt": created_at.strftime("%d.%m.%Y") if created_at else "",
                "telegramId": "",
                "paidTotal": paid_total,
                "totalDue": total_due,
                "isOverdue": bool(overdue),
                "nextDueDate": next_due.strftime("%d.%m.%Y") if next_due else None,
            })
        for r in shop_rows:
            app_id, full_name, phone, email, loan_amount, loan_months, appr_rate, appr_amount, appr_months, item_info, disbursed_at, created_at = r
            eff_amount = appr_amount or loan_amount
            eff_months = appr_months or loan_months
            paid_total = paid_map.get(("shoploan", app_id), 0.0)
            overdue, next_due, total_due = calc_overdue(eff_amount, eff_months, appr_rate, disbursed_at, created_at, paid_total, monthly=True)
            all_items.append({
                "type": "shoploan", "id": app_id,
                "fullName": full_name or "", "phone": phone, "email": email or "",
                "loanAmount": float(loan_amount) if loan_amount else 0,
                "loanMonths": loan_months or 0,
                "rate": float(appr_rate) if appr_rate else None,
                "approvedAmount": float(appr_amount) if appr_amount else None,
                "carInfo": "", "itemInfo": item_info or "",
                "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
                "createdAt": created_at.strftime("%d.%m.%Y") if created_at else "",
                "telegramId": "",
                "paidTotal": paid_total,
                "totalDue": total_due,
                "isOverdue": bool(overdue),
                "nextDueDate": next_due.strftime("%d.%m.%Y") if next_due else None,
            })

        for it in all_items:
            it["pendingNotice"] = notice_map.get((it["type"], it["id"]))
        all_items.sort(key=lambda x: x["disbursedAt"] or "", reverse=True)

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"items": all_items, "total": len(all_items)}, ensure_ascii=False)}

    # --- ПОЛНАЯ КАРТОЧКА КЛИЕНТА ПО ВЫДАННОМУ ЗАЙМУ (GET, sub='loan_detail', type=..., id=...) ---
    if sub == "loan_detail" and method == "GET":
        loan_type = (qs.get("type") or "").strip()
        item_id = int(qs.get("id", 0) or 0)
        if loan_type not in ("loan", "carloan", "shoploan") or not item_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректные параметры"})}

        if loan_type == "loan":
            cur.execute(f"""
                SELECT l.id, l.amount, l.days, l.rate, l.status, l.created_at, l.signed, l.signed_at, l.disbursed_at,
                       u.id, u.phone, u.full_name, u.email, l.penalty_waived
                FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id
                WHERE l.id = {item_id}
            """)
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Займ не найден"})}
            (loan_id, amount, days, rate, status, created_at, signed, signed_at, disbursed_at,
             user_id, phone, full_name, email, penalty_waived) = row

            cur.execute(f"""
                SELECT amount, days, birth_date, birth_place, passport_series, passport_number, passport_date,
                       passport_code, passport_by, workplace, position, work_phone, salary, contact_person, snils,
                       card_number, file_passport, file_registration, file_selfie, file_previous_passports,
                       telegram_id
                FROM {SCHEMA}.applications WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1
            """)
            app_row = cur.fetchone()
            profile = {}
            if app_row:
                (req_amount, req_days, birth_date, birth_place, passport_series, passport_number, passport_date,
                 passport_code, passport_by, workplace, position, work_phone, salary, contact_person, snils,
                 card_number, file_passport, file_registration, file_selfie, file_previous_passports, telegram_id) = app_row
                profile = {
                    "birthDate": birth_date or "", "birthPlace": birth_place or "",
                    "passportSeries": passport_series or "", "passportNumber": passport_number or "",
                    "passportDate": passport_date or "", "passportCode": passport_code or "", "passportBy": passport_by or "",
                    "workplace": workplace or "", "position": position or "", "workPhone": work_phone or "",
                    "salary": float(salary) if salary else None, "contactPerson": contact_person or "", "snils": snils or "",
                    "cardNumber": card_number or "",
                    "filePassport": file_passport or "", "fileRegistration": file_registration or "",
                    "fileSelfie": file_selfie or "", "filePreviousPassports": file_previous_passports or "",
                    "telegramId": telegram_id or "",
                }

            cur.execute(f"SELECT amount, paid_at, note FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id={loan_id} ORDER BY paid_at DESC")
            payments = [{"amount": float(p[0]), "paidAt": msk(p[1]).strftime("%d.%m.%Y в %H:%M"), "note": p[2] or ""} for p in cur.fetchall()]
            paid_total = sum(p["amount"] for p in payments)

            eff_status, total_due, is_overdue, overdue_days, penalty = calc_loan_penalty(
                amount, days, rate, disbursed_at, created_at, paid_total, status, penalty_waived
            )
            start = disbursed_at or created_at
            schedule = [{"dueDate": (start + timedelta(days=days)).strftime("%d.%m.%Y"), "amount": total_due, "label": "Погашение полной суммы" if not penalty else f"Погашение с пеней за просрочку ({overdue_days} дн.)"}] if start else []

            cur.execute(f"SELECT amount, created_at FROM {SCHEMA}.loan_payment_notices WHERE loan_type = 'loan' AND loan_id = {loan_id} AND status = 'new' ORDER BY id DESC LIMIT 1")
            pn = cur.fetchone()
            pending_notice = {"amount": float(pn[0]), "createdAt": msk(pn[1]).strftime("%d.%m.%Y в %H:%M")} if pn else None
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "type": "loan", "id": loan_id, "pendingNotice": pending_notice,
                "fullName": full_name or "", "phone": phone, "email": email or "",
                "amount": float(amount), "days": days, "rate": float(rate),
                "status": eff_status, "createdAt": msk(created_at).strftime("%d.%m.%Y в %H:%M") if created_at else "",
                "signed": bool(signed), "signedAt": msk(signed_at).strftime("%d.%m.%Y в %H:%M") if signed_at else None,
                "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
                "totalDue": total_due, "paidTotal": paid_total, "remaining": max(0, total_due - paid_total),
                "isOverdue": is_overdue, "overdueDays": overdue_days, "penaltyAmount": penalty,
                "penaltyWaived": float(penalty_waived or 0),
                "penaltyRatePercent": round(OVERDUE_DAILY_PENALTY_RATE * 100, 1),
                "schedule": schedule, "payments": payments, "profile": profile,
            }, ensure_ascii=False)}

        table = "car_loan_applications" if loan_type == "carloan" else "shopping_loan_applications"
        if loan_type == "carloan":
            cur.execute(f"""
                SELECT id, full_name, phone, email, birth_date, address, passport_serial, passport_num, passport_issued,
                       car_brand, car_model, car_year, car_mileage, contact_person, card_number,
                       loan_amount, loan_months, status, reject_reason, approved_amount, approved_months, approved_rate,
                       notes, created_at, disbursed_at, contract_signed, contract_signed_at
                FROM {SCHEMA}.{table} WHERE id = {item_id}
            """)
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
            (app_id, full_name, phone, email, birth_date, address, passport_serial, passport_num, passport_issued,
             car_brand, car_model, car_year, car_mileage, contact_person, card_number,
             loan_amount, loan_months, status, reject_reason, approved_amount, approved_months, approved_rate,
             notes, created_at, disbursed_at, contract_signed, contract_signed_at) = row
            profile = {
                "birthDate": birth_date or "", "address": address or "",
                "passportSeries": passport_serial or "", "passportNumber": passport_num or "", "passportBy": passport_issued or "",
                "contactPerson": contact_person or "", "cardNumber": card_number or "",
                "carBrand": car_brand or "", "carModel": car_model or "", "carYear": car_year, "carMileage": car_mileage,
            }
            eff_amount = float(approved_amount) if approved_amount else float(loan_amount)
            eff_months = approved_months or loan_months
            eff_rate = float(approved_rate) if approved_rate else None
        else:
            cur.execute(f"""
                SELECT id, full_name, phone, email, birth_date, address, passport_series, passport_number, passport_date,
                       passport_by, snils, shop_name, item_name, item_price, contact_person, card_number,
                       file_passport, file_registration, file_selfie, file_snils,
                       loan_amount, loan_months, status, reject_reason, approved_amount, approved_months, approved_rate,
                       notes, created_at, disbursed_at, contract_signed, contract_signed_at
                FROM {SCHEMA}.{table} WHERE id = {item_id}
            """)
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
            (app_id, full_name, phone, email, birth_date, address, passport_series, passport_number, passport_date,
             passport_by, snils, shop_name, item_name, item_price, contact_person, card_number,
             file_passport, file_registration, file_selfie, file_snils,
             loan_amount, loan_months, status, reject_reason, approved_amount, approved_months, approved_rate,
             notes, created_at, disbursed_at, contract_signed, contract_signed_at) = row
            profile = {
                "birthDate": birth_date or "", "address": address or "",
                "passportSeries": passport_series or "", "passportNumber": passport_number or "",
                "passportDate": passport_date or "", "passportBy": passport_by or "", "snils": snils or "",
                "contactPerson": contact_person or "", "cardNumber": card_number or "",
                "shopName": shop_name or "", "itemName": item_name or "", "itemPrice": float(item_price) if item_price else None,
                "filePassport": file_passport or "", "fileRegistration": file_registration or "",
                "fileSelfie": file_selfie or "", "fileSnils": file_snils or "",
            }
            eff_amount = float(approved_amount) if approved_amount else float(loan_amount)
            eff_months = approved_months or loan_months
            eff_rate = float(approved_rate) if approved_rate else None

        schedule = []
        if eff_amount and eff_months and eff_rate:
            start = disbursed_at or created_at
            monthly_principal = eff_amount / int(eff_months)
            remaining = eff_amount
            for m in range(1, int(eff_months) + 1):
                interest_m = round(remaining * eff_rate / 100)
                payment_m = round(monthly_principal + interest_m)
                due = (start + timedelta(days=30 * m)).strftime("%d.%m.%Y") if start else None
                schedule.append({"month": m, "dueDate": due, "amount": payment_m, "principal": round(monthly_principal), "interest": interest_m})
                remaining -= monthly_principal
        total_due = sum(s["amount"] for s in schedule) if schedule else eff_amount

        cur.execute(f"SELECT amount, paid_at, note FROM {SCHEMA}.payments WHERE loan_type='{loan_type}' AND loan_id={app_id} ORDER BY paid_at DESC")
        payments = [{"amount": float(p[0]), "paidAt": msk(p[1]).strftime("%d.%m.%Y в %H:%M"), "note": p[2] or ""} for p in cur.fetchall()]
        paid_total = sum(p["amount"] for p in payments)

        cur.execute(f"SELECT amount, created_at FROM {SCHEMA}.loan_payment_notices WHERE loan_type = '{loan_type}' AND loan_id = {item_id} AND status = 'new' ORDER BY id DESC LIMIT 1")
        pn = cur.fetchone()
        pending_notice = {"amount": float(pn[0]), "createdAt": msk(pn[1]).strftime("%d.%m.%Y в %H:%M")} if pn else None
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "pendingNotice": pending_notice,
            "type": loan_type, "id": app_id,
            "fullName": full_name or "", "phone": phone, "email": email or "",
            "amount": float(loan_amount) if loan_amount else 0, "days": eff_months, "rate": eff_rate,
            "status": status, "rejectReason": reject_reason or "",
            "approvedAmount": float(approved_amount) if approved_amount else None,
            "approvedMonths": approved_months, "approvedRate": eff_rate, "notes": notes or "",
            "createdAt": msk(created_at).strftime("%d.%m.%Y в %H:%M") if created_at else "",
            "signed": bool(contract_signed), "signedAt": msk(contract_signed_at).strftime("%d.%m.%Y в %H:%M") if contract_signed_at else None,
            "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
            "totalDue": total_due, "paidTotal": paid_total, "remaining": max(0, total_due - paid_total),
            "schedule": schedule, "payments": payments, "profile": profile,
        }, ensure_ascii=False)}

    # --- ВНЕСТИ ПЛАТЁЖ (POST, sub='add_payment', loanType=loan|carloan|shoploan, loanId=...) ---
    if sub == "add_payment" and method == "POST":
        loan_type = (qs.get("loanType") or "").strip()
        loan_id = int(qs.get("loanId", 0) or 0)
        if loan_type not in ("loan", "carloan", "shoploan") or not loan_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректные параметры"})}

        amount = body.get("amount")
        note = (body.get("note") or "").replace("'", "''")
        if not amount or float(amount) <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму платежа"})}

        # Проверяем существование займа и получаем контакты клиента
        if loan_type == "loan":
            cur.execute(f"""
                SELECT u.phone, u.full_name, l.amount, l.days, l.rate
                FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id
                WHERE l.id = {loan_id}
            """)
        elif loan_type == "carloan":
            cur.execute(f"""
                SELECT phone, full_name, loan_amount, loan_months, approved_rate
                FROM {SCHEMA}.car_loan_applications WHERE id = {loan_id}
            """)
        else:
            cur.execute(f"""
                SELECT phone, full_name, loan_amount, loan_months, approved_rate
                FROM {SCHEMA}.shopping_loan_applications WHERE id = {loan_id}
            """)
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Займ не найден"})}

        phone_n, fname = row[0], row[1]
        note_sql = f"'{note}'" if note else "NULL"

        cur.execute(
            f"INSERT INTO {SCHEMA}.payments (loan_type, loan_id, amount, note) "
            f"VALUES ('{loan_type}', {loan_id}, {float(amount)}, {note_sql}) RETURNING id"
        )
        payment_id = cur.fetchone()[0]
        cur.execute(f"UPDATE {SCHEMA}.loan_payment_notices SET status = 'done', resolved_at = NOW() WHERE loan_type = '{loan_type}' AND loan_id = {loan_id} AND status = 'new'")

        # Автопогашение: если для обычного займа сумма всех платежей покрыла долг — переводим в статус "paid"
        became_paid = False
        if loan_type == "loan":
            loan_amount, loan_days, loan_rate = row[2], row[3], row[4]
            total_due = float(loan_amount) + round(float(loan_amount) * float(loan_rate) * loan_days)
            cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.payments WHERE loan_type='loan' AND loan_id={loan_id}")
            paid_total = float(cur.fetchone()[0])
            if paid_total >= total_due:
                cur.execute(f"SELECT status FROM {SCHEMA}.loans WHERE id={loan_id}")
                cur_status_row = cur.fetchone()
                if cur_status_row and cur_status_row[0] != "paid":
                    cur.execute(f"UPDATE {SCHEMA}.loans SET status = 'paid' WHERE id = {loan_id}")
                    became_paid = True

        conn.commit()
        cur.close(); conn.close()

        type_label = {"loan": "Займ", "carloan": "Автозайм", "shoploan": "Товарный займ"}[loan_type]
        tg(
            f"💰 <b>Внесён платёж — {type_label} #{loan_id}</b>\n"
            f"👤 {fname or phone_n} | 📞 {phone_n}\n"
            f"💵 Сумма: {int(float(amount)):,} ₽".replace(",", " ")
        )
        if became_paid:
            tg(
                f"✅ <b>Займ #{loan_id} полностью погашен!</b>\n"
                f"👤 {fname or phone_n} | 📞 {phone_n}"
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "paymentId": payment_id, "loanPaid": became_paid})}

    # --- ИСТОРИЯ ПЛАТЕЖЕЙ (GET, sub='payments', loanType=..., loanId=...) ---
    if sub == "payments" and method == "GET":
        loan_type = (qs.get("loanType") or "").strip()
        loan_id = int(qs.get("loanId", 0) or 0)
        if loan_type not in ("loan", "carloan", "shoploan") or not loan_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректные параметры"})}

        cur.execute(
            f"SELECT id, amount, paid_at, note FROM {SCHEMA}.payments "
            f"WHERE loan_type = '{loan_type}' AND loan_id = {loan_id} ORDER BY paid_at DESC"
        )
        items = [
            {"id": r[0], "amount": float(r[1]), "paidAt": msk(r[2]).strftime("%d.%m.%Y в %H:%M"), "note": r[3] or ""}
            for r in cur.fetchall()
        ]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"items": items}, ensure_ascii=False)}

    # --- ОБНОВИТЬ ДАННЫЕ КЛИЕНТА (POST, sub='user_update', userId=...) ---
    if sub == "user_update" and method == "POST":
        user_id = int(qs.get("userId", 0))
        if not user_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан userId"})}

        full_name = (body.get("fullName") or "").replace("'", "''")
        phone     = (body.get("phone") or "").replace("'", "''")
        email     = (body.get("email") or "").replace("'", "''")
        new_pass  = (body.get("password") or "").strip()

        sets = [f"full_name = '{full_name}'", f"phone = '{phone}'", f"email = '{email}'"]
        if new_pass:
            pw_hash = hashlib.sha256(new_pass.encode()).hexdigest()
            sets.append(f"password_hash = '{pw_hash}'")

        cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(sets)} WHERE id = {user_id}")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

    PROFILE_FIELDS = {
        "email": "email", "birthDate": "birth_date", "birthPlace": "birth_place",
        "passportSeries": "passport_series", "passportNumber": "passport_number",
        "passportDate": "passport_date", "passportCode": "passport_code", "passportBy": "passport_by",
        "snils": "snils", "workplace": "workplace", "position": "position", "workPhone": "work_phone",
        "contactPerson": "contact_person", "cardNumber": "card_number",
        "cardNumberTransfer": "card_number_transfer", "telegramId": "telegram_id",
    }

    # --- ПОЛНАЯ АНКЕТА КЛИЕНТА (GET, sub='client_profile', userId=...) ---
    if sub == "client_profile" and method == "GET":
        user_id = int(qs.get("userId", 0) or 0)
        cur.execute(f"SELECT full_name, phone, email FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        if not u:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент не найден"})}
        profile = {"fullName": u[0] or "", "phone": u[1] or "", "email": u[2] or "", "hasApplication": False}
        cols = ", ".join(PROFILE_FIELDS.values()) + ", salary, full_name, file_passport, file_registration, file_selfie, file_previous_passports"
        cur.execute(f"SELECT {cols} FROM {SCHEMA}.applications WHERE phone = '{(u[1] or '').replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1")
        a = cur.fetchone()
        cur.close(); conn.close()
        if a:
            profile["hasApplication"] = True
            for i, key in enumerate(PROFILE_FIELDS.keys()):
                if key != "email" or not profile["email"]:
                    profile[key] = a[i] or ""
            n = len(PROFILE_FIELDS)
            profile["salary"] = str(int(a[n])) if a[n] is not None and float(a[n]) == int(a[n]) else (str(a[n]) if a[n] is not None else "")
            if not profile["fullName"]:
                profile["fullName"] = a[n + 1] or ""
            profile["filePassport"] = a[n + 2] or ""
            profile["fileRegistration"] = a[n + 3] or ""
            profile["fileSelfie"] = a[n + 4] or ""
            profile["filePreviousPassports"] = a[n + 5] or ""
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(profile, ensure_ascii=False)}

    # --- СОХРАНИТЬ ПОЛНУЮ АНКЕТУ КЛИЕНТА (POST, sub='client_profile_update', userId=...) ---
    if sub == "client_profile_update" and method == "POST":
        user_id = int(qs.get("userId", 0) or 0)
        cur.execute(f"SELECT phone FROM {SCHEMA}.users WHERE id = {user_id}")
        u = cur.fetchone()
        if not u:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент не найден"})}
        old_phone = u[0] or ""

        def esc(v):
            return str(v if v is not None else "").strip().replace("'", "''")

        full_name = esc(body.get("fullName"))
        new_phone = esc(body.get("phone")) or old_phone.replace("'", "''")
        new_pass = (body.get("password") or "").strip()

        if new_phone != old_phone.replace("'", "''"):
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = '{new_phone}' AND id != {user_id}")
            if cur.fetchone():
                cur.close(); conn.close()
                return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Этот телефон уже занят другим клиентом"})}

        user_sets = [f"full_name = '{full_name}'", f"phone = '{new_phone}'", f"email = '{esc(body.get('email'))}'"]
        if new_pass:
            user_sets.append(f"password_hash = '{hashlib.sha256(new_pass.encode()).hexdigest()}'")
        cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(user_sets)} WHERE id = {user_id}")

        app_sets = [f"full_name = '{full_name}'", f"phone = '{new_phone}'"]
        for key, col in PROFILE_FIELDS.items():
            if key in body:
                app_sets.append(f"{col} = '{esc(body.get(key))}'")
        if "salary" in body:
            sal = str(body.get("salary") or "").replace(" ", "").replace(",", ".")
            try:
                app_sets.append(f"salary = {float(sal)}" if sal else "salary = NULL")
            except ValueError:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Зарплата должна быть числом"})}

        old_e = old_phone.replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{old_e}' ORDER BY created_at DESC LIMIT 1")
        latest = cur.fetchone()
        if latest:
            cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(app_sets)} WHERE id = '{latest[0]}'")
        if new_phone != old_e:
            cur.execute(f"UPDATE {SCHEMA}.applications SET phone = '{new_phone}' WHERE phone = '{old_e}'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "hasApplication": bool(latest)}, ensure_ascii=False)}

    # --- ЗАГРУЗИТЬ ДОКУМЕНТЫ КЛИЕНТА (POST, sub='docs_upload', userId=...) ---
    if sub == "docs_upload" and method == "POST":
        import base64, boto3
        user_id = int(qs.get("userId", 0))
        if not user_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан userId"})}

        cur.execute(f"SELECT phone FROM {SCHEMA}.users WHERE id = {user_id}")
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент не найден"})}
        phone = row[0]

        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1")
        app_row = cur.fetchone()
        if not app_row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        app_id = app_row[0]

        s3 = boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])
        access_key = os.environ["AWS_ACCESS_KEY_ID"]
        now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        phone_clean = phone.replace("+", "")

        FILE_MAP = {
            "passportMain":      ("file_passport",          "passport_main"),
            "registration":      ("file_registration",      "registration"),
            "selfie":            ("file_selfie",            "selfie"),
            "previousPassports": ("file_previous_passports","previous_passports"),
        }
        sets = []
        for key, (col, suffix) in FILE_MAP.items():
            b64 = body.get(key, "")
            if not b64:
                continue
            file_data = base64.b64decode(b64)
            s3_key = f"applications/{now_ts}_{phone_clean}_{suffix}.webp"
            s3.put_object(Bucket="files", Key=s3_key, Body=file_data, ContentType="image/webp")
            url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{s3_key}"
            col_e = url.replace("'", "''")
            sets.append(f"{col} = '{col_e}'")

        if sets:
            cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(sets)} WHERE id = {app_id}")
            conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОБНОВИТЬ ПОЛЯ СБ ЗАЯВКИ (POST, sub='app_update', appId=...) ---
    if sub == "app_update" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        workplace     = (body.get("workplace") or "").replace("'", "''")
        position      = (body.get("position") or "").replace("'", "''")
        active_loans  = (body.get("activeLoans") or "").replace("'", "''")
        salary_raw    = body.get("salary")
        salary        = float(salary_raw) if salary_raw not in (None, "", "0") else None
        contact_person = (body.get("contactPerson") or "").replace("'", "''")
        sb_score      = (body.get("sbScore") or "").replace("'", "''")
        card_number   = (body.get("cardNumber") or "").replace("'", "''")

        salary_sql = str(salary) if salary is not None else "NULL"
        cur.execute(f"""
            UPDATE {SCHEMA}.applications SET
                workplace = '{workplace}',
                position = '{position}',
                active_loans = '{active_loans}',
                salary = {salary_sql},
                contact_person = '{contact_person}',
                sb_score = '{sb_score}',
                card_number = '{card_number}'
            WHERE id = '{app_id_e}'
        """)
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ВЫДАТЬ ВИРТУАЛЬНУЮ КАРТУ РУСФИНАНС 24 (POST, sub='issue_card', appId=... ИЛИ phone=...) ---
    if sub == "issue_card" and method == "POST":
        import random, string
        app_id = qs.get("appId", "")
        phone_q = (qs.get("phone") or "").strip()
        card_limit = float(body.get("limit", 0))
        card_rate = float(body.get("rate", 0))
        card_days = int(body.get("days", 0) or 0)

        if not card_limit or not card_rate:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите лимит и ставку"})}

        if app_id:
            app_id_e = str(app_id).replace("'", "''")
            cur.execute(f"SELECT id, full_name, phone FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        elif phone_q:
            phone_e = phone_q.replace("'", "''")
            cur.execute(f"SELECT id, full_name, phone FROM {SCHEMA}.applications WHERE phone='{phone_e}' ORDER BY created_at DESC LIMIT 1")
        else:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан клиент"})}
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент не найден"})}

        real_app_id, full_name, phone = app
        app_id_e = str(real_app_id)
        app_id = real_app_id

        # Генерация данных карты
        card_number = "4276 " + " ".join("".join([str(random.randint(0,9)) for _ in range(4)]) for _ in range(3))
        now_dt = datetime.now()
        expiry_month = str(now_dt.month).zfill(2)
        expiry_year = str((now_dt.year + 3) % 100).zfill(2)
        expiry = f"{expiry_month}/{expiry_year}"
        cvv = "".join([str(random.randint(0,9)) for _ in range(3)])
        holder = (full_name or "CARD HOLDER").upper()[:26]
        days_sql = card_days if card_days else "NULL"

        cur.execute(f"""
            UPDATE {SCHEMA}.applications SET
                virtual_card_number = '{card_number}',
                virtual_card_expiry = '{expiry}',
                virtual_card_cvv = '{cvv}',
                virtual_card_holder = '{holder.replace("'","''")}',
                virtual_card_limit = {card_limit},
                virtual_card_rate = {card_rate},
                virtual_card_days = {days_sql},
                virtual_card_status = 'pending',
                virtual_card_issued_at = NOW()
            WHERE id = '{app_id_e}'
        """)
        cur.execute(
            f"UPDATE {SCHEMA}.card_requests SET status='approved', reviewed_at=NOW() "
            f"WHERE phone='{str(phone).replace(chr(39), chr(39)*2)}' AND status='pending'"
        )
        conn.commit()

        tg(
            f"💳 <b>Виртуальная карта РУСФИНАНС 24 выдана</b>\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Лимит:</b> {int(card_limit):,} ₽\n".replace(",", " ") +
            f"📈 <b>Ставка:</b> {card_rate}%/день\n" +
            (f"📅 <b>Срок:</b> {card_days} дн.\n" if card_days else "") +
            f"🔖 <b>Заявка №:</b> {app_id}"
        )
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПОДТВЕРДИТЬ/АКТИВИРОВАТЬ КАРТУ (POST, sub='activate_card', appId=...) ---
    if sub == "activate_card" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, phone, virtual_card_status FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, vc_status = app
        if vc_status not in ("pending", "active"):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Карта не выдана или уже активна"})}
        cur.execute(f"UPDATE {SCHEMA}.applications SET virtual_card_status='active', virtual_card_signed_at=COALESCE(virtual_card_signed_at, NOW()) WHERE id='{app_id_e}'")
        conn.commit()
        tg(f"✅ <b>Карта РУСФИНАНС 24 активирована</b>\n\n👤 {full_name or phone}\n📞 {phone}")
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- РЕДАКТИРОВАТЬ УСЛОВИЯ УЖЕ ВЫДАННОЙ КАРТЫ (POST, sub='edit_card', appId=..., body: {limit, rate, days}) ---
    if sub == "edit_card" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, phone, virtual_card_number FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        app = cur.fetchone()
        if not app or not app[2]:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Карта не найдена"})}
        full_name, phone, _ = app
        set_parts = []
        if body.get("limit") is not None and body.get("limit") != "":
            set_parts.append(f"virtual_card_limit={float(body['limit'])}")
        if body.get("rate") is not None and body.get("rate") != "":
            set_parts.append(f"virtual_card_rate={float(body['rate'])}")
        if body.get("days") is not None and body.get("days") != "":
            set_parts.append(f"virtual_card_days={int(body['days'])}")
        if not set_parts:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нечего обновлять"})}
        cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(set_parts)} WHERE id='{app_id_e}'")
        conn.commit(); cur.close(); conn.close()
        tg(f"✏️ <b>Условия карты РУСФИНАНС 24 изменены</b>\n\n👤 {full_name or phone}\n📞 {phone}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- УВЕЛИЧИТЬ ЛИМИТ ВЫДАННОЙ КАРТЫ (POST, sub='increase_limit', appId=..., body: {amount}) ---
    if sub == "increase_limit" and method == "POST":
        app_id_e = str(qs.get("appId", "")).replace("'", "''")
        try:
            add_amount = float(body.get("amount", 0))
        except Exception:
            add_amount = 0
        if add_amount <= 0 or add_amount > 10000000:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму увеличения больше нуля"})}
        cur.execute(
            f"SELECT id, full_name, phone, virtual_card_limit, virtual_card_status FROM {SCHEMA}.applications "
            f"WHERE id='{app_id_e}' AND virtual_card_number IS NOT NULL"
        )
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Карта не найдена"})}
        inc_app_id, full_name, phone, old_limit, vc_status = app
        old_limit = float(old_limit or 0)
        new_limit = old_limit + add_amount
        cur.execute(f"UPDATE {SCHEMA}.applications SET virtual_card_limit = {new_limit} WHERE id = {inc_app_id}")
        cur.execute(
            f"INSERT INTO {SCHEMA}.card_limit_increases (application_id, old_limit, new_limit, added_amount) "
            f"VALUES ({inc_app_id}, {old_limit}, {new_limit}, {add_amount})"
        )
        conn.commit(); cur.close(); conn.close()
        tg(f"📈 <b>Лимит карты РУСФИНАНС 24 увеличен</b>\n\n👤 {full_name or phone}\n📞 {phone}\n"
           f"Было: {int(old_limit):,} ₽ → стало: {int(new_limit):,} ₽ (+{int(add_amount):,} ₽)".replace(",", " "))
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "limit": new_limit})}

    # --- УМЕНЬШИТЬ ЛИМИТ ВЫДАННОЙ КАРТЫ (POST, sub='decrease_limit', appId=..., body: {amount}) ---
    if sub == "decrease_limit" and method == "POST":
        app_id_e = str(qs.get("appId", "")).replace("'", "''")
        try:
            sub_amount = float(body.get("amount", 0))
        except Exception:
            sub_amount = 0
        if sub_amount <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму уменьшения больше нуля"})}
        cur.execute(
            f"SELECT id, full_name, phone, virtual_card_limit FROM {SCHEMA}.applications "
            f"WHERE id='{app_id_e}' AND virtual_card_number IS NOT NULL"
        )
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Карта не найдена"})}
        dec_app_id, full_name, phone, old_limit = app
        old_limit = float(old_limit or 0)
        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_transactions WHERE application_id = {dec_app_id} AND status <> 'cancelled'")
        principal_sum = float(cur.fetchone()[0])
        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {dec_app_id}")
        repaid_sum = float(cur.fetchone()[0])
        used_sum = max(0.0, principal_sum - repaid_sum)
        new_limit = old_limit - sub_amount
        if new_limit <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Лимит не может быть нулевым. Для остановки карты используйте блокировку"})}
        if new_limit < used_sum:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({
                "error": f"Нельзя опустить лимит ниже уже использованной суммы ({int(used_sum):,} ₽). Минимальный лимит: {int(used_sum):,} ₽".replace(",", " ")})}
        cur.execute(f"UPDATE {SCHEMA}.applications SET virtual_card_limit = {new_limit} WHERE id = {dec_app_id}")
        cur.execute(
            f"INSERT INTO {SCHEMA}.card_limit_increases (application_id, old_limit, new_limit, added_amount, seen, seen_at) "
            f"VALUES ({dec_app_id}, {old_limit}, {new_limit}, {-sub_amount}, TRUE, NOW())"
        )
        conn.commit(); cur.close(); conn.close()
        tg(f"📉 <b>Лимит карты РУСФИНАНС 24 уменьшен</b>\n\n👤 {full_name or phone}\n📞 {phone}\n"
           f"Было: {int(old_limit):,} ₽ → стало: {int(new_limit):,} ₽ (−{int(sub_amount):,} ₽)".replace(",", " "))
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "limit": new_limit})}

    # --- ЗАБЛОКИРОВАТЬ/РАЗБЛОКИРОВАТЬ КАРТУ (POST, sub='card_status', appId=..., body: {status: active|blocked}) ---
    if sub == "card_status" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        new_status = (body.get("status") or "").strip()
        if new_status not in ("active", "blocked"):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректный статус"})}
        cur.execute(f"SELECT full_name, phone FROM {SCHEMA}.applications WHERE id='{app_id_e}' AND virtual_card_number IS NOT NULL")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Карта не найдена"})}
        full_name, phone = app
        cur.execute(f"UPDATE {SCHEMA}.applications SET virtual_card_status='{new_status}' WHERE id='{app_id_e}'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- СПИСОК ЗАЯВОК НА КАРТУ ОТ КЛИЕНТОВ (GET, sub='card_requests') ---
    if sub == "card_requests" and method == "GET":
        status_f = (qs.get("status") or "pending").strip()
        status_e = status_f.replace("'", "''")
        where_r = "" if status_f == "all" else f"WHERE cr.status = '{status_e}'"
        cur.execute(f"""
            SELECT cr.id, cr.phone, cr.full_name, cr.status, cr.reject_reason, cr.created_at, cr.reviewed_at,
                   a.id AS app_id, a.virtual_card_status, a.virtual_card_limit,
                   (SELECT u.id FROM {SCHEMA}.users u WHERE u.phone = cr.phone LIMIT 1) AS user_id, a.amount
            FROM {SCHEMA}.card_requests cr
            LEFT JOIN LATERAL (
                SELECT id, virtual_card_status, virtual_card_limit, amount FROM {SCHEMA}.applications
                WHERE phone = cr.phone ORDER BY created_at DESC LIMIT 1
            ) a ON true
            {where_r} ORDER BY cr.created_at DESC
        """)
        items = [{
            "id": r[0], "phone": r[1], "fullName": r[2] or "",
            "status": r[3], "rejectReason": r[4] or "",
            "createdAt": msk(r[5]).strftime("%d.%m.%Y в %H:%M"),
            "reviewedAt": msk(r[6]).strftime("%d.%m.%Y в %H:%M") if r[6] else None,
            "appId": r[7], "cardStatus": r[8] or "none",
            "cardLimit": float(r[9]) if r[9] else None,
            "userId": r[10],
            "requestedLimit": float(r[11]) if r[11] else None,
        } for r in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"requests": items}, ensure_ascii=False)}

    # --- ОТКЛОНИТЬ ЗАЯВКУ НА КАРТУ (POST, sub='card_request_reject', id=..., body: {reason}) ---
    if sub == "card_request_reject" and method == "POST":
        req_id = qs.get("id", "")
        req_id_e = str(req_id).replace("'", "''")
        reason = (body.get("reason") or "").replace("'", "''")
        cur.execute(f"SELECT phone, full_name FROM {SCHEMA}.card_requests WHERE id='{req_id_e}'")
        r = cur.fetchone()
        if not r:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        phone_r, fname_r = r
        cur.execute(
            f"UPDATE {SCHEMA}.card_requests SET status='rejected', reject_reason='{reason}', reviewed_at=NOW() WHERE id='{req_id_e}'"
        )
        conn.commit(); cur.close(); conn.close()
        tg(f"❌ <b>Заявка на карту отклонена</b>\n\n👤 {fname_r or phone_r}\n📞 {phone_r}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ОДОБРИТЬ ЗАЯВКУ НА КАРТУ БЕЗ ВЫДАЧИ (POST, sub='card_request_approve', id=...) — помечает как одобренную, карту выдаём отдельно через issue_card ---
    if sub == "card_request_approve" and method == "POST":
        req_id = qs.get("id", "")
        req_id_e = str(req_id).replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.card_requests SET status='approved', reviewed_at=NOW() WHERE id='{req_id_e}'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ИСТОРИЯ ПЕРЕВОДОВ (ТРАНЗАКЦИЙ) ПО КАРТЕ (GET, sub='card_transactions', appId=...) ---
    if sub == "card_transactions" and method == "GET":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(
            f"SELECT id, amount, weeks, rate, status, created_at FROM {SCHEMA}.card_transactions "
            f"WHERE application_id = '{app_id_e}' ORDER BY created_at DESC"
        )
        items = [{
            "id": r[0], "amount": float(r[1]), "weeks": r[2], "rate": float(r[3]),
            "status": r[4], "createdAt": msk(r[5]).strftime("%d.%m.%Y в %H:%M"),
            "total": round(float(r[1]) * (1 + float(r[3]) / 100 * r[2])),
        } for r in cur.fetchall()]
        cur.execute(f"SELECT virtual_card_issued_at FROM {SCHEMA}.applications WHERE id = '{app_id_e}'")
        issued_row = cur.fetchone()
        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = '{app_id_e}'")
        repaid_sum = float(cur.fetchone()[0])
        cur.execute(f"SELECT COALESCE(tx_id,0), due_date FROM {SCHEMA}.card_payment_notices WHERE application_id = '{app_id_e}' AND status = 'done'")
        paid_keys = [f"{r_[0]}|{r_[1]}" for r_ in cur.fetchall()]
        cur.close(); conn.close()
        debt = max(0, sum(i["total"] for i in items if i["status"] != "cancelled") - repaid_sum)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "transactions": items, "debt": debt, "paidNotices": paid_keys,
            "minPaymentPercent": CARD_MIN_PAYMENT_PERCENT,
            "minPayment": round(debt * CARD_MIN_PAYMENT_PERCENT / 100),
            "paymentSchedule": card_payment_schedule(issued_row[0] if issued_row else None, debt),
        }, ensure_ascii=False)}

    # --- ВСЕ ВЫДАННЫЕ КАРТЫ С ПЕРЕВОДАМИ (GET, sub='cards') ---
    if sub == "cards" and method == "GET":
        cur.execute(f"""
            SELECT id, full_name, phone, card_number, virtual_card_number, virtual_card_status, virtual_card_limit,
                   virtual_card_rate, virtual_card_days, virtual_card_issued_at, virtual_card_signed_at
            FROM {SCHEMA}.applications
            WHERE virtual_card_number IS NOT NULL AND virtual_card_number <> ''
            ORDER BY virtual_card_issued_at DESC NULLS LAST
        """)
        card_rows = cur.fetchall()
        ids = [str(r[0]) for r in card_rows]
        txs: dict = {}
        reps: dict = {}
        if ids:
            cur.execute(f"""
                SELECT id, application_id, amount, weeks, rate, status, created_at, disbursed_amount, disbursed_at, target_card
                FROM {SCHEMA}.card_transactions WHERE application_id IN ({','.join(ids)}) ORDER BY created_at DESC
            """)
            for t in cur.fetchall():
                txs.setdefault(t[1], []).append(t)
            cur.execute(f"SELECT id, application_id, amount, note, created_at FROM {SCHEMA}.card_repayments WHERE application_id IN ({','.join(ids)}) ORDER BY created_at DESC")
            for rp in cur.fetchall():
                reps.setdefault(rp[1], []).append(rp)
        limit_hist: dict = {}
        if ids:
            cur.execute(f"SELECT id, application_id, old_limit, new_limit, added_amount, created_at, seen FROM {SCHEMA}.card_limit_increases WHERE application_id IN ({','.join(ids)}) ORDER BY created_at DESC")
            for h in cur.fetchall():
                limit_hist.setdefault(h[1], []).append(h)
        notices: dict = {}
        if ids:
            cur.execute(f"SELECT id, application_id, amount, due_date, created_at, tx_id, status, resolved_at FROM {SCHEMA}.card_payment_notices WHERE application_id IN ({','.join(ids)}) ORDER BY created_at DESC")
            for n in cur.fetchall():
                notices.setdefault(n[1], []).append(n)
        cur.close(); conn.close()

        cards = []
        for (app_id, full_name, phone, client_card, vc_number, vc_status, vc_limit, vc_rate, vc_days, issued_at, signed_at) in card_rows:
            limit_v = float(vc_limit or 0)
            tx_list = []
            principal = 0.0
            gross = 0.0
            for (tx_id, _a, tx_amount, tx_weeks, tx_rate, tx_status, tx_created, tx_disb, tx_disb_at, tx_target) in txs.get(app_id, []):
                tx_amount = float(tx_amount); tx_rate = float(tx_rate)
                tx_total = round(tx_amount * (1 + tx_rate / 100 * tx_weeks))
                weekly = round(tx_total / tx_weeks) if tx_weeks else 0
                if tx_status != "cancelled":
                    principal += tx_amount
                    gross += tx_total
                tx_list.append({
                    "id": tx_id, "amount": tx_amount, "weeks": tx_weeks, "rate": tx_rate, "status": tx_status,
                    "createdAt": msk(tx_created).strftime("%d.%m.%Y в %H:%M"), "total": tx_total,
                    "disbursedAmount": float(tx_disb or 0),
                    "disbursedAt": msk(tx_disb_at).strftime("%d.%m.%Y в %H:%M") if tx_disb_at else None,
                    "targetCard": tx_target or "",
                    "schedule": [{"week": w, "dueDate": (msk(tx_created) + timedelta(weeks=w)).strftime("%d.%m.%Y"), "amount": weekly}
                                 for w in range(1, (tx_weeks or 0) + 1)],
                })
            repaid = sum(float(x[2]) for x in reps.get(app_id, []))
            debt = max(0.0, gross - repaid)
            used = max(0.0, principal - repaid)
            cards.append({
                "appId": app_id, "fullName": full_name or "", "phone": phone or "", "clientCard": client_card or "",
                "cardNumber": vc_number or "", "status": vc_status or "none",
                "limit": limit_v, "rate": float(vc_rate or 0), "days": vc_days,
                "issuedAt": msk(issued_at).strftime("%d.%m.%Y в %H:%M") if issued_at else None,
                "signedAt": msk(signed_at).strftime("%d.%m.%Y в %H:%M") if signed_at else None,
                "used": used, "available": max(0.0, limit_v - used),
                "debt": debt, "repaid": repaid,
                "minPaymentPercent": CARD_MIN_PAYMENT_PERCENT, "minPayment": round(debt * CARD_MIN_PAYMENT_PERCENT / 100),
                "paymentSchedule": card_payment_schedule(issued_at, debt) if debt > 0 else [],
                "transactions": tx_list,
                "notices": [{"id": n[0], "amount": float(n[2]), "dueDate": n[3], "createdAt": msk(n[4]).strftime("%d.%m.%Y в %H:%M"), "txId": n[5]} for n in notices.get(app_id, []) if n[6] == "new"],
                "limitHistory": [{"id": h[0], "oldLimit": float(h[2]), "newLimit": float(h[3]), "added": float(h[4]), "createdAt": msk(h[5]).strftime("%d.%m.%Y в %H:%M"), "seen": bool(h[6])} for h in limit_hist.get(app_id, [])],
                "paidRows": [{"key": f"{n[5] or 0}|{n[3]}", "amount": float(n[2]), "paidAt": msk(n[7]).strftime("%d.%m.%Y в %H:%M") if n[7] else None} for n in notices.get(app_id, []) if n[6] == "done"],
                "repayments": [{"id": x[0], "amount": float(x[2]), "note": x[3] or "", "createdAt": msk(x[4]).strftime("%d.%m.%Y в %H:%M")} for x in reps.get(app_id, [])],
            })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"cards": cards}, ensure_ascii=False)}

    # --- ПЕРЕЧИСЛИТЬ ДЕНЬГИ КЛИЕНТУ ПО ПЕРЕВОДУ С КАРТЫ (POST, sub='card_disburse', txId=..., body: {amount}) ---
    if sub == "card_disburse" and method == "POST":
        tx_id = int(qs.get("txId", 0) or 0)
        try:
            add = float(body.get("amount") or 0)
        except (TypeError, ValueError):
            add = 0
        if not tx_id or add <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму перевода больше нуля"})}
        cur.execute(f"""
            SELECT t.amount, t.disbursed_amount, t.status, t.application_id, t.target_card, a.full_name, a.phone
            FROM {SCHEMA}.card_transactions t JOIN {SCHEMA}.applications a ON a.id = t.application_id WHERE t.id = {tx_id}
        """)
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Перевод не найден"})}
        tx_amount, already, tx_status, app_id, target, full_name, phone = row
        left = float(tx_amount) - float(already or 0)
        if tx_status == "cancelled":
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Перевод отменён"})}
        if add > left:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Можно перечислить не больше {int(left)} ₽ (остаток по запросу клиента)"})}
        cur.execute(f"UPDATE {SCHEMA}.card_transactions SET disbursed_amount = COALESCE(disbursed_amount,0) + {add}, disbursed_at = NOW() WHERE id = {tx_id}")
        conn.commit(); cur.close(); conn.close()
        tg(
            f"💸 <b>Деньги перечислены с карты РУСФИНАНС 24</b>\n\n"
            f"👤 {full_name or phone}\n📞 {phone}\n"
            f"💳 На карту: {target or '—'}\n"
            f"💵 Сумма: {int(add):,} ₽\n".replace(",", " ") +
            f"🔖 Перевод №{tx_id}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "disbursed": float(already or 0) + add, "left": left - add})}

    # --- ПОГАСИТЬ ДОЛГ ПО КАРТЕ НА УКАЗАННУЮ СУММУ (POST, sub='card_repay', appId=..., body: {amount, note}) ---
    if sub == "card_repay" and method == "POST":
        app_id = int(qs.get("appId", 0) or 0)
        try:
            amt = float(body.get("amount") or 0)
        except (TypeError, ValueError):
            amt = 0
        note = (body.get("note") or "").strip().replace("'", "''")
        if not app_id or amt <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму погашения больше нуля"})}
        cur.execute(f"SELECT full_name, phone FROM {SCHEMA}.applications WHERE id = {app_id} AND virtual_card_number IS NOT NULL")
        a = cur.fetchone()
        if not a:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Карта не найдена"})}
        cur.execute(f"SELECT amount, weeks, rate FROM {SCHEMA}.card_transactions WHERE application_id = {app_id} AND status != 'cancelled'")
        gross = sum(round(float(x[0]) * (1 + float(x[2]) / 100 * x[1])) for x in cur.fetchall())
        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {app_id}")
        debt = max(0.0, gross - float(cur.fetchone()[0]))
        if debt <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Долга по карте нет"})}
        if amt > debt:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Сумма больше долга ({int(debt)} ₽)"})}
        note_sql = f"'{note}'" if note else "NULL"
        cur.execute(f"INSERT INTO {SCHEMA}.card_repayments (application_id, amount, note) VALUES ({app_id}, {amt}, {note_sql})")
        try:
            notice_id = int(body.get("noticeId") or 0)
        except (TypeError, ValueError):
            notice_id = 0
        if notice_id:
            cur.execute(f"UPDATE {SCHEMA}.card_payment_notices SET status = 'done', resolved_at = NOW() WHERE id = {notice_id} AND application_id = {app_id}")
        conn.commit(); cur.close(); conn.close()
        tg(
            f"✅ <b>Погашение по карте РУСФИНАНС 24</b>\n\n"
            f"👤 {a[0] or a[1]}\n📞 {a[1]}\n"
            f"💵 Сумма: {int(amt):,} ₽\n".replace(",", " ") +
            f"📌 Остаток долга: {int(debt - amt):,} ₽".replace(",", " ")
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "debt": debt - amt})}

    # --- ЧИСЛО НОВЫХ СООБЩЕНИЙ ОБ ОПЛАТЕ ПО КАРТАМ (GET, sub='card_notices_count') ---
    if sub == "card_notices_count" and method == "GET":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.card_payment_notices WHERE status = 'new'")
        cnt = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(DISTINCT (loan_type, loan_id)) FROM {SCHEMA}.loan_payment_notices WHERE status = 'new'")
        loan_cnt = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.applications WHERE status = 'pending' AND COALESCE(is_card_request, FALSE) = FALSE")
        apps_wait = cur.fetchone()[0]
        cur.execute(f"""
            SELECT COUNT(*) FROM {SCHEMA}.applications a
            JOIN LATERAL (
                SELECT lo.signed, lo.disbursed_at FROM {SCHEMA}.loans lo
                JOIN {SCHEMA}.users u ON u.id = lo.user_id
                WHERE u.phone = a.phone ORDER BY lo.created_at DESC LIMIT 1
            ) l ON true
            WHERE a.status IN ('approved','partner_card') AND l.signed = TRUE AND l.disbursed_at IS NULL
        """)
        apps_wait += cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.car_loan_applications WHERE status = 'pending' OR (status = 'approved' AND contract_signed = TRUE AND disbursed_at IS NULL)")
        car_wait = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.shopping_loan_applications WHERE status = 'pending' OR (status = 'approved' AND contract_signed = TRUE AND disbursed_at IS NULL)")
        shop_wait = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.card_requests WHERE status = 'pending'")
        card_req_wait = cur.fetchone()[0]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "count": int(cnt), "loanCount": int(loan_cnt),
            "appsWaiting": int(apps_wait), "carWaiting": int(car_wait),
            "shopWaiting": int(shop_wait), "cardRequestsWaiting": int(card_req_wait),
        })}

    # --- ОТМЕТИТЬ СООБЩЕНИЕ ОБ ОПЛАТЕ ПРОВЕРЕННЫМ (POST, sub='card_notice_done', noticeId=...) ---
    if sub == "card_notice_done" and method == "POST":
        nid = int(qs.get("noticeId", 0) or 0)
        if not nid:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указано сообщение"})}
        cur.execute(f"UPDATE {SCHEMA}.card_payment_notices SET status = 'done', resolved_at = NOW() WHERE id = {nid}")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ЗАЙМ: ПРОВЕРЕНО (POST, sub='loan_notice_done', type=..., id=...) ---
    if sub == "loan_notice_done" and method == "POST":
        ln_type = (qs.get("type") or "").strip()
        try:
            ln_id = int(qs.get("id", 0) or 0)
        except Exception:
            ln_id = 0
        if ln_type not in ("loan", "carloan", "shoploan") or not ln_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректные параметры"})}
        cur.execute(f"UPDATE {SCHEMA}.loan_payment_notices SET status = 'done', resolved_at = NOW() WHERE loan_type = '{ln_type}' AND loan_id = {ln_id} AND status = 'new'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- УДАЛИТЬ АНКЕТУ КЛИЕНТА (POST, sub='delete_application', appId=...) ---
    if sub == "delete_application" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, phone FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone = app
        cur.execute(f"DELETE FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        conn.commit()
        tg(f"🗑 <b>Анкета удалена</b>\n\n👤 {full_name or phone}\n📞 {phone}\n🔖 Заявка №{app_id}")
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ЗАБЛОКИРОВАТЬ КЛИЕНТА (POST, sub='block_client', phone=..., body: {days}) ---
    if sub == "block_client" and method == "POST":
        phone_q = (qs.get("phone") or "").replace("'", "''")
        days = int(body.get("days", 0) or 0)
        if not phone_q or not days:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите телефон и срок блокировки"})}
        cur.execute(f"SELECT id, full_name FROM {SCHEMA}.users WHERE phone = '{phone_q}'")
        u = cur.fetchone()
        if not u:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент не найден"})}
        cur.execute(f"UPDATE {SCHEMA}.users SET blocked_until = NOW() + INTERVAL '{days} days' WHERE id = {u[0]}")
        conn.commit(); cur.close(); conn.close()
        tg(f"🚫 <b>Клиент заблокирован на {days} дн.</b>\n\n👤 {u[1] or phone_q}\n📞 {phone_q}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- РАЗБЛОКИРОВАТЬ КЛИЕНТА (POST, sub='unblock_client', phone=...) ---
    if sub == "unblock_client" and method == "POST":
        phone_q = (qs.get("phone") or "").replace("'", "''")
        if not phone_q:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите телефон"})}
        cur.execute(f"UPDATE {SCHEMA}.users SET blocked_until = NULL WHERE phone = '{phone_q}'")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ЗАПРОСИТЬ ВИДЕОЗВОНОК (POST, sub='request_video_call', appId=...) ---
    if sub == "request_video_call" and method == "POST":
        app_id = qs.get("appId", "")
        app_id_e = str(app_id).replace("'", "''")
        cur.execute(f"SELECT full_name, phone, telegram_id FROM {SCHEMA}.applications WHERE id='{app_id_e}'")
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}
        full_name, phone, tg_username = app
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET video_call_requested=TRUE, video_call_requested_at=NOW() "
            f"WHERE id='{app_id_e}'"
        )
        conn.commit(); cur.close(); conn.close()
        if tg_username:
            tg_client(tg_username, "📹 <b>Ожидайте видеозвонка</b>\n\nНаш специалист свяжется с вами для видеоверификации в ближайшее время. Пожалуйста, будьте на связи.")
        tg(f"📹 <b>Запрошен видеозвонок</b>\n\n👤 {full_name or phone}\n📞 {phone}\n🔖 Заявка №{app_id}")
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.close(); conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Маршрут не найден"})}
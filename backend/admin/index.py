"""Панель администратора: вход, список клиентов, добавление/редактирование займов."""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import urllib.request
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"


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
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def check_admin_token(cur, token: str) -> bool:
    cur.execute(
        f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = %s AND expires_at > NOW()",
        (token,)
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

    headers_in = event.get("headers") or {}
    raw_token = headers_in.get("Authorization") or headers_in.get("X-Authorization") or ""
    token = raw_token.replace("Bearer ", "").strip()

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
        expires_at = datetime.now() + timedelta(hours=12)
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_sessions (token, expires_at) VALUES (%s, %s)",
            (tok, expires_at)
        )
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": tok})}

    # --- ПРОВЕРКА ТОКЕНА ---
    if not check_admin_token(cur, token):
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
        user_id = qs.get("userId")
        cur.execute(
            f"SELECT id, amount, days, rate, status, created_at FROM {SCHEMA}.loans WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,)
        )
        rows = cur.fetchall()
        cur.execute(f"SELECT phone, full_name FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        u = cur.fetchone()
        cur.close(); conn.close()
        loans = [{"id": r[0], "amount": float(r[1]), "days": r[2], "rate": float(r[3]),
                  "ratePercent": round(float(r[3]) * 100, 1), "status": r[4],
                  "createdAt": r[5].strftime("%d.%m.%Y")} for r in rows]
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

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Клиент с таким номером не найден"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status) VALUES (%s, %s, %s, %s, 'active') RETURNING id",
            (user[0], amount, days, rate)
        )
        loan_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        interest = round(amount * rate * days)
        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
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
        cur.execute(
            f"SELECT l.amount, u.phone FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id WHERE l.id = %s",
            (loan_id,)
        )
        row = cur.fetchone()
        cur.execute(f"UPDATE {SCHEMA}.loans SET status = %s WHERE id = %s", (status, loan_id))
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

    # --- ЗАРЕГИСТРИРОВАТЬ КЛИЕНТА (POST, sub='register') ---
    if sub == "register" and method == "POST":
        phone     = (body.get("phone") or "").strip()
        full_name = (body.get("fullName") or "").strip()
        password  = (body.get("password") or "").strip()

        if not phone or not password:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Телефон и пароль обязательны"})}

        pw_hash = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Клиент уже зарегистрирован"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id",
            (phone, pw_hash, full_name)
        )
        uid = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"👤 <b>Новый клиент зарегистрирован</b>\n"
            f"⏱ {now}\n\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"🙍 <b>ФИО:</b> {full_name or '—'}"
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "userId": uid})}

    # --- СПИСОК ЗАЯВОК (GET, sub='applications') ---
    if sub == "applications" and method == "GET":
        status_filter = qs.get("status", "pending")
        cur.execute(
            f"""SELECT id, full_name, phone, email, amount, days, birth_date,
                       passport_series, passport_number, status, created_at, reject_reason
                FROM {SCHEMA}.applications
                WHERE status = %s ORDER BY created_at DESC""",
            (status_filter,)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        apps = [{
            "id": r[0], "fullName": r[1] or "", "phone": r[2], "email": r[3] or "",
            "amount": float(r[4]) if r[4] else 0, "days": r[5] or 0,
            "birthDate": r[6] or "", "passportSeries": r[7] or "",
            "passportNumber": r[8] or "", "status": r[9],
            "createdAt": r[10].strftime("%d.%m.%Y в %H:%M"), "rejectReason": r[11] or ""
        } for r in rows]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"applications": apps}, ensure_ascii=False)}

    # --- ОДОБРИТЬ ЗАЯВКУ (POST, sub='approve', appId=...) ---
    if sub == "approve" and method == "POST":
        app_id = qs.get("appId")
        rate = float(body.get("rate", 0.008))

        cur.execute(
            f"SELECT full_name, phone, amount, days, telegram_id FROM {SCHEMA}.applications WHERE id = %s AND status = 'pending'",
            (app_id,)
        )
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или уже обработана"})}

        full_name, phone, amount, days, tg_username = app

        # Находим или создаём пользователя
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        user = cur.fetchone()
        if not user:
            import secrets as _s, hashlib as _h
            tmp_pw = _h.sha256(_s.token_hex(16).encode()).hexdigest()
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (phone, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id",
                (phone, tmp_pw, full_name)
            )
            user_id = cur.fetchone()[0]
        else:
            user_id = user[0]

        # Создаём займ
        cur.execute(
            f"INSERT INTO {SCHEMA}.loans (user_id, amount, days, rate, status) VALUES (%s,%s,%s,%s,'active') RETURNING id",
            (user_id, amount, days, rate)
        )
        loan_id = cur.fetchone()[0]

        # Обновляем статус заявки
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET status='approved', reviewed_at=NOW() WHERE id=%s",
            (app_id,)
        )
        conn.commit(); cur.close(); conn.close()

        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"✅ <b>Заявка одобрена</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {full_name or phone}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
            f"📅 <b>Срок:</b> {days} дн.\n"
            f"🔖 <b>Займ №:</b> {loan_id}"
        )
        # Уведомляем клиента в Telegram
        if tg_username:
            interest = round(float(amount) * rate * int(days))
            total = float(amount) + interest
            tg_client(
                tg_username,
                f"✅ <b>Ваша заявка одобрена!</b>\n\n"
                f"💰 <b>Сумма займа:</b> {int(amount):,} ₽\n".replace(",", " ") +
                f"📅 <b>Срок:</b> {days} дн.\n"
                f"📈 <b>Ставка:</b> {round(rate * 100, 1)}%/день\n"
                f"💳 <b>К возврату:</b> {int(total):,} ₽\n\n".replace(",", " ") +
                f"Деньги будут переведены на вашу карту. Ожидайте звонка специалиста."
            )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "loanId": loan_id})}

    # --- ОТКАЗАТЬ ПО ЗАЯВКЕ (POST, sub='reject', appId=...) ---
    if sub == "reject" and method == "POST":
        app_id = qs.get("appId")
        reason = (body.get("reason") or "").strip()

        cur.execute(
            f"SELECT full_name, phone, amount, telegram_id FROM {SCHEMA}.applications WHERE id = %s AND status = 'pending'",
            (app_id,)
        )
        app = cur.fetchone()
        if not app:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена или уже обработана"})}

        cur.execute(
            f"UPDATE {SCHEMA}.applications SET status='rejected', reviewed_at=NOW(), reject_reason=%s WHERE id=%s",
            (reason, app_id)
        )
        conn.commit(); cur.close(); conn.close()

        now = datetime.now().strftime("%d.%m.%Y в %H:%M")
        tg(
            f"❌ <b>Заявка отклонена</b>\n"
            f"⏱ {now}\n\n"
            f"👤 <b>Клиент:</b> {app[0] or app[1]}\n"
            f"📞 <b>Телефон:</b> {app[1]}\n"
            f"💰 <b>Сумма:</b> {int(app[2]):,} ₽\n".replace(",", " ") +
            (f"📝 <b>Причина:</b> {reason}" if reason else "")
        )
        # Уведомляем клиента в Telegram
        if app[3]:
            client_msg = (
                f"❌ <b>По вашей заявке принято отрицательное решение.</b>\n\n"
                + (f"📝 <b>Причина:</b> {reason}\n\n" if reason else "")
                + f"Вы можете подать новую заявку позже или связаться с нами для уточнения деталей."
            )
            tg_client(app[3], client_msg)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.close(); conn.close()
    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Маршрут не найден"})}
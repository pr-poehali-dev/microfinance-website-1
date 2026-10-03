"""Получение займов пользователя по токену сессии."""
import json
import os
from datetime import datetime, timedelta
import psycopg2


from datetime import timedelta as _msk_td


def msk(dt):
    """Переводит время из UTC (как хранится в БД) в московское (UTC+3) для показа."""
    return dt + _msk_td(hours=3) if dt else dt

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}

OVERDUE_DAILY_PENALTY_RATE = 0.07  # 7% от суммы основного долга за каждый день просрочки


def calc_penalty(amount, days, rate, disbursed_at, created_at, paid_total, db_status):
    """Считает пеню за просрочку. Возвращает (effective_status, base_total, total_due, is_overdue, overdue_days, penalty_amount).
    amount — тело долга (сумма + страховка). Пеня 7%/день от amount начисляется за каждый
    полный календарный день с даты истечения срока, если долг не погашен полностью.
    Применяется только к уже выданным займам (active/overdue) — не трогает review/paid/rejected."""
    base_interest = round(float(amount) * float(rate) * int(days))
    base_total = float(amount) + base_interest
    if db_status not in ("active", "overdue") or not disbursed_at:
        return db_status, base_total, base_total, False, 0, 0.0
    due_date = (disbursed_at + timedelta(days=int(days))).date()
    today = datetime.now().date()
    if today <= due_date or float(paid_total) >= base_total:
        return "active", base_total, base_total, False, 0, 0.0
    overdue_days = (today - due_date).days
    penalty = round(float(amount) * OVERDUE_DAILY_PENALTY_RATE * overdue_days)
    total_due = base_total + penalty
    return "overdue", base_total, total_due, True, overdue_days, penalty


CARD_MIN_PAYMENT_PERCENT = 40
CARD_SCHEDULE_WEEKS = 8


def card_payment_schedule(issued_at, debt):
    """Еженедельный график платежей по карте: даты от выдачи карты (МСК), минимальный платёж 40% от общего долга."""
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
        only_confirm_card = bool(b.get("confirm_card", False)) and not card_number
        if not card_number and not only_confirm_card:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер карты или телефон СБП"})}
        ph_e = phone.replace("'", "''")
        card_e = card_number.replace("'", "''")
        if card_number:
            cur.execute(
                f"UPDATE {SCHEMA}.applications SET card_number='{card_e}' "
                f"WHERE id = (SELECT id FROM {SCHEMA}.applications WHERE phone='{ph_e}' AND status IN ('approved','partner_card') ORDER BY created_at DESC LIMIT 1)"
            )
            conn.commit()
        # Если клиент нажал "Подтвердить займ" — отправляем уведомление администратору
        confirm_card = b.get("confirm_card", False)

        if confirm_card:
            # Клиент подтвердил виртуальную карту РУСФИНАНС 24 — активируем
            cur.execute(
                f"UPDATE {SCHEMA}.applications SET virtual_card_status='active', virtual_card_signed_at=NOW() "
                f"WHERE phone='{ph_e}' AND virtual_card_status='pending' AND virtual_card_number IS NOT NULL"
            )
            activated_now = cur.rowcount
            conn.commit()
            if not activated_now:
                cur.execute(
                    f"SELECT 1 FROM {SCHEMA}.applications WHERE phone='{ph_e}' AND virtual_card_status='active' AND virtual_card_number IS NOT NULL LIMIT 1"
                )
                if not cur.fetchone():
                    cur.close(); conn.close()
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Карта, ожидающая подписания договора, не найдена"})}
                cur.close(); conn.close()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "alreadyActive": True})}
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
                    f"✅ <b>Клиент активировал карту РУСФИНАНС 24</b>\n\n"
                    f"👤 <b>ФИО:</b> {vc_name or phone}\n"
                    f"📞 <b>Телефон:</b> {phone}\n"
                    f"💰 <b>Лимит:</b> {int(float(vc_limit)):,} ₽\n".replace(",", " ") +
                    f"📈 <b>Ставка:</b> {float(vc_rate)}%/нед.\n"
                    f"📝 Кредитный договор подписан\n"
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
            cur.execute(
                f"SELECT id, full_name, amount, approved_amount, approved_days, approved_rate, status FROM {SCHEMA}.applications "
                f"WHERE phone='{ph_e}' AND status IN ('approved','partner_card') ORDER BY created_at DESC LIMIT 1"
            )
            app_row = cur.fetchone()

            # Клиент подписал договор — займ остаётся в review до выдачи денег администратором
            cur.execute(
                f"UPDATE {SCHEMA}.loans SET signed = TRUE, signed_at = NOW() "
                f"WHERE user_id = {user_id} AND status = 'review' AND signed = FALSE"
            )
            conn.commit()

            import urllib.request
            tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
            chat_id = "8540431915"
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

    # --- ПОДАТЬ ЗАЯВКУ НА КАРТУ РУСФИНАНС 24 (POST, ?sub=card_request) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "card_request":
        ph_e = phone.replace("'", "''")
        fn_e = (full_name or "").replace("'", "''")
        cur.execute(
            f"SELECT id FROM {SCHEMA}.card_requests WHERE phone = '{ph_e}' AND status = 'pending'"
        )
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Заявка на карту уже отправлена и ожидает рассмотрения"})}
        cur.execute(
            f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph_e}' AND virtual_card_status IN ('pending','active') LIMIT 1"
        )
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "У вас уже есть карта РУСФИНАНС 24"})}
        cur.execute(
            f"INSERT INTO {SCHEMA}.card_requests (user_id, phone, full_name, status) "
            f"VALUES ({user_id}, '{ph_e}', '{fn_e}', 'pending') RETURNING id"
        )
        req_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()

        import urllib.request
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        chat_id = "8540431915"
        if tg_token:
            text = (
                f"💳 <b>Новая заявка на карту РУСФИНАНС 24 (#{req_id})</b>\n\n"
                f"👤 <b>ФИО:</b> {full_name or phone}\n"
                f"📞 <b>Телефон:</b> {phone}"
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
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "requestId": req_id})}

    # --- КЛИЕНТ ЗАКРЫЛ ПЛАШКУ «ЛИМИТ УВЕЛИЧЕН» (POST, ?sub=limit_seen) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "limit_seen":
        ph_e = phone.replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph_e}' AND virtual_card_number IS NOT NULL")
        ids_ = [str(r_[0]) for r_ in cur.fetchall()]
        if ids_:
            cur.execute(
                f"UPDATE {SCHEMA}.card_limit_increases SET seen = TRUE, seen_at = NOW() "
                f"WHERE application_id IN ({','.join(ids_)}) AND seen = FALSE"
            )
            conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- КЛИЕНТ СООБЩАЕТ ОБ ОПЛАТЕ ПО КАРТЕ (POST, ?sub=card_paid, body: {amount, dueDate}) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "card_paid":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        try:
            paid_amount = float(b.get("amount", 0))
        except Exception:
            paid_amount = 0
        due_date = str(b.get("dueDate") or "").strip()[:20].replace("'", "''")
        try:
            notice_tx = int(b.get("txId") or 0)
        except Exception:
            notice_tx = 0
        tx_sql = str(notice_tx) if notice_tx else "NULL"
        tx_cond = f"tx_id = {notice_tx}" if notice_tx else "tx_id IS NULL"
        if paid_amount <= 0 or not due_date:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан платёж"})}

        ph_e = phone.replace("'", "''")
        cur.execute(
            f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph_e}' AND virtual_card_status = 'active' "
            f"ORDER BY virtual_card_issued_at DESC LIMIT 1"
        )
        card_row = cur.fetchone()
        if not card_row:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Активная карта не найдена"})}
        card_app_id = card_row[0]

        cur.execute(
            f"SELECT status FROM {SCHEMA}.card_payment_notices WHERE application_id = {card_app_id} "
            f"AND due_date = '{due_date}' AND {tx_cond} ORDER BY id DESC LIMIT 1"
        )
        prev = cur.fetchone()
        if prev:
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "alreadySent": prev[0] == "new", "alreadyPaid": prev[0] == "done"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.card_payment_notices (application_id, amount, due_date, tx_id) "
            f"VALUES ({card_app_id}, {paid_amount}, '{due_date}', {tx_sql})"
        )
        conn.commit()
        cur.close(); conn.close()

        import urllib.request
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if tg_token:
            text = (
                f"💳 <b>Клиент сообщил об оплате по карте РУСФИНАНС 24</b>\n\n"
                f"👤 <b>ФИО:</b> {full_name or phone}\n"
                f"📞 <b>Телефон:</b> {phone}\n"
                f"💵 <b>Сумма:</b> {int(paid_amount):,} ₽\n".replace(",", " ") +
                f"📅 <b>Платёж за:</b> {due_date}\n"
                f"Проверьте поступление и отметьте оплату во вкладке «Одобренные карты»."
            )
            data = json.dumps({"chat_id": "8540431915", "text": text, "parse_mode": "HTML"}).encode()
            req = urllib.request.Request(
                f"https://api.telegram.org/bot{tg_token}/sendMessage",
                data=data, headers={"Content-Type": "application/json"}
            )
            try:
                urllib.request.urlopen(req, timeout=5)
            except Exception:
                pass
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ПЕРЕВОД С КАРТЫ РУСФИНАНС 24 (POST, ?sub=card_withdraw, body: {amount, weeks}) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "card_withdraw":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        try:
            wd_amount = float(b.get("amount", 0))
            wd_weeks = int(b.get("weeks", 0))
        except Exception:
            wd_amount = 0
            wd_weeks = 0
        if wd_amount <= 0 or wd_weeks <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму и срок перевода"})}
        wd_card = str(b.get("cardNumber") or "").strip()
        if len(wd_card) < 10:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер вашей карты для перевода"})}
        wd_card_e = wd_card[:64].replace("'", "''")

        ph_e = phone.replace("'", "''")
        cur.execute(
            f"SELECT id, virtual_card_limit, virtual_card_status FROM {SCHEMA}.applications "
            f"WHERE phone = '{ph_e}' AND virtual_card_status = 'active' ORDER BY virtual_card_issued_at DESC LIMIT 1"
        )
        app_row_c = cur.fetchone()
        if not app_row_c:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Активная карта не найдена"})}
        card_app_id, card_limit, _ = app_row_c
        card_limit = float(card_limit or 0)

        cur.execute(
            f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_transactions "
            f"WHERE application_id = {card_app_id} AND status != 'cancelled'"
        )
        used = float(cur.fetchone()[0])
        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {card_app_id}")
        used = max(0.0, used - float(cur.fetchone()[0]))
        available = card_limit - used
        if wd_amount > available:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Сумма превышает доступный остаток лимита ({int(available):,} ₽)".replace(",", " ")})}

        CARD_WEEKLY_RATE = 24.0  # 24% в неделю, фиксировано, без пересчёта
        cur.execute(
            f"INSERT INTO {SCHEMA}.card_transactions (application_id, phone, amount, weeks, rate, status, target_card) "
            f"VALUES ({card_app_id}, '{ph_e}', {wd_amount}, {wd_weeks}, {CARD_WEEKLY_RATE}, 'active', '{wd_card_e}') RETURNING id"
        )
        tx_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()

        import urllib.request
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        chat_id = "8540431915"
        if tg_token:
            interest_tx = round(wd_amount * CARD_WEEKLY_RATE / 100 * wd_weeks)
            text = (
                f"💸 <b>Перевод с карты РУСФИНАНС 24 (#{tx_id})</b>\n\n"
                f"👤 <b>ФИО:</b> {full_name or phone}\n"
                f"📞 <b>Телефон:</b> {phone}\n"
                f"💰 <b>Сумма:</b> {int(wd_amount):,} ₽\n".replace(",", " ") +
                f"💳 <b>На карту клиента:</b> {wd_card}\n"
                f"📅 <b>Срок:</b> {wd_weeks} нед.\n"
                f"📈 <b>Ставка:</b> {CARD_WEEKLY_RATE}%/нед.\n"
                f"💵 <b>К возврату:</b> {int(wd_amount + interest_tx):,} ₽\n".replace(",", " ") +
                f"Деньги будут переведены на карту клиента."
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
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "transactionId": tx_id})}

    # --- ПОВТОРНАЯ ЗАЯВКА НА ЗАЙМ ИЗ ЛИЧНОГО КАБИНЕТА (POST) ---
    if event.get("httpMethod") == "POST":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        try:
            amount = float(b.get("amount", 0))
            days = int(b.get("days", 0))
        except Exception:
            amount = 0
            days = 0
        if amount <= 0 or days <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите сумму и срок займа"})}

        ph_e = phone.replace("'", "''")

        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph_e}' AND status = 'pending' LIMIT 1")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "У вас уже есть заявка на рассмотрении"})}

        # Берём анкетные данные из последней заявки клиента, чтобы не заставлять
        # заново вводить паспорт/работу — это же наш повторный клиент.
        cur.execute(f"""
            SELECT birth_date, birth_place, passport_series, passport_number, passport_date, passport_code, passport_by,
                   telegram_id, snils, workplace, position, work_phone, salary, contact_person, card_number_transfer,
                   file_passport, file_registration, file_selfie, file_previous_passports, email
            FROM {SCHEMA}.applications WHERE phone = '{ph_e}' ORDER BY created_at DESC LIMIT 1
        """)
        prev = cur.fetchone()

        def v(x):
            if x is None:
                return "NULL"
            return "'" + str(x).replace("'", "''") + "'"

        if prev:
            (birth_date, birth_place, passport_series, passport_number, passport_date, passport_code, passport_by,
             telegram_id, snils, workplace, position, work_phone, salary, contact_person, card_number_transfer,
             file_passport, file_registration, file_selfie, file_previous_passports, prev_email) = prev
        else:
            birth_date = birth_place = passport_series = passport_number = passport_date = passport_code = passport_by = None
            telegram_id = snils = workplace = position = work_phone = contact_person = card_number_transfer = None
            file_passport = file_registration = file_selfie = file_previous_passports = None
            salary = None
            prev_email = None

        salary_val = str(float(salary)) if salary is not None else "NULL"
        email_val = v(email or prev_email)
        fn_e = (full_name or "").replace("'", "''")

        cur.execute(f"""
            INSERT INTO {SCHEMA}.applications
                (full_name, phone, email, amount, days, birth_date, birth_place,
                 passport_series, passport_number, passport_date, passport_code, passport_by,
                 telegram_id, status, file_passport, file_registration, file_selfie, file_previous_passports,
                 snils, workplace, position, work_phone, salary, contact_person, card_number_transfer)
            VALUES (
                '{fn_e}', '{ph_e}', {email_val}, {amount}, {days},
                {v(birth_date)}, {v(birth_place)}, {v(passport_series)}, {v(passport_number)}, {v(passport_date)}, {v(passport_code)}, {v(passport_by)},
                {v(telegram_id)}, 'pending', {v(file_passport)}, {v(file_registration)}, {v(file_selfie)}, {v(file_previous_passports)},
                {v(snils)}, {v(workplace)}, {v(position)}, {v(work_phone)}, {salary_val}, {v(contact_person)}, {v(card_number_transfer)}
            ) RETURNING id
        """)
        new_app_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()

        import urllib.request
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        chat_id = "8540431915"
        if tg_token:
            text = (
                f"🔁 <b>Повторная заявка от клиента — РУСФИНАНС 24 (#{new_app_id})</b>\n\n"
                f"👤 <b>ФИО:</b> {full_name or phone}\n"
                f"📞 <b>Телефон:</b> {phone}\n"
                f"💰 <b>Сумма:</b> {int(amount):,} ₽\n".replace(",", " ") +
                f"📅 <b>Срок:</b> {days} дн.\n\n"
                f"Клиент уже брал займ ранее — заявка подана через личный кабинет."
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

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "appId": new_app_id})}

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
            f"UPDATE {SCHEMA}.loans SET signed = TRUE, signed_at = NOW() WHERE id = {loan_id}"
        )
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    cur.execute(
        f"SELECT id, amount, days, rate, status, created_at, signed, offer_amount, offer_days, offer_rate, disbursed_at, insurance_amount FROM {SCHEMA}.loans WHERE user_id = {user_id} ORDER BY created_at DESC"
    )
    rows = cur.fetchall()

    # Получаем последнюю заявку пользователя (+ вся анкета)
    cur.execute(
        f"SELECT id, amount, days, status, created_at, approved_amount, approved_rate, approved_days, reject_reason, card_number, contract_url, "
        f"virtual_card_number, virtual_card_expiry, virtual_card_cvv, virtual_card_holder, virtual_card_limit, virtual_card_rate, virtual_card_status, "
        f"is_credit_doctor, full_name, email, birth_date, birth_place, passport_series, passport_number, passport_date, passport_code, passport_by, "
        f"workplace, position, work_phone, salary, contact_person, snils, reviewed_at, video_call_requested, virtual_card_days, partner_card_url, insurance_amount, virtual_card_issued_at "
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
        insurance_amount_app = float(app_row[38]) if app_row[38] else 0
        eff_amount = approved_amount if approved_amount else app_amount
        eff_debt = eff_amount + insurance_amount_app
        approved_interest = round(eff_debt * approved_rate * approved_days)
        approved_total = eff_debt + approved_interest
        reviewed_at = app_row[34]
        reapply_days_left = None
        if app_row[3] == "rejected" and reviewed_at:
            days_passed = (datetime.now() - reviewed_at).days
            reapply_days_left = max(0, 30 - days_passed)
        vc_days = int(app_row[36]) if app_row[36] else None

        # Транзакции (переводы) по карте: каждая — со своим еженедельным графиком погашения
        vc_transactions = []
        vc_used = 0.0
        vc_debt = 0.0
        vc_repaid = 0.0
        vc_repayments = []
        vc_notices = []
        vc_paid = []
        vc_limit_news = []
        if app_row[11]:
            cur.execute(
                f"SELECT id, amount, weeks, rate, status, created_at, disbursed_amount, disbursed_at, target_card FROM {SCHEMA}.card_transactions "
                f"WHERE application_id = {app_row[0]} ORDER BY created_at DESC"
            )
            for tx_id, tx_amount, tx_weeks, tx_rate, tx_status, tx_created, tx_disb_amount, tx_disb_at, tx_target in cur.fetchall():
                tx_amount = float(tx_amount)
                tx_rate = float(tx_rate)
                tx_interest_total = round(tx_amount * tx_rate / 100 * tx_weeks)
                tx_total = tx_amount + tx_interest_total
                if tx_status != "cancelled":
                    vc_used += tx_amount
                    vc_debt += tx_total
                weekly_principal = tx_amount / tx_weeks
                weekly_payment = round(tx_total / tx_weeks)
                tx_schedule = [{
                    "week": w,
                    "dueDate": (tx_created + timedelta(weeks=w)).strftime("%d.%m.%Y"),
                    "amount": weekly_payment,
                } for w in range(1, tx_weeks + 1)]
                vc_transactions.append({
                    "id": tx_id,
                    "amount": tx_amount,
                    "weeks": tx_weeks,
                    "rate": tx_rate,
                    "status": tx_status,
                    "createdAt": tx_created.strftime("%d.%m.%Y"),
                    "total": tx_total,
                    "schedule": tx_schedule,
                    "disbursedAmount": float(tx_disb_amount or 0),
                    "disbursedAt": msk(tx_disb_at).strftime("%d.%m.%Y в %H:%M") if tx_disb_at else None,
                    "targetCard": tx_target or "",
                })
            cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {app_row[0]}")
            vc_repaid = float(cur.fetchone()[0])
            cur.execute(
                f"SELECT amount, note, created_at FROM {SCHEMA}.card_repayments "
                f"WHERE application_id = {app_row[0]} AND amount > 0 ORDER BY created_at DESC"
            )
            vc_repayments = [{
                "amount": float(r_amt), "note": r_note or "",
                "createdAt": msk(r_at).strftime("%d.%m.%Y в %H:%M"),
            } for r_amt, r_note, r_at in cur.fetchall()]
            cur.execute(
                f"SELECT tx_id, due_date, status FROM {SCHEMA}.card_payment_notices WHERE application_id = {app_row[0]}"
            )
            for n_tx, n_due, n_status in cur.fetchall():
                key_ = f"{n_tx or 0}|{n_due}"
                (vc_notices if n_status == "new" else vc_paid).append(key_)
            vc_debt = max(0.0, vc_debt - vc_repaid)
            vc_used = max(0.0, vc_used - vc_repaid)
            cur.execute(
                f"SELECT added_amount, new_limit FROM {SCHEMA}.card_limit_increases "
                f"WHERE application_id = {app_row[0]} AND seen = FALSE ORDER BY created_at ASC"
            )
            vc_limit_news = [{"added": float(a_), "newLimit": float(n_)} for a_, n_ in cur.fetchall()]

        vc_limit_val = float(app_row[15]) if app_row[15] else 0
        vc_available = max(0, vc_limit_val - vc_used)

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
                "limit": vc_limit_val,
                "available": vc_available,
                "rate": float(app_row[16]) if app_row[16] else 0,
                "status": app_row[17] or "none",
                "days": vc_days,
                "transactions": vc_transactions,
                "debt": vc_debt,
                "repaid": vc_repaid,
                "repayments": vc_repayments,
                "pendingNotices": vc_notices,
                "paidNotices": vc_paid,
                "limitIncreases": vc_limit_news,
                "minPaymentPercent": CARD_MIN_PAYMENT_PERCENT,
                "minPayment": round(vc_debt * CARD_MIN_PAYMENT_PERCENT / 100),
                "paymentSchedule": card_payment_schedule(app_row[39], vc_debt),
            } if app_row[11] else None,
            "isCreditDoctor": bool(app_row[18]) if app_row[18] is not None else False,
            "reapplyDaysLeft": reapply_days_left,
            "videoCallRequested": bool(app_row[35]) if app_row[35] is not None else False,
            "partnerCardUrl": app_row[37] or "",
            "insuranceAmount": insurance_amount_app,
        }
        # Полная анкета клиента
        profile = {
            "fullName": app_row[19] or "",
            "email": app_row[20] or "",
            "birthDate": app_row[21] or "",
            "birthPlace": app_row[22] or "",
            "passportSeries": app_row[23] or "",
            "passportNumber": app_row[24] or "",
            "passportDate": app_row[25] or "",
            "passportCode": app_row[26] or "",
            "passportBy": app_row[27] or "",
            "workplace": app_row[28] or "",
            "position": app_row[29] or "",
            "workPhone": app_row[30] or "",
            "salary": float(app_row[31]) if app_row[31] else None,
            "contactPerson": app_row[32] or "",
            "snils": app_row[33] or "",
        }
        application["profile"] = profile

    # Статус заявки клиента на получение карты РУСФИНАНС 24 (если подавал)
    ph_e2 = phone.replace("'", "''")
    cur.execute(
        f"SELECT status, reject_reason FROM {SCHEMA}.card_requests "
        f"WHERE phone = '{ph_e2}' ORDER BY created_at DESC LIMIT 1"
    )
    cr_row = cur.fetchone()
    card_request = {"status": cr_row[0], "rejectReason": cr_row[1] or ""} if cr_row else None

    # Платежи по всем основным займам пользователя
    loan_ids = [str(r[0]) for r in rows]
    payments_by_loan: dict = {}
    if loan_ids:
        cur.execute(
            f"SELECT loan_id, amount, paid_at, note FROM {SCHEMA}.payments "
            f"WHERE loan_type = 'loan' AND loan_id IN ({','.join(loan_ids)}) ORDER BY paid_at DESC"
        )
        for p_loan_id, p_amount, p_paid_at, p_note in cur.fetchall():
            payments_by_loan.setdefault(p_loan_id, []).append({
                "amount": float(p_amount),
                "paidAt": msk(p_paid_at).strftime("%d.%m.%Y в %H:%M"),
                "note": p_note or "",
            })

    cur.close(); conn.close()

    is_cd = bool(application and application.get("isCreditDoctor"))

    loans = []
    for row in rows:
        loan_id, amount, days, rate, db_status, created_at, signed, offer_amount, offer_days, offer_rate, disbursed_at, loan_insurance = row
        loan_insurance = float(loan_insurance) if loan_insurance else 0
        loan_payments = payments_by_loan.get(loan_id, [])
        paid_total = sum(p["amount"] for p in loan_payments)

        is_monthly_cd = is_cd and days > 30
        if is_monthly_cd:
            # Помесячная схема Кредитного Доктора — пеня за просрочку сюда не применяется
            interest = round(float(amount) * float(rate) * days)
            total = float(amount) + interest
            status = db_status
            overdue_days = 0
            penalty = 0.0
        else:
            status, base_total, total, is_overdue, overdue_days, penalty = calc_penalty(
                amount, days, rate, disbursed_at, created_at, paid_total, db_status
            )
            interest = round(base_total - float(amount))

        schedule = []
        if status in ("active", "overdue", "paid"):
            start = disbursed_at or created_at
            if is_monthly_cd:
                # Помесячный график для Кредитного доктора
                months = max(1, round(days / 30))
                monthly_principal = float(amount) / months
                remaining_p = float(amount)
                for m in range(1, months + 1):
                    interest_m = round(remaining_p * float(rate) * 30)
                    payment_m = round(monthly_principal + interest_m)
                    schedule.append({
                        "month": m,
                        "dueDate": (start + timedelta(days=30 * m)).strftime("%d.%m.%Y"),
                        "amount": payment_m,
                        "principal": round(monthly_principal),
                        "interest": interest_m,
                    })
                    remaining_p -= monthly_principal
            else:
                schedule = [{
                    "dueDate": (start + timedelta(days=days)).strftime("%d.%m.%Y"),
                    "amount": total,
                    "label": "Погашение полной суммы" if not penalty else f"Погашение с пеней за просрочку ({overdue_days} дн.)",
                }]

        loan_data = {
            "id": loan_id,
            "amount": float(amount),
            "insuranceAmount": loan_insurance,
            "principalAmount": float(amount) - loan_insurance,
            "days": days,
            "rate": float(rate),
            "ratePercent": round(float(rate) * 100, 1),
            "interest": interest,
            "total": total,
            "status": status,
            "overdueDays": overdue_days,
            "penaltyAmount": penalty,
            "penaltyRatePercent": round(OVERDUE_DAILY_PENALTY_RATE * 100, 1),
            "createdAt": created_at.strftime("%d.%m.%Y"),
            "signed": signed,
            "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
            "payments": loan_payments,
            "paidTotal": paid_total,
            "remaining": max(0, total - paid_total),
            "schedule": schedule,
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
            "isRepeatClient": len(loans) > 0,
            "cardRequest": card_request,
        }, ensure_ascii=False)
    }
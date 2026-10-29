"""Получение займов пользователя по токену сессии."""
import json
import re
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

OVERDUE_DAILY_PENALTY_RATE = 0.0299  # 2,99% от суммы основного долга за каждый день просрочки


def principal_part(principal, gross, repaid):
    """Часть платежей по карте, ушедшая на основной долг (проценты в лимит не возвращаются)."""
    if gross <= 0 or principal <= 0:
        return 0.0
    return min(principal, float(repaid) * principal / gross)


def card_penalty(tx_rows, gross, repaid, hol=None):
    """Штраф по карте: 2,99% в день от непогашенного основного долга по каждому переводу после окончания его срока."""
    if gross <= 0:
        return 0.0, 0
    ratio = max(0.0, 1.0 - float(repaid) / float(gross))
    if ratio <= 0:
        return 0.0, 0
    today = (datetime.utcnow() + timedelta(hours=3)).date()
    total = 0.0
    max_days = 0
    for amount, weeks, created in tx_rows:
        due = (created + timedelta(hours=3, weeks=int(weeks))).date()
        if hol and hol > due:
            due = hol
        d = (today - due).days
        if d > 0:
            total += float(amount) * ratio * OVERDUE_DAILY_PENALTY_RATE * d
            max_days = max(max_days, d)
    return float(round(total)), max_days


def started_units(start_dt, unit_days):
    """Сколько начатых периодов (дней/недель) прошло с start_dt по московскому времени."""
    today = (datetime.utcnow() + timedelta(hours=3)).date()
    begin = (start_dt + timedelta(hours=3)).date()
    diff = max(0, (today - begin).days)
    return diff // unit_days + 1


def calc_penalty(amount, days, rate, disbursed_at, created_at, paid_total, db_status, wheel_rub=0, hol=None):
    """Считает пеню за просрочку. Возвращает (effective_status, base_total, total_due, is_overdue, overdue_days, penalty_amount).
    amount — тело долга (сумма + страховка). Пеня 2,99%/день от amount начисляется за каждый
    полный календарный день с даты истечения срока, если долг не погашен полностью.
    hol — дата окончания кредитных каникул: до неё просрочки нет, проценты продолжают начисляться,
    пеня считается только со дня после окончания каникул.
    Применяется только к уже выданным займам (active/overdue) — не трогает review/paid/rejected."""
    base_interest = round(float(amount) * float(rate) * int(days))
    base_interest -= min(int(wheel_rub or 0), base_interest)
    base_total = float(amount) + base_interest
    if db_status not in ("active", "overdue") or not disbursed_at:
        return db_status, base_total, base_total, False, 0, 0.0
    due_date = (disbursed_at + timedelta(days=int(days))).date()
    today = datetime.now().date()
    if hol and hol > due_date:
        extra_days = max(0, (min(today, hol) - due_date).days)
        base_total += round(float(amount) * float(rate) * extra_days)
        due_date = hol
    if today <= due_date or float(paid_total) >= base_total:
        return "active", base_total, base_total, False, 0, 0.0
    overdue_days = (today - due_date).days
    penalty = round(float(amount) * OVERDUE_DAILY_PENALTY_RATE * overdue_days)
    total_due = base_total + penalty
    return "overdue", base_total, total_due, True, overdue_days, penalty


def load_holidays(cur, phone):
    """Заявки клиента на кредитные каникулы (последние 30)."""
    ph = phone.replace("'", "''")
    cur.execute(
        f"SELECT id, items, approved_items, status, admin_comment, until_date, created_at, decided_at, client_comment, seen "
        f"FROM {SCHEMA}.credit_holidays WHERE phone = '{ph}' ORDER BY id DESC LIMIT 30"
    )
    out = []
    for r in cur.fetchall():
        out.append({
            "id": r[0], "items": r[1] or [], "approvedItems": r[2] or [], "status": r[3],
            "adminComment": r[4] or "", "untilDate": r[5].strftime("%d.%m.%Y") if r[5] else None,
            "untilIso": r[5].isoformat() if r[5] else None,
            "createdAt": msk(r[6]).strftime("%d.%m.%Y в %H:%M"),
            "clientComment": r[8] or "",
            "seen": bool(r[9]),
        })
    return out


def holiday_map(holidays, kind="loan"):
    """id -> дата окончания каникул (по одобренным заявкам, самая поздняя)."""
    res = {}
    for h in holidays:
        if h["status"] != "approved" or not h["untilIso"]:
            continue
        until = datetime.strptime(h["untilIso"], "%Y-%m-%d").date()
        for it in h["approvedItems"]:
            if it.get("kind") == kind:
                lid = int(it.get("id"))
                if lid not in res or res[lid] < until:
                    res[lid] = until
    return res


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


CARD_MONTHLY_FEE = 399


def ensure_card_fees(cur, app_id):
    """Списывает с лимита карты ежемесячное обслуживание: первое сразу при активации, далее каждый месяц. Возвращает сумму всех списаний."""
    cur.execute(f"SELECT virtual_card_signed_at FROM {SCHEMA}.applications WHERE id = {int(app_id)} AND virtual_card_status = 'active'")
    r = cur.fetchone()
    if r and r[0]:
        now = datetime.utcnow()
        sd = r[0]
        months = (now.year - sd.year) * 12 + (now.month - sd.month)
        if now.day < sd.day:
            months -= 1
        for n in range(1, min(max(months, 0) + 1, 36) + 1):
            cur.execute(
                f"INSERT INTO {SCHEMA}.card_fees (application_id, amount, kind, period_no) "
                f"VALUES ({int(app_id)}, {CARD_MONTHLY_FEE}, 'monthly', {n}) ON CONFLICT (application_id, kind, period_no) DO NOTHING"
            )
    cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_fees WHERE application_id = {int(app_id)} AND cancelled_at IS NULL")
    return float(cur.fetchone()[0])


CARD_TRANSFER_FEE_FIXED = 199
CARD_TRANSFER_FEE_PERCENT = 3.9


def card_transfer_fee(amount):
    return round(CARD_TRANSFER_FEE_FIXED + float(amount) * CARD_TRANSFER_FEE_PERCENT / 100)


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])



def apply_wheel_prize(cur, schema, visitor_id, app_id):
    """Привязывает приз колеса к заявке: проценты и 0%-займы — в скидку на проценты, рубли — в wheel_discount_rub."""
    vid = "".join(ch for ch in str(visitor_id or "") if ch.isalnum() or ch in "-_")[:64]
    if len(vid) < 8:
        return
    cur.execute(f"SELECT prize_key, prize_label, used_at, uses_left FROM {schema}.wheel_spins WHERE visitor_id = '{vid}'")
    row = cur.fetchone()
    if not row:
        return
    key, label, used_at, uses_left = row
    is_zero = key in ("zero1", "zero2")
    if is_zero:
        total = 1 if key == "zero1" else 2
        left = total if uses_left is None else int(uses_left)
        if left <= 0:
            return
        cur.execute(
            f"UPDATE {schema}.wheel_spins SET used_at = NOW(), used_app_id = {int(app_id)}, uses_left = {left - 1} "
            f"WHERE visitor_id = '{vid}'"
        )
    else:
        if used_at is not None:
            return
        cur.execute(
            f"UPDATE {schema}.wheel_spins SET used_at = NOW(), used_app_id = {int(app_id)} WHERE visitor_id = '{vid}'"
        )
    cur.execute(f"UPDATE {schema}.applications SET wheel_prize = '{label}' WHERE id = {int(app_id)}")
    if key.startswith("rub"):
        cur.execute(f"UPDATE {schema}.applications SET wheel_discount_rub = {int(key[3:])} WHERE id = {int(app_id)}")
    pct = 100 if is_zero else (int(key[3:]) if key.startswith("pct") else 0)
    if pct:
        cur.execute(
            f"UPDATE {schema}.applications SET promo_discount = GREATEST(COALESCE(promo_discount, 0), {pct}) "
            f"WHERE id = {int(app_id)}"
        )


def get_user_by_token(cur, token: str):
    t = token.replace("'", "''")
    cur.execute(
        f"SELECT u.id, u.phone, u.full_name, u.email FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = '{t}' AND s.expires_at > NOW()"
    )
    return cur.fetchone()


def profile_locked(cur, user_id, phone):
    """True, если у клиента есть действующий займ/заявка/долг по карте и анкету менять нельзя."""
    ph = phone.replace("'", "''")
    cur.execute(f"SELECT 1 FROM {SCHEMA}.loans WHERE user_id = {int(user_id)} AND status IN ('active','overdue') LIMIT 1")
    if cur.fetchone():
        return True
    cur.execute(f"SELECT status FROM {SCHEMA}.applications WHERE phone = '{ph}' ORDER BY created_at DESC LIMIT 1")
    r = cur.fetchone()
    st = r[0] if r else None
    if st == "pending":
        return True
    if st in ("approved", "partner_card"):
        cur.execute(f"SELECT 1 FROM {SCHEMA}.loans WHERE user_id = {int(user_id)} AND status = 'review' LIMIT 1")
        if cur.fetchone():
            return True
    cur.execute(
        f"SELECT COALESCE(SUM(amount + ROUND(amount * rate / 100 * weeks)), 0) FROM {SCHEMA}.card_transactions "
        f"WHERE phone = '{ph}' AND status != 'cancelled'"
    )
    tx_total = float(cur.fetchone()[0] or 0)
    if tx_total > 0:
        cur.execute(
            f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.card_repayments "
            f"WHERE application_id IN (SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph}')"
        )
        if tx_total - float(cur.fetchone()[0] or 0) > 0:
            return True
    for tbl in ("car_loan_applications", "shopping_loan_applications"):
        cur.execute(f"SELECT 1 FROM {SCHEMA}.{tbl} WHERE phone = '{ph}' AND status IN ('pending','signing','approved') LIMIT 1")
        if cur.fetchone():
            return True
    return False


PROFILE_FILE_COLS = {
    "filePassport": "file_passport", "fileRegistration": "file_registration",
    "fileSelfie": "file_selfie", "filePreviousPassports": "file_previous_passports",
}

PROFILE_LABELS = {
    "fullName": "ФИО", "email": "Email", "birthDate": "дата рождения", "birthPlace": "место рождения",
    "passportSeries": "серия паспорта", "passportNumber": "номер паспорта", "passportDate": "дата выдачи паспорта",
    "passportCode": "код подразделения", "passportBy": "кем выдан паспорт", "snils": "СНИЛС",
    "workplace": "место работы", "position": "должность", "workPhone": "рабочий телефон",
    "salary": "зарплата", "contactPerson": "контактное лицо",
    "filePassport": "фото паспорта", "fileRegistration": "фото прописки",
    "fileSelfie": "селфи с паспортом", "filePreviousPassports": "фото ранее выданных паспортов",
}

PROFILE_COLS = {
    "birthDate": "birth_date", "birthPlace": "birth_place",
    "passportSeries": "passport_series", "passportNumber": "passport_number",
    "passportDate": "passport_date", "passportCode": "passport_code", "passportBy": "passport_by",
    "snils": "snils", "workplace": "workplace", "position": "position",
    "workPhone": "work_phone", "contactPerson": "contact_person",
    "regAddress": "reg_address", "livingAddress": "living_address", "workAddress": "work_address",
}


def sync_saved_cards(cur, phone: str):
    """Подтягивает карты/СБП из всех заявок клиента в список сохранённых карт."""
    ph = phone.replace("'", "''")
    parts = [
        f"SELECT card_number AS v FROM {SCHEMA}.applications WHERE phone = '{ph}'",
        f"SELECT card_number_transfer AS v FROM {SCHEMA}.applications WHERE phone = '{ph}'",
        f"SELECT card_number AS v FROM {SCHEMA}.car_loan_applications WHERE phone = '{ph}'",
        f"SELECT card_number AS v FROM {SCHEMA}.shopping_loan_applications WHERE phone = '{ph}'",
    ]
    cur.execute(
        f"INSERT INTO {SCHEMA}.saved_cards (phone, card_value, card_key, source) "
        f"SELECT DISTINCT ON (k) '{ph}', trim(v), k, 'loan' FROM ("
        f"SELECT v, regexp_replace(v, '[^0-9]', '', 'g') AS k FROM (" + " UNION ALL ".join(parts) + ") a WHERE v IS NOT NULL"
        f") t WHERE (length(k) IN (10, 11) OR length(k) BETWEEN 16 AND 19) AND k !~ '^0+$' ORDER BY k ON CONFLICT (phone, card_key) DO NOTHING"
    )


def force_account_phone(value: str, account_phone: str) -> str:
    """Для выплат по СБП телефон всегда равен телефону аккаунта; банк берётся из значения клиента."""
    value = (value or "").strip()
    sep = " · "
    bank = value.split(sep, 1)[1].strip() if sep in value else ""
    return f"{account_phone}{sep}{bank}" if bank else account_phone


def partner_card_blocked(cur, phone: str) -> bool:
    """True, если у клиента заявка «займ с картой партнёра» и идентификация карты ещё не одобрена админом."""
    cur.execute(
        f"SELECT status, partner_card_status, COALESCE(partner_card_url, '') FROM {SCHEMA}.applications "
        f"WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1"
    )
    r = cur.fetchone()
    partner_flow = bool(r and (r[0] == "partner_card" or (r[0] == "approved" and r[2])))
    return bool(partner_flow and (r[1] or "none") != "approved")


PARTNER_BLOCK_MSG = "Сначала отправьте данные карты партнёра на идентификацию и дождитесь одобрения"


def mask_card(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) >= 16:
        return "•••• •••• •••• " + digits[-4:]
    return value


def blocked_message(phone) -> str:
    """Если клиент заблокирован админом — текст отказа с датой, иначе пустая строка."""
    ph = re.sub(r"\D", "", str(phone or ""))[-10:]
    if len(ph) < 10:
        return ""
    c = psycopg2.connect(os.environ["DATABASE_URL"])
    k = c.cursor()
    k.execute(
        f"SELECT blocked_until FROM {SCHEMA}.users WHERE right(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) = '{ph}' "
        f"AND blocked_until > NOW() ORDER BY blocked_until DESC LIMIT 1"
    )
    r = k.fetchone()
    k.execute(f"SELECT until_at FROM {SCHEMA}.reapply_blocks WHERE phone10 = '{ph}' AND until_at > NOW()")
    rb = k.fetchone()
    k.close(); c.close()
    if rb:
        return "После отказа по заявке повторная подача возможна с " + (rb[0] + timedelta(hours=3)).strftime("%d.%m.%Y") + "."
    if not r:
        return ""
    return "Подача новых заявок временно недоступна. Доступ ограничен до " + (r[0] + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M") + " (МСК)."


def applications_paused() -> bool:
    c = psycopg2.connect(os.environ["DATABASE_URL"])
    k = c.cursor()
    k.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'applications_paused'")
    r = k.fetchone()
    k.close(); c.close()
    return bool(r) and r[0] == "true"

def pause_message() -> str:
    c = psycopg2.connect(os.environ["DATABASE_URL"])
    k = c.cursor()
    k.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'pause_message'")
    r = k.fetchone()
    k.close(); c.close()
    return "Новые заявки временно не принимаются. " + ((r[0] if r and r[0].strip() else "") or "Приносим извинения.")

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

    # --- ЗАПРОСЫ ДОКУМЕНТОВ ОТ АДМИНА: список (GET sub=doc_requests) ---
    if event.get("httpMethod") == "GET" and (event.get("queryStringParameters") or {}).get("sub") == "doc_requests":
        ph_q = phone.replace("'", "''")
        cur.execute(f"SELECT id, message, created_at FROM {SCHEMA}.doc_requests WHERE phone = '{ph_q}' AND status = 'open' ORDER BY created_at DESC")
        reqs = [{"id": r_[0], "message": r_[1], "date": msk(r_[2]).strftime("%d.%m.%Y в %H:%M")} for r_ in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"requests": reqs}, ensure_ascii=False)}

    # --- КРЕДИТНЫЕ КАНИКУЛЫ: заявка клиента (POST sub=holiday_request) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "holiday_request":
        raw_h = event.get("body") or "{}"
        bh = json.loads(raw_h) if isinstance(raw_h, str) else raw_h
        items_in = bh.get("items") or []
        comment_h = str(bh.get("comment") or "").strip()[:1000]
        clean = []
        for it in items_in[:20]:
            kind = str(it.get("kind") or "")
            if kind not in ("loan", "carloan", "shoploan", "card"):
                continue
            try:
                iid = int(it.get("id"))
            except (TypeError, ValueError):
                continue
            if kind == "loan":
                cur.execute(f"SELECT 1 FROM {SCHEMA}.loans WHERE id = {iid} AND user_id = {int(user_id)} AND status IN ('active','overdue')")
            elif kind == "card":
                cur.execute(f"SELECT 1 FROM {SCHEMA}.applications WHERE id = {iid} AND phone = '{phone.replace(chr(39), chr(39)*2)}' AND virtual_card_status = 'active'")
            else:
                tbl = "car_loan_applications" if kind == "carloan" else "shopping_loan_applications"
                cur.execute(f"SELECT 1 FROM {SCHEMA}.{tbl} WHERE id = {iid} AND phone = '{phone.replace(chr(39), chr(39)*2)}' AND status = 'approved'")
            if not cur.fetchone():
                continue
            pays = []
            for pm in (it.get("payments") or [])[:60]:
                try:
                    pays.append({"idx": int(pm.get("idx")), "label": str(pm.get("label") or "")[:80],
                                 "dueDate": str(pm.get("dueDate") or "")[:20], "amount": float(pm.get("amount") or 0)})
                except (TypeError, ValueError):
                    continue
            if not pays:
                continue
            clean.append({"kind": kind, "id": iid, "label": str(it.get("label") or "")[:80], "payments": pays})
        if not clean:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Выберите займ и платежи для каникул"}, ensure_ascii=False)}
        ph_h = phone.replace("'", "''")
        cur.execute(f"SELECT 1 FROM {SCHEMA}.credit_holidays WHERE phone = '{ph_h}' AND status = 'pending'")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Ваша предыдущая заявка ещё на рассмотрении"}, ensure_ascii=False)}
        items_json = json.dumps(clean, ensure_ascii=False).replace("'", "''")
        fn_h = (full_name or "").replace("'", "''")
        c_h = comment_h.replace("'", "''")
        cur.execute(
            f"INSERT INTO {SCHEMA}.credit_holidays (user_id, phone, full_name, items, client_comment) "
            f"VALUES ({int(user_id)}, '{ph_h}', '{fn_h}', '{items_json}'::jsonb, '{c_h}')"
        )
        conn.commit()
        cur.close(); conn.close()
        import urllib.request as _urh
        tg_token_h = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if tg_token_h:
            try:
                _urh.urlopen(_urh.Request(
                    f"https://api.telegram.org/bot{tg_token_h}/sendMessage",
                    data=json.dumps({"chat_id": "8540431915", "parse_mode": "HTML", "text": (
                        f"🏖 <b>Заявка на кредитные каникулы</b>\n\n👤 <b>ФИО:</b> {full_name or phone}\n📞 <b>Телефон:</b> {phone}\n"
                        f"📄 <b>Займов:</b> {len(clean)}\n\nОткройте админку, раздел «Каникулы».")}).encode(),
                    headers={"Content-Type": "application/json"}), timeout=5)
            except Exception:
                pass
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- ДОКУМЕНТЫ КЛИЕНТА: список (GET sub=my_docs) ---
    if event.get("httpMethod") == "GET" and (event.get("queryStringParameters") or {}).get("sub") == "my_docs":
        cur.execute(
            f"SELECT id, title, comment, file_url, status, created_at FROM {SCHEMA}.client_documents "
            f"WHERE user_id = {int(user_id)} ORDER BY created_at DESC, id DESC LIMIT 100"
        )
        docs = [{"id": r_[0], "title": r_[1], "comment": r_[2], "url": r_[3], "status": r_[4],
                 "date": msk(r_[5]).strftime("%d.%m.%Y в %H:%M")} for r_ in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"docs": docs}, ensure_ascii=False)}

    # --- ДОКУМЕНТЫ КЛИЕНТА: отправить админу (POST sub=doc_send) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "doc_send":
        raw_d = event.get("body") or "{}"
        bd = json.loads(raw_d) if isinstance(raw_d, str) else raw_d
        d_title = str(bd.get("title") or "").strip()[:120] or "Документ"
        d_comment = str(bd.get("comment") or "").strip()[:1000]
        d_urls = [str(u) for u in (bd.get("urls") or []) if str(u).startswith("https://")][:10]
        if not d_urls:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Прикрепите хотя бы один файл"}, ensure_ascii=False)}
        ph_d = phone.replace("'", "''")
        fn_d = (full_name or "").replace("'", "''")
        t_d = d_title.replace("'", "''")
        c_d = d_comment.replace("'", "''")
        for u in d_urls:
            cur.execute(
                f"INSERT INTO {SCHEMA}.client_documents (user_id, phone, full_name, title, comment, file_url) "
                f"VALUES ({int(user_id)}, '{ph_d}', '{fn_d}', '{t_d}', '{c_d}', '{u.replace(chr(39), chr(39)*2)}')"
            )
        cur.execute(f"UPDATE {SCHEMA}.doc_requests SET status = 'closed', closed_at = NOW() WHERE phone = '{ph_d}' AND status = 'open'")
        conn.commit()
        cur.close(); conn.close()
        import urllib.request as _urd
        tg_token_d = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if tg_token_d:
            try:
                _urd.urlopen(_urd.Request(
                    f"https://api.telegram.org/bot{tg_token_d}/sendMessage",
                    data=json.dumps({"chat_id": "8540431915", "parse_mode": "HTML", "text": (
                        f"📎 <b>Клиент прислал документы</b>\n\n"
                        f"👤 <b>ФИО:</b> {full_name or phone}\n📞 <b>Телефон:</b> {phone}\n"
                        f"📄 <b>Что:</b> {d_title}\n🗂 <b>Файлов:</b> {len(d_urls)}\n"
                        + (f"💬 <b>Комментарий:</b> {d_comment}\n" if d_comment else "")
                        + "\nОткройте админку, раздел «Документы клиентов».")}).encode(),
                    headers={"Content-Type": "application/json"}), timeout=5)
            except Exception:
                pass
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "count": len(d_urls)})}

    # --- МОИ КАРТЫ: список (GET sub=saved_cards) ---
    if event.get("httpMethod") == "GET" and (event.get("queryStringParameters") or {}).get("sub") == "saved_cards":
        sync_saved_cards(cur, phone)
        conn.commit()
        cur.execute(f"SELECT id, card_value, source FROM {SCHEMA}.saved_cards WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' AND hidden = FALSE ORDER BY created_at DESC, id DESC")
        items = [{"id": r_[0], "label": mask_card(r_[1]), "value": r_[1], "isCard": len("".join(c for c in r_[1] if c.isdigit())) >= 16, "source": r_[2]} for r_ in cur.fetchall()]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"cards": items}, ensure_ascii=False)}

    # --- МОИ КАРТЫ: добавить (POST sub=card_add) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "card_add":
        raw_c = event.get("body") or "{}"
        bc = json.loads(raw_c) if isinstance(raw_c, str) else raw_c
        value = force_account_phone(bc.get("cardNumber"), phone)
        digits = "".join(ch for ch in value.split(" · ", 1)[0] if ch.isdigit())
        if len(digits) not in (10, 11) and not (16 <= len(digits) <= 19):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите номер карты (16–19 цифр) или телефон СБП"}, ensure_ascii=False)}
        ph_c = phone.replace("'", "''")
        cur.execute(
            f"INSERT INTO {SCHEMA}.saved_cards (phone, card_value, card_key, source) "
            f"VALUES ('{ph_c}', '{value.replace(chr(39), chr(39)*2)}', '{digits}', 'manual') ON CONFLICT (phone, card_key) DO UPDATE SET hidden = FALSE, card_value = EXCLUDED.card_value"
        )
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- МОИ КАРТЫ: удалить (POST sub=card_delete) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "card_delete":
        raw_d = event.get("body") or "{}"
        bd = json.loads(raw_d) if isinstance(raw_d, str) else raw_d
        try:
            card_id = int(bd.get("id"))
        except (TypeError, ValueError):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указана карта"}, ensure_ascii=False)}
        cur.execute(f"UPDATE {SCHEMA}.saved_cards SET hidden = TRUE WHERE id = {card_id} AND phone = '{phone.replace(chr(39), chr(39)*2)}'")
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- КАРТА ПАРТНЁРА: отправить на идентификацию (POST sub=partner_card_submit) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "partner_card_submit":
        raw_p = event.get("body") or "{}"
        bp = json.loads(raw_p) if isinstance(raw_p, str) else raw_p
        pc_number = str(bp.get("cardNumber") or "").strip()
        pc_photo = str(bp.get("photoUrl") or "").strip()
        pc_digits = "".join(ch for ch in pc_number if ch.isdigit())
        if not (16 <= len(pc_digits) <= 19):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите номер карты партнёра (16–19 цифр)"}, ensure_ascii=False)}
        if not pc_photo.startswith("https://"):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Прикрепите фото карты партнёра"}, ensure_ascii=False)}
        ph_p = phone.replace("'", "''")
        cur.execute(
            f"SELECT id, full_name, partner_card_status FROM {SCHEMA}.applications "
            f"WHERE phone = '{ph_p}' AND (status = 'partner_card' OR (status = 'approved' AND COALESCE(partner_card_url, '') <> '')) ORDER BY created_at DESC LIMIT 1"
        )
        pa = cur.fetchone()
        if not pa:
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка с картой партнёра не найдена"}, ensure_ascii=False)}
        if (pa[2] or "none") == "approved":
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Идентификация уже одобрена"}, ensure_ascii=False)}
        cur.execute(
            f"UPDATE {SCHEMA}.applications SET partner_card_number = '{pc_number[:64].replace(chr(39), chr(39)*2)}', "
            f"partner_card_photo = '{pc_photo.replace(chr(39), chr(39)*2)}', partner_card_status = 'pending', "
            f"partner_card_sent_at = NOW(), partner_card_reject_reason = NULL WHERE id = {int(pa[0])}"
        )
        conn.commit()
        cur.close(); conn.close()
        import urllib.request as _ur
        tg_token_p = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if tg_token_p:
            try:
                _ur.urlopen(_ur.Request(
                    f"https://api.telegram.org/bot{tg_token_p}/sendMessage",
                    data=json.dumps({"chat_id": "8540431915", "parse_mode": "HTML", "text": (
                        f"🪪 <b>Клиент отправил карту партнёра на идентификацию</b>\n\n"
                        f"👤 <b>ФИО:</b> {pa[1] or phone}\n📞 <b>Телефон:</b> {phone}\n"
                        f"💳 <b>Карта партнёра:</b> {pc_number}\n🔖 <b>Заявка №:</b> {pa[0]}\n\n"
                        f"Откройте админку и одобрите или откажите в идентификации.")}).encode(),
                    headers={"Content-Type": "application/json"}), timeout=5)
            except Exception:
                pass
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- СОХРАНИТЬ НОМЕР КАРТЫ/СБП (PATCH) ---
    if event.get("httpMethod") == "PATCH":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        card_number = force_account_phone(b.get("cardNumber"), phone) if (b.get("cardNumber") or "").strip() else ""
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
            if activated_now:
                cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone='{ph_e}' AND virtual_card_status='active' AND virtual_card_number IS NOT NULL ORDER BY virtual_card_issued_at DESC LIMIT 1")
                _ca = cur.fetchone()
                if _ca:
                    ensure_card_fees(cur, _ca[0])
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

        if confirm and partner_card_blocked(cur, phone):
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": PARTNER_BLOCK_MSG}, ensure_ascii=False)}

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

    # --- КЛИЕНТ РЕДАКТИРУЕТ СВОЮ АНКЕТУ (POST, ?sub=profile_update) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "profile_update":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        if profile_locked(cur, user_id, phone):
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Анкету можно изменить только когда нет действующего займа"}, ensure_ascii=False)}

        def e(v):
            return str(v if v is not None else "").strip().replace("'", "''")

        full_name_n = e(b.get("fullName"))
        email_n = e(b.get("email"))
        if not full_name_n:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите ФИО"}, ensure_ascii=False)}

        cur.execute(f"UPDATE {SCHEMA}.users SET full_name = '{full_name_n}', email = '{email_n}' WHERE id = {user_id}")

        sets = [f"full_name = '{full_name_n}'", f"email = '{email_n}'"]
        for key, col in PROFILE_COLS.items():
            if key in b:
                sets.append(f"{col} = '{e(b.get(key))}'")
        if "salary" in b:
            sal = str(b.get("salary") or "").replace(" ", "").replace(",", ".")
            try:
                sets.append(f"salary = {float(sal)}" if sal else "salary = NULL")
            except ValueError:
                conn.rollback(); cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Зарплата должна быть числом"}, ensure_ascii=False)}

        for key, col in PROFILE_FILE_COLS.items():
            url_v = str(b.get(key) or "").strip()
            if url_v.startswith("https://"):
                sets.append(f"{col} = '{e(url_v)}'")

        ph_e = phone.replace("'", "''")
        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph_e}' ORDER BY created_at DESC LIMIT 1")
        latest = cur.fetchone()
        if not latest:
            conn.rollback(); cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Анкета не найдена"}, ensure_ascii=False)}
        old_keys = ["fullName", "email"] + list(PROFILE_COLS.keys()) + ["salary"] + list(PROFILE_FILE_COLS.keys())
        old_cols = ["full_name", "email"] + list(PROFILE_COLS.values()) + ["salary"] + list(PROFILE_FILE_COLS.values())
        cur.execute(f"SELECT {', '.join(old_cols)}, profile_changes FROM {SCHEMA}.applications WHERE id = {int(latest[0])}")
        old_row = cur.fetchone()
        changed = []
        for idx, key in enumerate(old_keys):
            if key not in b:
                continue
            old_v = old_row[idx]
            new_v = b.get(key)
            if key == "salary":
                try:
                    o_n = float(old_v) if old_v not in (None, "") else None
                    n_n = float(str(new_v or "").replace(" ", "").replace(",", ".")) if str(new_v or "").strip() else None
                except ValueError:
                    continue
                if o_n != n_n:
                    changed.append(PROFILE_LABELS[key])
            elif key in PROFILE_FILE_COLS:
                nv = str(new_v or "").strip()
                if nv.startswith("https://") and nv != str(old_v or "").strip():
                    changed.append(PROFILE_LABELS[key])
            else:
                if str(old_v or "").strip() != str(new_v or "").strip():
                    changed.append(PROFILE_LABELS[key])
        if changed:
            prev_list = [x for x in (old_row[-1] or "").split(", ") if x]
            merged_list = prev_list + [x for x in changed if x not in prev_list]
            sets.append("profile_updated_at = NOW()")
            sets.append(f"profile_changes = '{e(', '.join(merged_list))}'")
        cur.execute(f"UPDATE {SCHEMA}.applications SET {', '.join(sets)} WHERE id = {int(latest[0])}")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- КЛИЕНТ АКТИВИРУЕТ ПРОМОКОД НА СЛЕДУЮЩИЙ ЗАЙМ (POST, ?sub=promo_apply, body: {code}) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "promo_apply":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        code_e = (b.get("code") or "").strip().upper().replace("'", "''")
        ph_e = phone.replace("'", "''")
        cur.execute(f"SELECT promo_code FROM {SCHEMA}.users WHERE id = {user_id} AND promo_code IS NOT NULL")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "У вас уже есть активный промокод. Он применится к следующему займу"}, ensure_ascii=False)}
        cur.execute(
            f"UPDATE {SCHEMA}.promo_codes SET used_at=NOW(), used_phone='{ph_e}', used_for='cabinet' "
            f"WHERE code='{code_e}' AND used_at IS NULL RETURNING code, discount_percent"
        )
        r_ = cur.fetchone()
        if not code_e or not r_:
            conn.rollback(); cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Промокод недействителен или уже использован"}, ensure_ascii=False)}
        cur.execute(f"UPDATE {SCHEMA}.users SET promo_code='{r_[0]}', promo_discount={int(r_[1])} WHERE id = {user_id}")
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "code": r_[0], "discount": int(r_[1])})}

    # --- ПОДАТЬ ЗАЯВКУ НА КАРТУ РУСФИНАНС 24 (POST, ?sub=card_request) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "card_request":
        _bm = blocked_message(phone)
        if _bm:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": _bm}, ensure_ascii=False)}
        if applications_paused():
            cur.close(); conn.close()
            return {"statusCode": 503, "headers": CORS, "body": json.dumps({"error": pause_message()}, ensure_ascii=False)}
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
        cur.execute(
            f"SELECT birth_date, passport_series, passport_number, passport_date, passport_by, reg_address, living_address, "
            f"workplace, position, salary, snils, email FROM {SCHEMA}.applications WHERE phone = '{ph_e}' ORDER BY created_at DESC LIMIT 1"
        )
        pr = cur.fetchone()
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
            if pr:
                bd, ps, pn, pdt, pby, ra, la, wp, pos, sal, sn, em = pr
                lines = [
                    ("🎂 Дата рождения", bd), ("🪪 Паспорт", f"{ps or ''} {pn or ''}".strip()), ("📅 Выдан", pdt), ("🏢 Кем выдан", pby),
                    ("🏠 Регистрация", ra), ("📍 Проживание", la), ("💼 Работа", wp), ("👔 Должность", pos),
                    ("💰 Зарплата", f"{int(float(sal)):,} ₽".replace(",", " ") if sal else ""), ("🔢 СНИЛС", sn), ("✉️ Email", em),
                ]
                text += "\n\n<b>Анкета клиента:</b>\n" + "\n".join(f"{k}: {v}" for k, v in lines if v)
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

    # --- КЛИЕНТ ПОДПИСАЛ ДОПСОГЛАШЕНИЕ (POST, ?sub=addendum_sign) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "addendum_sign":
        ph_e = phone.replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.agreement_addenda SET signed_at = NOW() WHERE phone = '{ph_e}' AND version = 'v1' AND signed_at IS NULL")
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

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

    # --- КЛИЕНТ ЗАКРЫЛ УВЕДОМЛЕНИЕ О КАНИКУЛАХ (POST, ?sub=holiday_seen) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "holiday_seen":
        ph_e = phone.replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.credit_holidays SET seen = TRUE WHERE phone = '{ph_e}' AND seen = FALSE")
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- КЛИЕНТ ЗАКРЫЛ ПЛАШКУ «СТАВКА СНИЖЕНА» (POST, ?sub=rate_seen) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "rate_seen":
        ph_e = phone.replace("'", "''")
        cur.execute(f"UPDATE {SCHEMA}.rate_changes SET seen = TRUE WHERE phone = '{ph_e}' AND seen = FALSE")
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- КЛИЕНТ СООБЩАЕТ ОБ ОПЛАТЕ ЗАЙМА (POST, ?sub=loan_paid, body: {loanType, loanId, amount}) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "loan_paid":
        raw_b = event.get("body") or "{}"
        b = json.loads(raw_b) if isinstance(raw_b, str) else raw_b
        lp_type = str(b.get("loanType") or "").strip()
        try:
            lp_id = int(b.get("loanId") or 0)
            lp_amount = float(b.get("amount") or 0)
        except Exception:
            lp_id, lp_amount = 0, 0
        if lp_type not in ("loan", "carloan", "shoploan") or not lp_id or lp_amount <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан займ"})}
        ph_e = phone.replace("'", "''")
        if lp_type == "loan":
            cur.execute(f"SELECT id FROM {SCHEMA}.loans WHERE id = {lp_id} AND user_id = {user_id}")
        elif lp_type == "carloan":
            cur.execute(f"SELECT id FROM {SCHEMA}.car_loan_applications WHERE id = {lp_id} AND phone = '{ph_e}'")
        else:
            cur.execute(f"SELECT id FROM {SCHEMA}.shopping_loan_applications WHERE id = {lp_id} AND phone = '{ph_e}'")
        if not cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Займ не найден"})}
        cur.execute(f"SELECT id FROM {SCHEMA}.loan_payment_notices WHERE loan_type = '{lp_type}' AND loan_id = {lp_id} AND status = 'new' LIMIT 1")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "alreadySent": True})}
        cur.execute(
            f"INSERT INTO {SCHEMA}.loan_payment_notices (loan_type, loan_id, phone, amount) "
            f"VALUES ('{lp_type}', {lp_id}, '{ph_e}', {lp_amount})"
        )
        conn.commit()
        cur.close(); conn.close()

        import urllib.request
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if tg_token:
            kind = {"loan": "Займ", "carloan": "Автозайм", "shoploan": "Займ на покупки"}[lp_type]
            text = (
                f"💳 <b>Клиент сообщил об оплате займа</b>\n\n"
                f"👤 <b>ФИО:</b> {full_name or phone}\n"
                f"📞 <b>Телефон:</b> {phone}\n"
                f"📄 <b>{kind} №{lp_id}</b>\n"
                f"💵 <b>Сумма:</b> {int(lp_amount):,} ₽\n".replace(",", " ") +
                f"Проверьте поступление и нажмите «Проверено» в карточке займа."
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
        wd_card = force_account_phone(str(b.get("cardNumber") or ""), phone)
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
            f"SELECT COALESCE(SUM(amount),0), COALESCE(SUM(amount + ROUND(amount * rate / 100 * weeks)),0) "
            f"FROM {SCHEMA}.card_transactions WHERE application_id = {card_app_id} AND status != 'cancelled'"
        )
        _pr, _gr = cur.fetchone()
        used = float(_pr)
        cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {card_app_id}")
        used = max(0.0, used - principal_part(float(_pr), float(_gr), float(cur.fetchone()[0])))
        fees_total = ensure_card_fees(cur, card_app_id)
        conn.commit()
        available = card_limit - used - fees_total
        transfer_fee = card_transfer_fee(wd_amount)
        if wd_amount + transfer_fee > available:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Сумма с комиссией {int(wd_amount + transfer_fee):,} ₽ превышает доступный остаток лимита ({int(available):,} ₽)".replace(",", " ")})}

        CARD_WEEKLY_RATE = 24.0  # 24% в неделю, фиксировано, без пересчёта
        cur.execute(
            f"INSERT INTO {SCHEMA}.card_transactions (application_id, phone, amount, weeks, rate, status, target_card) "
            f"VALUES ({card_app_id}, '{ph_e}', {wd_amount}, {wd_weeks}, {CARD_WEEKLY_RATE}, 'active', '{wd_card_e}') RETURNING id"
        )
        tx_id = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.card_fees (application_id, amount, kind, period_no) "
            f"VALUES ({card_app_id}, {transfer_fee}, 'transfer', {tx_id}) ON CONFLICT DO NOTHING"
        )
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

    # --- ЗАЯВКА НА АВТОЗАЙМ / ЗАЙМ НА ПОКУПКИ ИЗ ЛИЧНОГО КАБИНЕТА (POST, ?sub=term_request) ---
    if event.get("httpMethod") == "POST" and (event.get("queryStringParameters") or {}).get("sub") == "term_request":
        _bm = blocked_message(phone)
        if _bm:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": _bm}, ensure_ascii=False)}
        if applications_paused():
            cur.close(); conn.close()
            return {"statusCode": 503, "headers": CORS, "body": json.dumps({"error": pause_message()}, ensure_ascii=False)}
        raw_t = event.get("body") or "{}"
        bt = json.loads(raw_t) if isinstance(raw_t, str) else raw_t
        kind = bt.get("kind")
        if kind not in ("car", "shop"):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестный вид займа"})}
        try:
            t_amount = int(float(bt.get("amount") or 0))
            t_months = int(bt.get("months") or 0)
        except (TypeError, ValueError):
            t_amount, t_months = 0, 0
        lo, hi, mmax = (100000, 1000000, 36) if kind == "car" else (3000, 150000, 24)
        if not (lo <= t_amount <= hi) or not (1 <= t_months <= mmax):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Сумма от {lo} до {hi} ₽, срок от 1 до {mmax} мес."})}
        t_card = force_account_phone(bt.get("cardNumber"), phone)
        t_digits = "".join(ch for ch in t_card.split(" · ", 1)[0] if ch.isdigit())
        if not (len(t_digits) in (10, 11) or 16 <= len(t_digits) <= 19):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер карты (16–19 цифр) или телефон СБП"})}

        def q(x):
            return str(x if x is not None else "").strip().replace("'", "''")

        ph_t = phone.replace("'", "''")
        tbl = "car_loan_applications" if kind == "car" else "shopping_loan_applications"
        cur.execute(f"SELECT id FROM {SCHEMA}.{tbl} WHERE phone = '{ph_t}' AND status IN ('pending','approved','signing') AND disbursed_at IS NULL LIMIT 1")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "У вас уже есть заявка этого вида на рассмотрении"})}

        cur.execute(f"""
            SELECT full_name, email, birth_date, birth_place, passport_series, passport_number, passport_date, passport_code, passport_by,
                   telegram_id, snils, workplace, position, work_phone, salary, contact_person,
                   file_passport, file_registration, file_selfie, file_previous_passports,
                   reg_address, living_address, work_address
            FROM {SCHEMA}.applications WHERE phone = '{ph_t}' ORDER BY created_at DESC LIMIT 1
        """)
        pr = cur.fetchone()
        if not pr:
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Сначала заполните анкету: оформите любую заявку", "needProfile": True})}
        (p_name, p_email, p_bd, p_bp, p_ps, p_pn, p_pd, p_pc, p_pby, p_tg, p_snils, p_wp, p_pos, p_wph, p_sal, p_cp,
         f_pass, f_reg, f_self, f_prev, p_reg, p_live, p_work) = pr
        sal_sql = str(float(p_sal)) if p_sal else "NULL"
        bd_sql = f"'{q(p_bd)}'" if p_bd else "NULL"

        promo_code_v, promo_disc_v = None, 0
        cur.execute(f"SELECT promo_code, promo_discount FROM {SCHEMA}.users WHERE id = {user_id} AND promo_code IS NOT NULL")
        sv_t = cur.fetchone()
        if sv_t:
            promo_code_v, promo_disc_v = sv_t[0], int(sv_t[1])
            cur.execute(f"UPDATE {SCHEMA}.users SET promo_code=NULL, promo_discount=0 WHERE id = {user_id}")
        promo_sql = f"'{promo_code_v}'" if promo_code_v else "NULL"

        if kind == "car":
            brand, model = q(bt.get("carBrand")), q(bt.get("carModel"))
            try:
                c_year = int(bt.get("carYear") or 0)
                c_mileage = int(bt.get("carMileage") or 0)
            except (TypeError, ValueError):
                c_year, c_mileage = 0, 0
            if not brand or not model or not c_year:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните марку, модель и год автомобиля"})}
            issued = ", ".join(x for x in [q(p_pd), q(p_pby), f"код {q(p_pc)}" if p_pc else ""] if x)
            cur.execute(
                f"INSERT INTO {SCHEMA}.car_loan_applications "
                f"(full_name, phone, email, birth_date, address, passport_serial, passport_num, passport_issued, "
                f" car_brand, car_model, car_year, car_mileage, contact_person, card_number, loan_amount, loan_months, "
                f" status, created_at, updated_at, promo_code, promo_discount, living_address, work_address, "
                f" birth_place, passport_code, snils, workplace, position, work_phone, salary, telegram_id, "
                f" file_passport, file_registration, file_selfie, file_previous_passports, file_vehicle_doc) "
                f"VALUES ('{q(p_name or full_name)}','{ph_t}','{q(p_email)}',{bd_sql},'{q(p_reg)}','{q(p_ps)}','{q(p_pn)}','{issued}',"
                f"'{brand}','{model}',{c_year},{c_mileage},'{q(p_cp)}','{q(t_card)}',{t_amount},{t_months},"
                f"'pending',NOW(),NOW(),{promo_sql},{promo_disc_v},'{q(p_live)}','{q(p_work)}',"
                f"'{q(p_bp)}','{q(p_pc)}','{q(p_snils)}','{q(p_wp)}','{q(p_pos)}','{q(p_wph)}',{sal_sql},'{q(p_tg)}',"
                f"'{q(f_pass)}','{q(f_reg)}','{q(f_self)}','{q(f_prev)}','{q(bt.get('fileVehicleDoc'))}') RETURNING id"
            )
            title = f"🚗 <b>Новая заявка на автозайм #{{id}} (из кабинета)</b>\n\n🚘 <b>Авто:</b> {brand} {model} {c_year}\n"
        else:
            shop, item = q(bt.get("shopName")), q(bt.get("itemName"))
            try:
                item_price = int(bt.get("itemPrice") or 0)
            except (TypeError, ValueError):
                item_price = 0
            if not item:
                cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите название товара"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.shopping_loan_applications "
                f"(full_name, phone, email, birth_date, address, passport_series, passport_number, "
                f" passport_date, passport_by, snils, shop_name, item_name, item_price, "
                f" loan_amount, loan_months, contact_person, card_number, "
                f" file_passport, file_registration, file_selfie, file_snils, "
                f" status, created_at, updated_at, promo_code, promo_discount, living_address, work_address, "
                f" birth_place, passport_code, workplace, position, work_phone, salary, telegram_id, file_previous_passports) "
                f"VALUES ('{q(p_name or full_name)}','{ph_t}','{q(p_email)}',{bd_sql},'{q(p_reg)}',"
                f"'{q(p_ps)}','{q(p_pn)}','{q(p_pd)}','{q(p_pby)}',"
                f"'{q(p_snils)}','{shop}','{item}',{item_price},"
                f"{t_amount},{t_months},'{q(p_cp)}','{q(t_card)}',"
                f"'{q(f_pass)}','{q(f_reg)}','{q(f_self)}','',"
                f"'pending',NOW(),NOW(),{promo_sql},{promo_disc_v},'{q(p_live)}','{q(p_work)}',"
                f"'{q(p_bp)}','{q(p_pc)}','{q(p_wp)}','{q(p_pos)}','{q(p_wph)}',{sal_sql},'{q(p_tg)}','{q(f_prev)}') RETURNING id"
            )
            title = f"🛍 <b>Новая заявка на займ для покупок #{{id}} (из кабинета)</b>\n\n🛒 <b>Товар:</b> {item}\n"
        new_tid = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()

        import urllib.request
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if tg_token:
            text = (
                title.replace("{id}", str(new_tid)) +
                f"👤 <b>ФИО:</b> {p_name or full_name or phone}\n📞 <b>Телефон:</b> {phone}\n"
                f"💰 <b>Сумма:</b> {t_amount:,} ₽\n".replace(",", " ") +
                f"📅 <b>Срок:</b> {t_months} мес.\n🪪 Анкета подтянута из предыдущей заявки клиента"
            )
            try:
                urllib.request.urlopen(urllib.request.Request(
                    f"https://api.telegram.org/bot{tg_token}/sendMessage",
                    data=json.dumps({"chat_id": "8540431915", "text": text, "parse_mode": "HTML"}).encode(),
                    headers={"Content-Type": "application/json"}), timeout=5)
            except Exception:
                pass
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_tid})}

    # --- ПОВТОРНАЯ ЗАЯВКА НА ЗАЙМ ИЗ ЛИЧНОГО КАБИНЕТА (POST) ---
    if event.get("httpMethod") == "POST":
        _bm = blocked_message(phone)
        if _bm:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": _bm}, ensure_ascii=False)}
        if applications_paused():
            cur.close(); conn.close()
            return {"statusCode": 503, "headers": CORS, "body": json.dumps({"error": pause_message()}, ensure_ascii=False)}
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


        chosen_card = force_account_phone(b.get("cardNumber"), phone)
        chosen_digits = "".join(ch for ch in chosen_card.split(" · ", 1)[0] if ch.isdigit())
        if not (len(chosen_digits) in (10, 11) or 16 <= len(chosen_digits) <= 19):
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите номер карты (16–19 цифр) или телефон СБП, куда перевести деньги"}, ensure_ascii=False)}

        cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph_e}' AND status = 'pending' LIMIT 1")
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "У вас уже есть заявка на рассмотрении"})}

        promo_in = (b.get("promoCode") or "").strip().upper().replace("'", "''")
        promo_code_v, promo_disc_v = None, 0
        if promo_in:
            cur.execute(
                f"UPDATE {SCHEMA}.promo_codes SET used_at=NOW(), used_phone='{ph_e}', used_for='loan' "
                f"WHERE code='{promo_in}' AND used_at IS NULL RETURNING code, discount_percent"
            )
            red = cur.fetchone()
            if not red:
                conn.rollback(); cur.close(); conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Промокод недействителен или уже использован"}, ensure_ascii=False)}
            promo_code_v, promo_disc_v = red[0], int(red[1])
        else:
            cur.execute(f"SELECT promo_code, promo_discount FROM {SCHEMA}.users WHERE id = {user_id} AND promo_code IS NOT NULL")
            sv = cur.fetchone()
            if sv:
                promo_code_v, promo_disc_v = sv[0], int(sv[1])
                cur.execute(f"UPDATE {SCHEMA}.users SET promo_code=NULL, promo_discount=0 WHERE id = {user_id}")
        promo_sql = f"'{promo_code_v}'" if promo_code_v else "NULL"

        # Берём анкетные данные из последней заявки клиента, чтобы не заставлять
        # заново вводить паспорт/работу — это же наш повторный клиент.
        cur.execute(f"""
            SELECT birth_date, birth_place, passport_series, passport_number, passport_date, passport_code, passport_by,
                   telegram_id, snils, workplace, position, work_phone, salary, contact_person, card_number_transfer,
                   file_passport, file_registration, file_selfie, file_previous_passports, email, profile_updated_at, profile_changes,
                   reg_address, living_address, work_address
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
             file_passport, file_registration, file_selfie, file_previous_passports, prev_email, prev_profile_updated, prev_profile_changes,
             reg_address, living_address, work_address) = prev
        else:
            birth_date = birth_place = passport_series = passport_number = passport_date = passport_code = passport_by = None
            telegram_id = snils = workplace = position = work_phone = contact_person = card_number_transfer = None
            file_passport = file_registration = file_selfie = file_previous_passports = None
            salary = None
            prev_email = None
            prev_profile_updated = None
            prev_profile_changes = None
            reg_address = living_address = work_address = None

        if True:
            card_number_transfer = chosen_card
            cur.execute(
                f"INSERT INTO {SCHEMA}.saved_cards (phone, card_value, card_key, source) "
                f"VALUES ('{ph_e}', '{chosen_card.replace(chr(39), chr(39)*2)}', '{chosen_digits}', 'manual') "
                f"ON CONFLICT (phone, card_key) DO UPDATE SET hidden = FALSE"
            )

        salary_val = str(float(salary)) if salary is not None else "NULL"
        email_val = v(email or prev_email)
        fn_e = (full_name or "").replace("'", "''")

        cur.execute(f"""
            INSERT INTO {SCHEMA}.applications
                (full_name, phone, email, amount, days, birth_date, birth_place,
                 passport_series, passport_number, passport_date, passport_code, passport_by,
                 telegram_id, status, file_passport, file_registration, file_selfie, file_previous_passports,
                 snils, workplace, position, work_phone, salary, contact_person, card_number_transfer,
                 promo_code, promo_discount, profile_updated_at, profile_changes,
                 reg_address, living_address, work_address, is_credit_doctor)
            VALUES (
                '{fn_e}', '{ph_e}', {email_val}, {amount}, {days},
                {v(birth_date)}, {v(birth_place)}, {v(passport_series)}, {v(passport_number)}, {v(passport_date)}, {v(passport_code)}, {v(passport_by)},
                {v(telegram_id)}, 'pending', {v(file_passport)}, {v(file_registration)}, {v(file_selfie)}, {v(file_previous_passports)},
                {v(snils)}, {v(workplace)}, {v(position)}, {v(work_phone)}, {salary_val}, {v(contact_person)}, {v(card_number_transfer)},
                {promo_sql}, {promo_disc_v}, {v(prev_profile_updated)}, {v(prev_profile_changes)},
                {v(reg_address)}, {v(living_address)}, {v(work_address)}, {"TRUE" if b.get("isCreditDoctor") else "FALSE"}
            ) RETURNING id
        """)
        new_app_id = cur.fetchone()[0]
        apply_wheel_prize(cur, SCHEMA, b.get("wheelVisitorId"), new_app_id)
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
                f"📅 <b>Срок:</b> {days} дн.\n" +
                (f"✏️ <b>Клиент обновил анкету:</b> {prev_profile_changes}\n" if prev_profile_updated and prev_profile_changes else "✏️ <b>Клиент обновил анкету</b>\n" if prev_profile_updated else "") +
                (f"🎟 <b>Промокод:</b> {promo_code_v} (−{promo_disc_v}% на проценты)\n" if promo_code_v else "") +
                f"\nКлиент уже брал займ ранее — заявка подана через личный кабинет."
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

        if partner_card_blocked(cur, phone):
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": PARTNER_BLOCK_MSG}, ensure_ascii=False)}

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
        f"SELECT id, amount, days, rate, status, created_at, signed, offer_amount, offer_days, offer_rate, disbursed_at, insurance_amount, wheel_discount_rub FROM {SCHEMA}.loans WHERE user_id = {user_id} ORDER BY created_at DESC"
    )
    rows = cur.fetchall()

    # Получаем последнюю заявку пользователя (+ вся анкета)
    cur.execute(
        f"SELECT id, amount, days, status, created_at, approved_amount, approved_rate, approved_days, reject_reason, card_number, contract_url, "
        f"virtual_card_number, virtual_card_expiry, virtual_card_cvv, virtual_card_holder, virtual_card_limit, virtual_card_rate, virtual_card_status, "
        f"is_credit_doctor, full_name, email, birth_date, birth_place, passport_series, passport_number, passport_date, passport_code, passport_by, "
        f"workplace, position, work_phone, salary, contact_person, snils, reviewed_at, video_call_requested, virtual_card_days, partner_card_url, insurance_amount, virtual_card_issued_at, "
        f"file_passport, file_registration, file_selfie, file_previous_passports "
        f"FROM {SCHEMA}.applications "
        f"WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' ORDER BY created_at DESC LIMIT 1"
    )
    app_row = cur.fetchone()
    card_app_id = app_row[0] if app_row else None
    partner_card_info = {"status": "none", "number": "", "photo": "", "rejectReason": ""}
    reject_partner_url = ""
    cd_paid = False
    if app_row:
        cur.execute(f"SELECT COALESCE(cd_paid, FALSE) FROM {SCHEMA}.applications WHERE id = {int(app_row[0])}")
        cd_paid = bool((cur.fetchone() or (False,))[0])
        cur.execute(
            f"SELECT partner_card_status, partner_card_number, partner_card_photo, partner_card_reject_reason, reject_partner_url "
            f"FROM {SCHEMA}.applications WHERE id = {int(app_row[0])}"
        )
        _pc = cur.fetchone()
        if _pc:
            partner_card_info = {"status": _pc[0] or "none", "number": _pc[1] or "", "photo": _pc[2] or "", "rejectReason": _pc[3] or ""}
            reject_partner_url = _pc[4] or ""
    if app_row and not app_row[11]:
        cur.execute(
            f"SELECT id, virtual_card_number, virtual_card_expiry, virtual_card_cvv, virtual_card_holder, virtual_card_limit, "
            f"virtual_card_rate, virtual_card_status, virtual_card_days, virtual_card_issued_at "
            f"FROM {SCHEMA}.applications "
            f"WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' AND virtual_card_number IS NOT NULL "
            f"AND virtual_card_status IN ('pending','active','blocked') "
            f"ORDER BY virtual_card_issued_at DESC NULLS LAST, created_at DESC LIMIT 1"
        )
        card_src = cur.fetchone()
        if card_src:
            merged = list(app_row)
            merged[11], merged[12], merged[13], merged[14] = card_src[1], card_src[2], card_src[3], card_src[4]
            merged[15], merged[16], merged[17] = card_src[5], card_src[6], card_src[7]
            merged[36], merged[39] = card_src[8], card_src[9]
            app_row = tuple(merged)
            card_app_id = card_src[0]
    holidays = load_holidays(cur, phone)
    card_hol = holiday_map(holidays, "card").get(card_app_id) if card_app_id else None
    card_contract_url = ""
    if card_app_id:
        cur.execute(f"SELECT card_contract_url FROM {SCHEMA}.applications WHERE id = {int(card_app_id)}")
        _cc = cur.fetchone()
        card_contract_url = _cc[0] if _cc and _cc[0] else ""
    application = None
    app_promo_discount = 0
    app_promo_code = ""
    app_promo_savings = 0
    app_created_dt = None
    app_wheel_rub = 0
    if app_row:
        cur.execute(f"SELECT promo_code, promo_discount, wheel_discount_rub FROM {SCHEMA}.applications WHERE id = {int(app_row[0])}")
        _ap = cur.fetchone()
        app_wheel_rub = int(_ap[2]) if _ap and _ap[2] else 0
        app_promo_discount = int(_ap[1]) if _ap and _ap[1] else 0
        app_promo_code = _ap[0] if _ap and _ap[0] else ""
        app_created_dt = app_row[4]
        app_amount = float(app_row[1]) if app_row[1] else 0
        app_days = app_row[2] or 0
        approved_amount = float(app_row[5]) if app_row[5] else None
        rate_is_final = bool(app_row[6])
        approved_rate = float(app_row[6]) if app_row[6] else 0.008
        if not rate_is_final and app_promo_discount:
            approved_rate = round(0.008 * (100 - app_promo_discount) / 100, 5)
        approved_days = int(app_row[7]) if app_row[7] else app_days
        insurance_amount_app = float(app_row[38]) if app_row[38] else 0
        eff_amount = approved_amount if approved_amount else app_amount
        eff_debt = eff_amount + insurance_amount_app
        approved_interest = round(eff_debt * approved_rate * approved_days)
        wheel_rub_applied = min(app_wheel_rub, approved_interest)
        approved_interest -= wheel_rub_applied
        approved_total = eff_debt + approved_interest
        app_promo_savings = 0
        if app_promo_discount and app_promo_discount < 100:
            base_rate_ = approved_rate / (100 - app_promo_discount) * 100
            app_promo_savings = max(0, round(eff_debt * base_rate_ * approved_days) - approved_interest)
        reviewed_at = app_row[34]
        reapply_days_left = None
        _ph10 = re.sub(r"\D", "", str(phone))[-10:]
        cur.execute(f"SELECT until_at FROM {SCHEMA}.reapply_blocks WHERE phone10 = '{_ph10}'")
        _rb = cur.fetchone()
        if _rb:
            _left = (_rb[0] - datetime.now()).total_seconds()
            reapply_days_left = int(-(-_left // 86400)) if _left > 0 else 0
        vc_days = int(app_row[36]) if app_row[36] else None

        # Транзакции (переводы) по карте: каждая — со своим еженедельным графиком погашения
        vc_transactions = []
        vc_used = 0.0
        vc_debt = 0.0
        vc_early_debt = None
        vc_early_gross = 0.0
        vc_pen_rows = []
        vc_penalty = 0.0
        vc_overdue_days = 0
        vc_repaid = 0.0
        vc_repayments = []
        vc_notices = []
        vc_paid = []
        vc_limit_news = []
        if app_row[11]:
            cur.execute(
                f"SELECT id, amount, weeks, rate, status, created_at, disbursed_amount, disbursed_at, target_card FROM {SCHEMA}.card_transactions "
                f"WHERE application_id = {card_app_id} ORDER BY created_at DESC"
            )
            for tx_id, tx_amount, tx_weeks, tx_rate, tx_status, tx_created, tx_disb_amount, tx_disb_at, tx_target in cur.fetchall():
                tx_amount = float(tx_amount)
                tx_rate = float(tx_rate)
                tx_interest_total = round(tx_amount * tx_rate / 100 * tx_weeks)
                tx_total = tx_amount + tx_interest_total
                if tx_status != "cancelled":
                    _ew = min(int(tx_weeks), started_units(tx_created, 7))
                    vc_early_gross += tx_amount + round(tx_amount * tx_rate / 100 * _ew)
                    vc_used += tx_amount
                    vc_debt += tx_total
                    vc_pen_rows.append((tx_amount, tx_weeks, tx_created))
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
            cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.card_repayments WHERE application_id = {card_app_id}")
            vc_repaid = float(cur.fetchone()[0])
            cur.execute(
                f"SELECT amount, note, created_at FROM {SCHEMA}.card_repayments "
                f"WHERE application_id = {card_app_id} AND amount > 0 ORDER BY created_at DESC"
            )
            _share = (vc_used / vc_debt) if vc_debt > 0 else 0.0
            vc_repayments = [{
                "amount": float(r_amt), "note": r_note or "",
                "createdAt": msk(r_at).strftime("%d.%m.%Y в %H:%M"),
                "principal": round(float(r_amt) * _share),
                "interest": float(r_amt) - round(float(r_amt) * _share),
            } for r_amt, r_note, r_at in cur.fetchall()]
            cur.execute(
                f"SELECT tx_id, due_date, status FROM {SCHEMA}.card_payment_notices WHERE application_id = {card_app_id}"
            )
            for n_tx, n_due, n_status in cur.fetchall():
                key_ = f"{n_tx or 0}|{n_due}"
                (vc_notices if n_status == "new" else vc_paid).append(key_)
            vc_gross = vc_debt
            vc_penalty, vc_overdue_days = card_penalty(vc_pen_rows, vc_gross, vc_repaid, card_hol)
            vc_debt = max(0.0, vc_debt + vc_penalty - vc_repaid)
            vc_early_debt = max(0.0, vc_early_gross - vc_repaid) if vc_overdue_days == 0 else None
            vc_used = max(0.0, vc_used - principal_part(vc_used, vc_gross, vc_repaid))
            cur.execute(
                f"SELECT added_amount, new_limit FROM {SCHEMA}.card_limit_increases "
                f"WHERE application_id = {card_app_id} AND seen = FALSE ORDER BY created_at ASC"
            )
            vc_limit_news = [{"added": float(a_), "newLimit": float(n_)} for a_, n_ in cur.fetchall()]

        vc_limit_val = float(app_row[15]) if app_row[15] else 0
        vc_fees_total = 0.0
        vc_fee_list = []
        if app_row[11] and card_app_id:
            vc_fees_total = ensure_card_fees(cur, card_app_id)
            conn.commit()
            cur.execute(f"SELECT amount, kind, period_no, created_at, note FROM {SCHEMA}.card_fees WHERE application_id = {int(card_app_id)} AND cancelled_at IS NULL ORDER BY created_at DESC, id DESC")
            vc_fee_list = [{
                "amount": float(a_), "kind": k_,
                "title": "Ежемесячное обслуживание" if k_ == "monthly" else (("Списание: " + nt_) if nt_ else "Списание") if k_ == "manual" else f"Комиссия за перевод №{n_}",
                "createdAt": msk(c_).strftime("%d.%m.%Y в %H:%M"),
            } for a_, k_, n_, c_, nt_ in cur.fetchall()]
        vc_available = max(0, vc_limit_val - vc_used - vc_fees_total)

        application = {
            "id": app_row[0],
            "amount": app_amount,
            "days": app_days,
            "status": app_row[3],
            "createdAt": app_row[4].strftime("%d.%m.%Y"),
            "approvedAmount": approved_amount,
            "approvedRate": approved_rate,
            "approvedRatePercent": round(approved_rate * 100, 1),
            "promoCode": app_promo_code,
            "promoDiscount": app_promo_discount,
            "wheelDiscountRub": wheel_rub_applied if app_row else 0,
            "virtualCardOwn": bool(card_app_id == app_row[0]),
            "promoSavings": app_promo_savings,
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
                "contractUrl": card_contract_url,
                "available": vc_available,
                "monthlyFee": CARD_MONTHLY_FEE,
                "feesTotal": vc_fees_total,
                "feeList": vc_fee_list,
                "rate": float(app_row[16]) if app_row[16] else 0,
                "status": app_row[17] or "none",
                "days": vc_days,
                "transactions": vc_transactions,
                "debt": vc_debt,
                "penalty": vc_penalty,
                "overdueDays": vc_overdue_days,
                "penaltyRatePercent": 2.99,
                "repaid": vc_repaid,
                "repayments": vc_repayments,
                "pendingNotices": vc_notices,
                "paidNotices": vc_paid,
                "limitIncreases": vc_limit_news,
                "earlyDebt": vc_early_debt if (vc_early_debt is not None and 0 < vc_early_debt < vc_debt) else None,
                "minPaymentPercent": CARD_MIN_PAYMENT_PERCENT,
                "minPayment": round(vc_debt * CARD_MIN_PAYMENT_PERCENT / 100),
                "paymentSchedule": card_payment_schedule(app_row[39], vc_debt),
                "appId": card_app_id,
                "holidayUntil": card_hol.strftime("%d.%m.%Y") if card_hol and card_hol >= (datetime.utcnow() + timedelta(hours=3)).date() else None,
            } if app_row[11] else None,
            "isCreditDoctor": bool(app_row[18]) if app_row[18] is not None else False,
            "reapplyDaysLeft": reapply_days_left,
            "videoCallRequested": bool(app_row[35]) if app_row[35] is not None else False,
            "partnerCardUrl": app_row[37] or "",
            "partnerCard": partner_card_info,
            "rejectPartnerUrl": reject_partner_url,
            "cdPaid": cd_paid,
            "insuranceAmount": insurance_amount_app,
        }
        cur.execute(f"SELECT reg_address, living_address, work_address FROM {SCHEMA}.applications WHERE id = {int(app_row[0])}")
        _pa = cur.fetchone() or (None, None, None)
        profile_addr = [_pa[0] or "", _pa[1] or "", _pa[2] or ""]
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
            "regAddress": profile_addr[0],
            "livingAddress": profile_addr[1],
            "workAddress": profile_addr[2],
            "filePassport": app_row[40] or "",
            "fileRegistration": app_row[41] or "",
            "fileSelfie": app_row[42] or "",
            "filePreviousPassports": app_row[43] or "",
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

    profile_editable = not profile_locked(cur, user_id, phone)
    cur.execute(f"SELECT promo_code, promo_discount FROM {SCHEMA}.users WHERE id = {user_id}")
    _pr = cur.fetchone()
    user_promo = {"code": _pr[0], "discount": int(_pr[1])} if _pr and _pr[0] else None

    cur.execute(f"SELECT loan_type, loan_id FROM {SCHEMA}.loan_payment_notices WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' AND status = 'new'")
    loan_notices = [f"{r_[0]}|{r_[1]}" for r_ in cur.fetchall()]
    cur.execute(f"SELECT 1 FROM {SCHEMA}.agreement_addenda WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' AND version = 'v1' AND signed_at IS NULL LIMIT 1")
    addendum_pending = bool(cur.fetchone())
    cur.execute(
        f"SELECT product_type, old_rate, new_rate, unit FROM {SCHEMA}.rate_changes "
        f"WHERE phone = '{phone.replace(chr(39), chr(39)*2)}' AND seen = FALSE ORDER BY created_at ASC"
    )
    rate_news = [{"type": t_, "oldRate": float(o_), "newRate": float(n_), "unit": u_} for t_, o_, n_, u_ in cur.fetchall()]
    hol_map = holiday_map(holidays)
    cur.execute(f"SELECT blocked_until FROM {SCHEMA}.users WHERE id = {int(user_id)} AND blocked_until > NOW()")
    _bu = cur.fetchone()
    blocked_until = msk(_bu[0]).strftime("%d.%m.%Y %H:%M") if _bu else None
    cur.execute(f"SELECT until_at, reason FROM {SCHEMA}.reapply_blocks WHERE phone10 = '{re.sub(chr(92)+'D', '', str(phone))[-10:]}' AND until_at > NOW()")
    _rb2 = cur.fetchone()
    reapply_info = {"until": msk(_rb2[0]).strftime("%d.%m.%Y"), "reason": _rb2[1] or ""} if _rb2 else None
    cur.close(); conn.close()

    is_cd = bool(application and application.get("isCreditDoctor"))

    loans = []
    for row in rows:
        loan_id, amount, days, rate, db_status, created_at, signed, offer_amount, offer_days, offer_rate, disbursed_at, loan_insurance, loan_wheel_db = row
        loan_insurance = float(loan_insurance) if loan_insurance else 0
        loan_payments = payments_by_loan.get(loan_id, [])
        paid_total = sum(p["amount"] for p in loan_payments)

        loan_wheel_rub = 0
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
                amount, days, rate, disbursed_at, created_at, paid_total, db_status, loan_wheel_db, hol_map.get(loan_id)
            )
            interest = round(base_total - float(amount))
            if loan_wheel_db:
                loan_wheel_rub = min(int(loan_wheel_db), round(float(amount) * float(rate) * int(days)))

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
                hol_until = hol_map.get(loan_id)
                due_dt = (start + timedelta(days=days)).date() if hasattr(start, "date") else None
                on_holiday = bool(hol_until and due_dt and hol_until > due_dt and datetime.now().date() <= hol_until and status != "paid")
                weeks = -(-int(days) // 7)
                if weeks > 1:
                    base_part = round(base_total / weeks)
                    acc_w = 0
                    for w in range(1, weeks + 1):
                        part = base_part if w < weeks else round(base_total) - acc_w
                        acc_w += part
                        due_w = start + timedelta(days=min(7 * w, int(days)))
                        schedule.append({
                            "week": w,
                            "dueDate": due_w.strftime("%d.%m.%Y"),
                            "amount": part + (penalty if (w == weeks and penalty) else 0),
                            "label": f"Платёж {w} из {weeks} (раз в неделю)",
                        })
                else:
                    schedule = [{
                        "dueDate": (start + timedelta(days=days)).strftime("%d.%m.%Y"),
                        "amount": total,
                        "label": "Погашение полной суммы" if not penalty else f"Погашение с пеней за просрочку ({overdue_days} дн.)",
                    }]
                if on_holiday:
                    schedule[-1]["holidayUntil"] = hol_until.strftime("%d.%m.%Y")
                    schedule[-1]["label"] = f"Кредитные каникулы до {hol_until.strftime('%d.%m.%Y')}"

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
            "penaltyRatePercent": round(OVERDUE_DAILY_PENALTY_RATE * 100, 2),
            "createdAt": created_at.strftime("%d.%m.%Y"),
            "signed": signed,
            "disbursedAt": msk(disbursed_at).strftime("%d.%m.%Y в %H:%M") if disbursed_at else None,
            "payments": loan_payments,
            "paidTotal": paid_total,
            "remaining": max(0, total - paid_total),
            "schedule": schedule,
        }
        if status == "active" and disbursed_at and not is_monthly_cd:
            e_days = min(int(days), started_units(disbursed_at, 1))
            e_interest = round(float(amount) * float(rate) * e_days)
            e_interest -= min(int(loan_wheel_db or 0), e_interest)
            e_remaining = max(0.0, float(amount) + e_interest - paid_total)
            if paid_total > 0 and e_remaining <= 0:
                loan_data["status"] = "paid"
                loan_data["remaining"] = 0
                status = "paid"
            elif 0 < e_remaining < loan_data["remaining"]:
                loan_data["earlyPayoff"] = {
                    "days": e_days,
                    "interest": e_interest,
                    "remaining": e_remaining,
                    "saving": loan_data["remaining"] - e_remaining,
                }
        if loan_wheel_rub:
            loan_data["wheelDiscountRub"] = loan_wheel_rub
        if app_promo_discount and app_promo_discount < 100 and app_created_dt and created_at >= app_created_dt - timedelta(minutes=1):
            base_rate_l = float(rate) / (100 - app_promo_discount) * 100
            full_interest = round(float(amount) * base_rate_l * days)
            if not is_monthly_cd and full_interest > interest:
                loan_data["promoCode"] = app_promo_code
                loan_data["promoDiscount"] = app_promo_discount
                loan_data["promoSavings"] = full_interest - interest
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
            "rateNews": rate_news,
            "loans": loans,
            "application": application,
            "isRepeatClient": len(loans) > 0,
            "cardRequest": card_request,
            "loanNotices": loan_notices,
            "promo": user_promo,
            "profileEditable": profile_editable,
            "addendumPending": addendum_pending,
            "holidays": holidays,
            "blockedUntil": blocked_until,
            "reapplyBlock": reapply_info,
        }, ensure_ascii=False)
    }
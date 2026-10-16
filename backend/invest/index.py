"""Приём заявок на инвестирование и их список для администратора."""
import json
import os
import re
import hashlib
import secrets
from datetime import date, datetime
import urllib.request
from datetime import timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
TELEGRAM_CHAT_ID = "8540431915"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def resp(code: int, data: dict) -> dict:
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}


def esc(v: str) -> str:
    return str(v).replace("'", "''")


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
        urllib.request.urlopen(req, timeout=1.5)
    except Exception:
        pass



def norm_phone(v: str) -> str:
    d = re.sub(r"\D", "", str(v or ""))
    if len(d) == 11 and d[0] == "8":
        d = "7" + d[1:]
    if len(d) == 10:
        d = "7" + d
    return d


def hash_pw(password: str, salt: str = "") -> str:
    salt = salt or secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${h}"


def check_pw(password: str, stored: str) -> bool:
    if "$" not in stored:
        return False
    salt = stored.split("$", 1)[0]
    return secrets.compare_digest(hash_pw(password, salt), stored)


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    day = min(d.day, [31, 29 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1])
    return date(y, m, day)


def months_passed(start: date, today: date) -> int:
    n = (today.year - start.year) * 12 + today.month - start.month
    if today.day < start.day:
        n -= 1
    return max(n, 0)


def inv_view(r, paid_interest: int, paid_total: int, payouts: list) -> dict:
    inv_id, amount, term, payout, rate, start, status, contract_url = r
    today = date.today()
    monthly = round(float(amount) * float(rate) / 100)
    passed = min(months_passed(start, today), int(term))
    accrued = monthly * passed
    end_date = add_months(start, int(term))
    nxt = None
    if status == "active" and today < end_date:
        if payout == "monthly":
            nxt = add_months(start, passed + 1)
        else:
            nxt = end_date
    return {
        "id": inv_id, "amount": int(amount), "termMonths": int(term), "payout": payout, "rate": float(rate),
        "startDate": start.strftime("%d.%m.%Y"), "endDate": end_date.strftime("%d.%m.%Y"), "status": status,
        "monthlyIncome": monthly, "totalIncome": monthly * int(term), "accrued": accrued,
        "paidInterest": paid_interest, "paidTotal": paid_total,
        "toPay": max(accrued - paid_interest, 0),
        "nextDate": nxt.strftime("%d.%m.%Y") if nxt else None,
        "payouts": payouts,
        "contractUrl": contract_url or "",
    }


def load_investments(cur, investor_id: int) -> list:
    cur.execute(
        f"SELECT id, amount, term_months, payout, rate, start_date, status, contract_url FROM {SCHEMA}.investments "
        f"WHERE investor_id = {investor_id} ORDER BY id DESC"
    )
    rows = cur.fetchall()
    out = []
    for r in rows:
        cur.execute(f"SELECT id, amount, kind, note, paid_at FROM {SCHEMA}.investment_payouts WHERE investment_id = {r[0]} ORDER BY paid_at DESC")
        pays = [{"id": x[0], "amount": int(x[1]), "kind": x[2], "note": x[3] or "",
                 "paidAt": (x[4] + timedelta(hours=3)).strftime("%d.%m.%Y")} for x in cur.fetchall()]
        pi = sum(p["amount"] for p in pays if p["kind"] == "interest")
        pt = sum(p["amount"] for p in pays)
        out.append(inv_view(r, pi, pt, pays))
    return out


def luhn_ok(num: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(num)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def load_cards(cur, investor_id: int, full: bool) -> list:
    cur.execute(f"SELECT id, card_number, holder, is_default FROM {SCHEMA}.investor_cards WHERE investor_id = {investor_id} ORDER BY is_default DESC, id")
    out = []
    for r in cur.fetchall():
        item = {"id": r[0], "last4": r[1][-4:], "holder": r[2] or "", "isDefault": bool(r[3])}
        if full:
            item["number"] = " ".join(r[1][i:i + 4] for i in range(0, len(r[1]), 4))
        out.append(item)
    return out


def load_my_requests(cur, investor_id: int) -> list:
    cur.execute(
        f"SELECT id, amount, term_months, payout, status, created_at FROM {SCHEMA}.investment_requests "
        f"WHERE investor_id = {investor_id} ORDER BY id DESC LIMIT 50"
    )
    return [{"id": r[0], "amount": int(r[1]) if r[1] else 0, "termMonths": int(r[2]) if r[2] else 0, "payout": r[3] or "",
             "status": r[4], "createdAt": (r[5] + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M")} for r in cur.fetchall()]


def admin_ok(cur, event) -> bool:
    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    tok = (hdrs.get("x-authorization") or hdrs.get("authorization") or "").replace("Bearer ", "").replace("bearer ", "").strip()
    cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{esc(tok)}' AND expires_at > NOW()")
    return cur.fetchone() is not None


def investor_from_token(cur, event):
    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    tok = (hdrs.get("x-authorization") or hdrs.get("authorization") or "").replace("Bearer ", "").replace("bearer ", "").strip()
    cur.execute(
        f"SELECT i.id, i.full_name, i.phone, i.email FROM {SCHEMA}.investor_sessions s "
        f"JOIN {SCHEMA}.investors i ON i.id = s.investor_id WHERE s.token = '{esc(tok)}' AND s.expires_at > NOW()"
    )
    return cur.fetchone()


def investor_block(event, method, sub, body):
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if sub == "login" and method == "POST":
        phone = norm_phone(body.get("phone"))
        pw = str(body.get("password") or "")
        cur.execute(f"SELECT id, full_name, password_hash FROM {SCHEMA}.investors WHERE phone = '{esc(phone)}'")
        row = cur.fetchone()
        if not row or not check_pw(pw, row[2]):
            cur.close(); conn.close()
            return resp(401, {"error": "Неверный телефон или пароль"})
        tok = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.investor_sessions (investor_id, token, expires_at) VALUES ({row[0]}, '{tok}', NOW() + INTERVAL '30 days')")
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"token": tok, "name": row[1]})

    if sub == "me" and method == "GET":
        inv = investor_from_token(cur, event)
        if not inv:
            cur.close(); conn.close()
            return resp(401, {"error": "Не авторизован"})
        items = load_investments(cur, inv[0])
        cards = load_cards(cur, inv[0], False)
        reqs = load_my_requests(cur, inv[0])
        cur.close(); conn.close()
        return resp(200, {"investor": {"id": inv[0], "fullName": inv[1], "phone": inv[2], "email": inv[3] or ""},
                          "investments": items, "cards": cards, "requests": reqs})

    if sub in ("card_add", "card_delete", "card_default", "request_create") and method == "POST":
        inv = investor_from_token(cur, event)
        if not inv:
            cur.close(); conn.close()
            return resp(401, {"error": "Не авторизован"})
        iid = inv[0]

        if sub == "card_add":
            num = re.sub(r"\D", "", str(body.get("number") or ""))
            holder = " ".join(str(body.get("holder") or "").upper().split())[:120]
            if len(num) < 16 or len(num) > 19 or not luhn_ok(num):
                cur.close(); conn.close()
                return resp(400, {"error": "Проверьте номер карты"})
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.investor_cards WHERE investor_id = {iid}")
            cnt = cur.fetchone()[0]
            if cnt >= 5:
                cur.close(); conn.close()
                return resp(400, {"error": "Можно добавить не больше 5 карт"})
            cur.execute(f"SELECT id FROM {SCHEMA}.investor_cards WHERE investor_id = {iid} AND card_number = '{num}'")
            if cur.fetchone():
                cur.close(); conn.close()
                return resp(409, {"error": "Эта карта уже добавлена"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.investor_cards (investor_id, card_number, holder, is_default) "
                f"VALUES ({iid}, '{num}', '{esc(holder)}', {'TRUE' if cnt == 0 else 'FALSE'})"
            )
            conn.commit(); cur.close(); conn.close()
            return resp(200, {"ok": True})

        if sub == "card_delete":
            cid = int(body.get("id") or 0)
            cur.execute(f"SELECT is_default FROM {SCHEMA}.investor_cards WHERE id = {cid} AND investor_id = {iid}")
            row = cur.fetchone()
            if row:
                cur.execute(f"DELETE FROM {SCHEMA}.investor_cards WHERE id = {cid} AND investor_id = {iid}")
                if row[0]:
                    cur.execute(f"UPDATE {SCHEMA}.investor_cards SET is_default = TRUE WHERE id = (SELECT id FROM {SCHEMA}.investor_cards WHERE investor_id = {iid} ORDER BY id LIMIT 1)")
                conn.commit()
            cur.close(); conn.close()
            return resp(200, {"ok": True})

        if sub == "card_default":
            cid = int(body.get("id") or 0)
            cur.execute(f"SELECT id FROM {SCHEMA}.investor_cards WHERE id = {cid} AND investor_id = {iid}")
            if cur.fetchone():
                cur.execute(f"UPDATE {SCHEMA}.investor_cards SET is_default = (id = {cid}) WHERE investor_id = {iid}")
                conn.commit()
            cur.close(); conn.close()
            return resp(200, {"ok": True})

        try:
            amount = int(float(str(body.get("amount") or "0").replace(" ", "")))
            term = int(body.get("termMonths") or 0)
        except ValueError:
            amount, term = 0, 0
        payout = str(body.get("payout") or "")
        if amount < 300000 or amount > 15000000:
            cur.close(); conn.close()
            return resp(400, {"error": "Сумма должна быть от 300 000 до 15 000 000 ₽"})
        if term not in (6, 12, 36, 60) or payout not in ("monthly", "end"):
            cur.close(); conn.close()
            return resp(400, {"error": "Выберите срок и способ выплаты процентов"})
        cur.execute(f"SELECT birth_date FROM {SCHEMA}.investors WHERE id = {iid}")
        bd = (cur.fetchone() or [""])[0] or ""
        cur.execute(
            f"INSERT INTO {SCHEMA}.investment_requests (full_name, birth_date, phone, email, amount, term_months, payout, investor_id) "
            f"VALUES ('{esc(inv[1])}', '{esc(bd)}', '{esc(inv[2])}', '{esc(inv[3] or '')}', {amount}, {term}, '{payout}', {iid}) RETURNING id"
        )
        rid = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        tg(f"💼 <b>Новая инвестиция из кабинета #{rid}</b>\n{inv[1]}\nТел.: {inv[2]}\nСумма: {amount:,} ₽\nСрок: {term_label(term)}\nВыплата процентов: {payout_label(payout)}".replace(",", " "))
        return resp(200, {"ok": True, "id": rid})

    if not admin_ok(cur, event):
        cur.close(); conn.close()
        return resp(401, {"error": "Не авторизован"})

    if sub == "investors" and method == "GET":
        cur.execute(f"SELECT id, full_name, phone, email, birth_date, created_at FROM {SCHEMA}.investors ORDER BY id DESC")
        rows = cur.fetchall()
        out = []
        for r in rows:
            out.append({"id": r[0], "fullName": r[1], "phone": r[2], "email": r[3] or "", "birthDate": r[4] or "",
                        "createdAt": (r[5] + timedelta(hours=3)).strftime("%d.%m.%Y"), "investments": load_investments(cur, r[0]),
                        "cards": load_cards(cur, r[0], True)})
        cur.close(); conn.close()
        return resp(200, {"items": out})

    if sub == "investor_create" and method == "POST":
        phone = norm_phone(body.get("phone"))
        pw = str(body.get("password") or "")
        name = " ".join(str(body.get("fullName") or "").split())
        try:
            amount = int(body.get("amount") or 0)
            term = int(body.get("termMonths") or 0)
            rate = float(body.get("rate") or 8)
            req_id = int(body.get("requestId") or 0)
        except ValueError:
            cur.close(); conn.close()
            return resp(400, {"error": "Проверьте числа"})
        payout = str(body.get("payout") or "")
        if len(phone) != 11 or len(pw) < 6 or not name:
            cur.close(); conn.close()
            return resp(400, {"error": "Нужны ФИО, телефон и пароль от 6 символов"})
        if amount < 1 or term < 1 or payout not in ("monthly", "end"):
            cur.close(); conn.close()
            return resp(400, {"error": "Укажите сумму, срок и способ выплаты"})
        cur.execute(f"SELECT id FROM {SCHEMA}.investors WHERE phone = '{phone}'")
        if cur.fetchone():
            cur.close(); conn.close()
            return resp(409, {"error": "Инвестор с таким телефоном уже есть"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.investors (phone, password_hash, full_name, email, birth_date, request_id) "
            f"VALUES ('{phone}', '{esc(hash_pw(pw))}', '{esc(name)}', '{esc(str(body.get('email') or ''))}', "
            f"'{esc(str(body.get('birthDate') or ''))}', {req_id if req_id else 'NULL'}) RETURNING id"
        )
        iid = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.investments (investor_id, amount, term_months, payout, rate) "
            f"VALUES ({iid}, {amount}, {term}, '{payout}', {rate}) RETURNING id"
        )
        new_inv = cur.fetchone()[0]
        if req_id:
            cur.execute(f"UPDATE {SCHEMA}.investment_requests SET status = 'processed', investor_id = {iid} WHERE id = {req_id}")
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True, "id": iid, "investmentId": new_inv})

    if sub == "investment_add" and method == "POST":
        try:
            iid = int(body.get("investorId") or 0)
            amount = int(body.get("amount") or 0)
            term = int(body.get("termMonths") or 0)
            rate = float(body.get("rate") or 8)
        except ValueError:
            cur.close(); conn.close()
            return resp(400, {"error": "Проверьте числа"})
        payout = str(body.get("payout") or "")
        if iid < 1 or amount < 1 or term < 1 or payout not in ("monthly", "end"):
            cur.close(); conn.close()
            return resp(400, {"error": "Укажите сумму, срок и способ выплаты"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.investments (investor_id, amount, term_months, payout, rate) "
            f"VALUES ({iid}, {amount}, {term}, '{payout}', {rate}) RETURNING id"
        )
        new_inv = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True, "investmentId": new_inv})

    if sub == "request_accept" and method == "POST":
        try:
            rid = int(body.get("requestId") or 0)
            rate = float(body.get("rate") or 8)
        except ValueError:
            cur.close(); conn.close()
            return resp(400, {"error": "Проверьте числа"})
        cur.execute(f"SELECT investor_id, amount, term_months, payout, status FROM {SCHEMA}.investment_requests WHERE id = {rid}")
        rq = cur.fetchone()
        if not rq or not rq[0] or not rq[1] or not rq[2] or not rq[3]:
            cur.close(); conn.close()
            return resp(400, {"error": "Заявка не из кабинета инвестора или в ней не хватает данных"})
        if rq[4] == "processed":
            cur.close(); conn.close()
            return resp(409, {"error": "Заявка уже обработана"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.investments (investor_id, amount, term_months, payout, rate) "
            f"VALUES ({rq[0]}, {rq[1]}, {rq[2]}, '{rq[3]}', {rate}) RETURNING id"
        )
        new_inv = cur.fetchone()[0]
        cur.execute(f"UPDATE {SCHEMA}.investment_requests SET status = 'processed' WHERE id = {rid}")
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True, "investmentId": new_inv})

    if sub == "payout_add" and method == "POST":
        try:
            inv_id = int(body.get("investmentId") or 0)
            amount = int(body.get("amount") or 0)
        except ValueError:
            cur.close(); conn.close()
            return resp(400, {"error": "Проверьте числа"})
        kind = str(body.get("kind") or "interest")
        if inv_id < 1 or amount < 1 or kind not in ("interest", "principal"):
            cur.close(); conn.close()
            return resp(400, {"error": "Укажите сумму выплаты"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.investment_payouts (investment_id, amount, kind, note) "
            f"VALUES ({inv_id}, {amount}, '{kind}', '{esc(str(body.get('note') or '')[:255])}')"
        )
        if kind == "principal":
            cur.execute(f"UPDATE {SCHEMA}.investments SET status = 'closed' WHERE id = {inv_id}")
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    if sub == "investor_password" and method == "POST":
        pw = str(body.get("password") or "")
        iid = int(body.get("investorId") or 0)
        if len(pw) < 6 or iid < 1:
            cur.close(); conn.close()
            return resp(400, {"error": "Пароль от 6 символов"})
        cur.execute(f"UPDATE {SCHEMA}.investors SET password_hash = '{esc(hash_pw(pw))}' WHERE id = {iid}")
        cur.execute(f"DELETE FROM {SCHEMA}.investor_sessions WHERE investor_id = {iid}")
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    cur.close(); conn.close()
    return resp(404, {"error": "Не найдено"})


def term_label(m: int) -> str:
    return {6: "6 месяцев", 12: "1 год", 36: "3 года", 60: "5 лет"}.get(m, f"{m} мес.")


def payout_label(p: str) -> str:
    return "каждый месяц" if p == "monthly" else "в конце срока"


def handler(event: dict, context) -> dict:
    """Приём заявок инвесторов (POST) и список для админки (GET, ?sub=list; POST ?sub=status)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {**CORS, "Access-Control-Max-Age": "86400"}, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    if sub in ("login", "me", "investors", "investor_create", "investment_add", "payout_add", "investor_password",
               "card_add", "card_delete", "card_default", "request_create", "request_accept"):
        return investor_block(event, method, sub, body)

    if sub in ("list", "status", "count"):
        hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
        tok = (hdrs.get("x-authorization") or hdrs.get("authorization") or "").replace("Bearer ", "").replace("bearer ", "").strip()
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{esc(tok)}' AND expires_at > NOW()")
        if not cur.fetchone():
            cur.close(); conn.close()
            return resp(401, {"error": "Не авторизован"})

        if sub == "count":
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.investment_requests WHERE status = 'new'")
            n = cur.fetchone()[0]
            cur.close(); conn.close()
            return resp(200, {"new": n})

        if sub == "status" and method == "POST":
            rid = int(body.get("id", 0) or 0)
            st = body.get("status", "")
            if st not in ("new", "processed"):
                cur.close(); conn.close()
                return resp(400, {"error": "Неверный статус"})
            cur.execute(f"UPDATE {SCHEMA}.investment_requests SET status = '{st}' WHERE id = {rid}")
            conn.commit(); cur.close(); conn.close()
            return resp(200, {"ok": True})

        cur.execute(
            f"SELECT id, full_name, birth_date, phone, email, status, created_at, amount, term_months, payout, investor_id "
            f"FROM {SCHEMA}.investment_requests ORDER BY (status = 'processed'), created_at DESC LIMIT 500"
        )
        items = [{
            "id": r[0], "fullName": r[1], "birthDate": r[2], "phone": r[3], "email": r[4], "status": r[5],
            "createdAt": (r[6] + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M"),
            "amount": int(r[7]) if r[7] else None,
            "termMonths": int(r[8]) if r[8] else None,
            "payout": r[9] or "",
            "investorId": r[10],
        } for r in cur.fetchall()]
        cur.close(); conn.close()
        return resp(200, {"items": items})

    if method != "POST":
        return resp(405, {"error": "Метод не поддерживается"})

    full_name = " ".join(str(body.get("fullName", "")).split())[:255]
    birth_date = str(body.get("birthDate", "")).strip()[:32]
    phone = str(body.get("phone", "")).strip()[:32]
    email = str(body.get("email", "")).strip()[:255]
    try:
        amount = int(float(str(body.get("amount", "")).replace(" ", "").replace(",", ".")))
    except ValueError:
        amount = 0

    if len(full_name.split()) < 2:
        return resp(400, {"error": "Укажите фамилию, имя и отчество"})
    try:
        term_months = int(body.get("termMonths", 0) or 0)
    except ValueError:
        term_months = 0
    payout = str(body.get("payout", "")).strip()
    if term_months not in (6, 12, 36, 60):
        return resp(400, {"error": "Выберите срок инвестирования"})
    if payout not in ("monthly", "end"):
        return resp(400, {"error": "Выберите способ выплаты процентов"})
    if amount < 300000 or amount > 15000000:
        return resp(400, {"error": "Сумма должна быть от 300 000 до 15 000 000 ₽"})
    if not birth_date:
        return resp(400, {"error": "Укажите дату рождения"})
    if len(re.sub(r"\D", "", phone)) < 10:
        return resp(400, {"error": "Укажите номер телефона"})
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return resp(400, {"error": "Укажите корректную почту"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.investment_requests (full_name, birth_date, phone, email, amount, term_months, payout) "
        f"VALUES ('{esc(full_name)}', '{esc(birth_date)}', '{esc(phone)}', '{esc(email)}', {amount}, {term_months}, '{payout}') RETURNING id"
    )
    rid = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close()

    tg(f"💼 <b>Заявка на инвестирование #{rid}</b>\n{full_name}\nДата рождения: {birth_date}\nТел.: {phone}\nПочта: {email}\nСумма: {amount:,} ₽\nСрок: {term_label(term_months)}\nВыплата процентов: {payout_label(payout)}".replace(",", " "))
    return resp(200, {"ok": True, "id": rid})

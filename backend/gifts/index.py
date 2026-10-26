"""Подарки за баллы: каталог, баллы клиента, заказы подарков, управление из админки."""
import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")
POINTS_PER_LOAN = 100

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def resp(code, data):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False, default=str)}


def esc(v):
    return str(v if v is not None else "").replace("'", "''")


def fmt(dt):
    return dt.strftime("%d.%m.%Y %H:%M") if dt else None


def gift_row(r):
    return {"id": r[0], "name": r[1], "description": r[2], "imageUrl": r[3], "pointsCost": r[4], "sortOrder": r[5], "active": r[6]}


GIFT_COLS = "id, name, description, image_url, points_cost, sort_order, active"


def balance(cur, user_id):
    cur.execute(f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.points_ledger WHERE user_id={user_id}")
    earned = int(cur.fetchone()[0])
    cur.execute(f"SELECT COALESCE(SUM(points),0) FROM {SCHEMA}.gift_orders WHERE user_id={user_id} AND status <> 'rejected'")
    spent = int(cur.fetchone()[0])
    return earned - spent, earned, spent


def accrue(cur, user_id):
    cur.execute(
        f"INSERT INTO {SCHEMA}.points_ledger (user_id, amount, reason, loan_type, loan_id) "
        f"SELECT user_id, {POINTS_PER_LOAN}, 'loan', 'loan', id FROM {SCHEMA}.loans "
        f"WHERE user_id={user_id} AND status='paid' ON CONFLICT DO NOTHING"
    )


def handler(event: dict, context) -> dict:
    """Единая точка: sub=list|me|order (клиент), admin_* (админ)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {**CORS, "Access-Control-Max-Age": "86400"}, "body": ""}

    method = event.get("httpMethod")
    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = (hdrs.get("x-authorization") or hdrs.get("authorization") or "").replace("Bearer ", "").replace("bearer ", "").strip()
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False
    cur = conn.cursor()

    def done(code, data):
        conn.commit(); cur.close(); conn.close()
        return resp(code, data)

    if sub == "list" and method == "GET":
        cur.execute(f"SELECT {GIFT_COLS} FROM {SCHEMA}.gifts WHERE active ORDER BY sort_order, id")
        return done(200, {"gifts": [gift_row(r) for r in cur.fetchall()]})

    t = esc(token)

    if sub.startswith("admin_"):
        cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token='{t}' AND expires_at > NOW()")
        if not t or not cur.fetchone():
            return done(401, {"error": "Не авторизован"})

        if sub == "admin_gifts" and method == "GET":
            cur.execute(f"SELECT {GIFT_COLS} FROM {SCHEMA}.gifts ORDER BY sort_order, id")
            return done(200, {"gifts": [gift_row(r) for r in cur.fetchall()]})

        if sub == "admin_gift_save" and method == "POST":
            name, desc, img = esc(body.get("name")).strip(), esc(body.get("description")), esc(body.get("imageUrl"))
            cost = int(body.get("pointsCost") or 0)
            active = "TRUE" if body.get("active", True) else "FALSE"
            order = int(body.get("sortOrder") or 0)
            if not name or cost <= 0:
                return done(400, {"error": "Укажите название и стоимость в баллах"})
            gid = int(body.get("id") or 0)
            if gid:
                cur.execute(f"UPDATE {SCHEMA}.gifts SET name='{name}', description='{desc}', image_url='{img}', points_cost={cost}, sort_order={order}, active={active} WHERE id={gid}")
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.gifts (name, description, image_url, points_cost, sort_order, active) VALUES ('{name}','{desc}','{img}',{cost},{order},{active})")
            return done(200, {"ok": True})

        if sub == "admin_orders" and method == "GET":
            cur.execute(
                f"SELECT o.id, o.gift_name, o.points, o.recipient_name, o.phone, o.address, o.status, o.admin_comment, o.created_at, o.decided_at, u.phone, u.full_name "
                f"FROM {SCHEMA}.gift_orders o LEFT JOIN {SCHEMA}.users u ON u.id=o.user_id ORDER BY (o.status='pending') DESC, o.created_at DESC LIMIT 300"
            )
            orders = [{"id": r[0], "giftName": r[1], "points": r[2], "recipientName": r[3], "phone": r[4] or r[10], "address": r[5],
                       "status": r[6], "adminComment": r[7] or "", "createdAt": fmt(r[8]), "decidedAt": fmt(r[9]),
                       "clientPhone": r[10], "clientName": r[11] or ""} for r in cur.fetchall()]
            return done(200, {"orders": orders, "pending": sum(1 for o in orders if o["status"] == "pending")})

        if sub == "admin_decide" and method == "POST":
            oid = int(body.get("orderId") or 0)
            decision = body.get("decision")
            comment = esc(body.get("comment")).strip()
            if decision not in ("approve", "reject", "shipped"):
                return done(400, {"error": "Неверное решение"})
            new_status = {"approve": "approved", "reject": "rejected", "shipped": "shipped"}[decision]
            cur.execute(f"UPDATE {SCHEMA}.gift_orders SET status='{new_status}', admin_comment='{comment}', decided_at=NOW() WHERE id={oid} RETURNING id")
            if not cur.fetchone():
                return done(404, {"error": "Заказ не найден"})
            return done(200, {"ok": True})

        if sub == "admin_client" and method == "GET":
            phone = "".join(c for c in str(qs.get("phone", "")) if c.isdigit())[-10:]
            if len(phone) < 10:
                return done(400, {"error": "Введите телефон полностью"})
            cur.execute(f"SELECT id, phone, full_name FROM {SCHEMA}.users WHERE RIGHT(regexp_replace(phone,'[^0-9]','','g'),10)='{phone}' LIMIT 1")
            u = cur.fetchone()
            if not u:
                return done(404, {"error": "Клиент не найден"})
            accrue(cur, u[0])
            bal, earned, spent = balance(cur, u[0])
            cur.execute(f"SELECT amount, reason, created_at FROM {SCHEMA}.points_ledger WHERE user_id={u[0]} ORDER BY id DESC LIMIT 30")
            hist = [{"amount": r[0], "reason": "За погашенный займ" if r[1] == "loan" else r[1], "createdAt": fmt(r[2])} for r in cur.fetchall()]
            return done(200, {"userId": u[0], "phone": u[1], "fullName": u[2] or "", "balance": bal, "history": hist})

        if sub == "admin_points" and method == "POST":
            uid = int(body.get("userId") or 0)
            amount = int(body.get("amount") or 0)
            reason = esc(body.get("reason")).strip() or "Начислено администратором"
            if not uid or amount == 0:
                return done(400, {"error": "Укажите клиента и количество баллов"})
            cur.execute(f"INSERT INTO {SCHEMA}.points_ledger (user_id, amount, reason) VALUES ({uid}, {amount}, '{reason}')")
            bal, _, _ = balance(cur, uid)
            return done(200, {"ok": True, "balance": bal})

        return done(404, {"error": "Не найдено"})

    cur.execute(f"SELECT u.id, u.phone, u.full_name FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token='{t}' AND s.expires_at > NOW()")
    user = cur.fetchone() if t else None
    if not user:
        return done(401, {"error": "Не авторизован"})
    uid = user[0]

    if sub == "me" and method == "GET":
        accrue(cur, uid)
        bal, earned, spent = balance(cur, uid)
        cur.execute(f"SELECT amount, reason, created_at FROM {SCHEMA}.points_ledger WHERE user_id={uid} ORDER BY id DESC LIMIT 30")
        hist = [{"amount": r[0], "reason": "За погашенный займ" if r[1] == "loan" else r[1], "createdAt": fmt(r[2])} for r in cur.fetchall()]
        cur.execute(f"SELECT id, gift_name, points, address, status, admin_comment, created_at FROM {SCHEMA}.gift_orders WHERE user_id={uid} ORDER BY id DESC")
        orders = [{"id": r[0], "giftName": r[1], "points": r[2], "address": r[3], "status": r[4], "adminComment": r[5] or "", "createdAt": fmt(r[6])} for r in cur.fetchall()]
        cur.execute(f"SELECT {GIFT_COLS} FROM {SCHEMA}.gifts WHERE active ORDER BY sort_order, id")
        gifts = [gift_row(r) for r in cur.fetchall()]
        return done(200, {"balance": bal, "earned": earned, "spent": spent, "pointsPerLoan": POINTS_PER_LOAN, "history": hist, "orders": orders, "gifts": gifts})

    if sub == "order" and method == "POST":
        gid = int(body.get("giftId") or 0)
        address = esc(body.get("address")).strip()
        name = esc(body.get("recipientName")).strip()
        phone = esc(body.get("phone")).strip()
        if len(address) < 10:
            return done(400, {"error": "Укажите полный адрес доставки: город, улица, дом, индекс"})
        if not name:
            return done(400, {"error": "Укажите ФИО получателя"})
        cur.execute(f"SELECT name, points_cost FROM {SCHEMA}.gifts WHERE id={gid} AND active")
        g = cur.fetchone()
        if not g:
            return done(404, {"error": "Подарок не найден"})
        accrue(cur, uid)
        bal, _, _ = balance(cur, uid)
        if bal < g[1]:
            return done(400, {"error": f"Не хватает баллов: нужно {g[1]}, у вас {bal}"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.gift_orders (user_id, gift_id, gift_name, points, recipient_name, phone, address) "
            f"VALUES ({uid}, {gid}, '{esc(g[0])}', {g[1]}, '{name}', '{phone}', '{address}')"
        )
        return done(200, {"ok": True, "balance": bal - g[1]})

    return done(404, {"error": "Не найдено"})

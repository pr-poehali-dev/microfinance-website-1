"""Чат поддержки: сообщения клиента и ответы администратора."""
import json
import os
from datetime import timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def resp(code, data):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}


def msk_iso(dt):
    return (dt + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S") if dt else None


def esc(v):
    return str(v).replace("'", "''")


def rows_to_msgs(rows):
    return [{"id": r[0], "sender": r[1], "text": r[2], "createdAt": msk_iso(r[3])} for r in rows]


def kind_of(v):
    return "investor" if str(v or "") == "investor" else "user"


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    sub = qs.get("sub", "")
    role = qs.get("role", "client")
    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    hin = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = (hin.get("x-authorization") or hin.get("authorization") or "").replace("Bearer ", "").replace("bearer ", "").strip()
    if not token:
        return resp(401, {"error": "Не авторизован"})
    t = esc(token)

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if role == "admin":
        cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()")
        if not cur.fetchone():
            cur.close(); conn.close()
            return resp(401, {"error": "Не авторизован"})

        if sub == "unread":
            cur.execute(
                f"SELECT COUNT(*) FROM (SELECT DISTINCT kind, user_id FROM {SCHEMA}.support_messages "
                f"WHERE sender = 'client' AND read_by_admin = FALSE) x"
            )
            n = cur.fetchone()[0]
            cur.close(); conn.close()
            return resp(200, {"unread": n})

        if sub == "threads":
            cur.execute(f"""
                SELECT m.kind, m.user_id,
                       CASE WHEN m.kind = 'investor' THEN iv.full_name ELSE u.full_name END,
                       CASE WHEN m.kind = 'investor' THEN iv.phone ELSE u.phone END,
                       m.text, m.created_at, m.sender,
                       (SELECT COUNT(*) FROM {SCHEMA}.support_messages x
                         WHERE x.kind = m.kind AND x.user_id = m.user_id AND x.sender = 'client' AND x.read_by_admin = FALSE)
                FROM {SCHEMA}.support_messages m
                LEFT JOIN {SCHEMA}.users u ON m.kind = 'user' AND u.id = m.user_id
                LEFT JOIN {SCHEMA}.investors iv ON m.kind = 'investor' AND iv.id = m.user_id
                WHERE m.id = (SELECT MAX(id) FROM {SCHEMA}.support_messages y WHERE y.kind = m.kind AND y.user_id = m.user_id)
                ORDER BY m.id DESC
            """)
            out = [{"kind": r[0], "userId": r[1], "name": r[2] or "", "phone": r[3] or "", "lastText": r[4],
                    "lastAt": msk_iso(r[5]), "lastSender": r[6], "unread": r[7]} for r in cur.fetchall()]
            cur.close(); conn.close()
            return resp(200, {"threads": out})

        if sub == "thread":
            uid = int(qs.get("userId") or 0) if str(qs.get("userId") or "0").isdigit() else 0
            kd = kind_of(qs.get("kind"))
            cur.execute(f"UPDATE {SCHEMA}.support_messages SET read_by_admin = TRUE WHERE kind = '{kd}' AND user_id = {uid} AND sender = 'client' AND read_by_admin = FALSE")
            conn.commit()
            cur.execute(f"SELECT id, sender, text, created_at FROM {SCHEMA}.support_messages WHERE kind = '{kd}' AND user_id = {uid} ORDER BY id")
            msgs = rows_to_msgs(cur.fetchall())
            cur.close(); conn.close()
            return resp(200, {"messages": msgs})

        if sub == "reply" and method == "POST":
            uid = int(body.get("userId") or 0)
            kd = kind_of(body.get("kind"))
            text = str(body.get("text") or "").strip()[:2000]
            if not uid or not text:
                cur.close(); conn.close()
                return resp(400, {"error": "Введите текст ответа"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.support_messages (user_id, kind, sender, text, read_by_admin, read_by_client) "
                f"VALUES ({uid}, '{kd}', 'admin', '{esc(text)}', TRUE, FALSE)"
            )
            conn.commit(); cur.close(); conn.close()
            return resp(200, {"ok": True})

        cur.close(); conn.close()
        return resp(404, {"error": "Не найдено"})

    kd = kind_of(qs.get("kind"))
    if kd == "investor":
        cur.execute(
            f"SELECT i.id FROM {SCHEMA}.investor_sessions s JOIN {SCHEMA}.investors i ON i.id = s.investor_id "
            f"WHERE s.token = '{t}' AND s.expires_at > NOW()"
        )
    else:
        cur.execute(
            f"SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
            f"WHERE s.token = '{t}' AND s.expires_at > NOW()"
        )
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return resp(401, {"error": "Не авторизован"})
    uid = row[0]

    if method == "POST":
        text = str(body.get("text") or "").strip()[:2000]
        if not text:
            cur.close(); conn.close()
            return resp(400, {"error": "Введите сообщение"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.support_messages (user_id, kind, sender, text, read_by_admin, read_by_client) "
            f"VALUES ({uid}, '{kd}', 'client', '{esc(text)}', FALSE, TRUE)"
        )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    if sub == "unread":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.support_messages WHERE kind = '{kd}' AND user_id = {uid} AND sender = 'admin' AND read_by_client = FALSE")
        n = cur.fetchone()[0]
        cur.close(); conn.close()
        return resp(200, {"unread": n})

    if qs.get("markRead") == "1":
        cur.execute(f"UPDATE {SCHEMA}.support_messages SET read_by_client = TRUE WHERE kind = '{kd}' AND user_id = {uid} AND sender = 'admin' AND read_by_client = FALSE")
        conn.commit()
    cur.execute(f"SELECT id, sender, text, created_at FROM {SCHEMA}.support_messages WHERE kind = '{kd}' AND user_id = {uid} ORDER BY id")
    msgs = rows_to_msgs(cur.fetchall())
    cur.close(); conn.close()
    return resp(200, {"messages": msgs})

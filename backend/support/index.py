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



SITE_URL = "https://rusfinans24.ru"


def _mail_html(title: str, color: str, name: str, lines: list, button: str = "") -> str:
    body = "".join(f'<p style="color:#334155;font-size:14px;margin:0 0 12px;line-height:1.6;">{l}</p>' for l in lines)
    btn = (f'<p style="text-align:center;margin:24px 0 0;"><a href="{SITE_URL}/login" style="background:{color};color:#ffffff;'
           f'text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block;">{button}</a></p>') if button else ""
    return (
        '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>'
        '<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">'
        '<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">'
        '<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">'
        f'<tr><td style="background:{color};padding:28px 36px;text-align:center;">'
        '<h1 style="margin:0;color:#ffffff;font-size:22px;">РУСФИНАНС 24</h1>'
        f'<p style="margin:8px 0 0;color:#ffffff;font-size:15px;">{title}</p></td></tr>'
        '<tr><td style="padding:32px 36px;">'
        f'<p style="color:#0f172a;font-size:16px;margin:0 0 16px;">Здравствуйте, <b>{name}</b>!</p>'
        f'{body}{btn}'
        '<p style="color:#94a3b8;font-size:11px;margin:28px 0 0;text-align:center;">© РУСФИНАНС 24. Это письмо отправлено автоматически, отвечать на него не нужно.</p>'
        '</td></tr></table></td></tr></table></body></html>'
    )


def notify_email(to: str, kind: str, name: str, **kw) -> None:
    """Письмо клиенту о событии по заявке. Ошибки не прерывают работу, результат пишется в email_log."""
    to = (to or "").strip()
    if not to or "@" not in to:
        return
    name = name or "клиент"
    num = kw.get("num")
    n = f" №{num}" if num else ""
    amt = f"{int(float(kw['amount'])):,} ₽".replace(",", " ") if kw.get("amount") else ""
    green, red, amber, blue = "#10b981", "#dc2626", "#f59e0b", "#0ea5e9"
    templates = {
        "postponed": (f"Заявка{n} отложена", "Заявка отложена", amber,
                      ["Ваша заявка временно отложена. Мы вернёмся к её рассмотрению позже и сообщим о решении.",
                       "Статус заявки всегда можно посмотреть в личном кабинете."], "Открыть личный кабинет"),
        "partner_approved": (f"Заявка{n} одобрена — РУСФИНАНС 24", "Заявка одобрена!", green,
                             [f"Ваша заявка одобрена{(' на сумму <b>' + amt + '</b>') if amt else ''}.",
                              "Чтобы получить займ, оформите карту нашего партнёра и пройдите идентификацию. Подробная инструкция — в личном кабинете."], "Открыть личный кабинет"),
        "creditdoctor_approved": (f"Заявка{n} одобрена по программе «Кредитный Доктор»", "Заявка одобрена", green,
                                  ["Ваша заявка одобрена по программе «Кредитный Доктор». Программа поможет восстановить вашу кредитную историю.",
                                   "Подробности — в личном кабинете."], "Открыть личный кабинет"),
        "identification_ok": (f"Идентификация пройдена{n}", "Идентификация пройдена", green,
                              ["Идентификация карты успешно пройдена. Теперь вы можете подписать договор в личном кабинете."], "Подписать договор"),
        "identification_fail": (f"Идентификация не пройдена{n}", "Идентификация не пройдена", red,
                                ["Идентификация карты не пройдена. Проверьте данные карты и отправьте их повторно в личном кабинете."], "Открыть личный кабинет"),
        "disbursed": (f"Займ{n} выдан — РУСФИНАНС 24", "Деньги отправлены!", green,
                      [f"Мы перевели вам <b>{amt}</b>." if amt else "Мы перевели вам деньги.",
                       "Зачисление на карту может занять некоторое время. Условия и график платежей — в личном кабинете."], "Открыть личный кабинет"),
        "car_approved": (f"Автозайм{n} одобрен — РУСФИНАНС 24", "Автозайм одобрен!", green,
                         [f"Ваша заявка на автозайм одобрена{(' на сумму <b>' + amt + '</b>') if amt else ''}.",
                          "Ознакомьтесь с условиями и подпишите договор в личном кабинете."], "Открыть личный кабинет"),
        "car_signing": (f"Автозайм{n}: ждём вашу подпись", "Подпишите договор", blue,
                        ["По вашему автозайму подготовлен договор. Подпишите его в личном кабинете."], "Подписать договор"),
        "car_rejected": (f"По заявке на автозайм{n} принято решение", "По заявке принято решение", red,
                         ["К сожалению, по вашей заявке на автозайм принято отрицательное решение." + (f" Причина: {kw['reason']}." if kw.get("reason") else ""),
                          "Вы можете подать новую заявку позже."], ""),
        "car_disbursed": (f"Автозайм{n} выдан — РУСФИНАНС 24", "Деньги отправлены!", green,
                          [f"Мы перевели вам <b>{amt}</b> по автозайму." if amt else "Автозайм выдан.", "Условия и график платежей — в личном кабинете."], "Открыть личный кабинет"),
        "shop_approved": (f"Займ на покупки{n} одобрен — РУСФИНАНС 24", "Займ на покупки одобрен!", green,
                          [f"Ваша заявка на займ на покупки одобрена{(' на сумму <b>' + amt + '</b>') if amt else ''}.",
                           "Ознакомьтесь с условиями и подпишите договор в личном кабинете."], "Открыть личный кабинет"),
        "shop_signing": (f"Займ на покупки{n}: ждём вашу подпись", "Подпишите договор", blue,
                         ["По вашему займу на покупки подготовлен договор. Подпишите его в личном кабинете."], "Подписать договор"),
        "shop_rejected": (f"По заявке на займ на покупки{n} принято решение", "По заявке принято решение", red,
                          ["К сожалению, по вашей заявке на займ на покупки принято отрицательное решение." + (f" Причина: {kw['reason']}." if kw.get("reason") else ""),
                           "Вы можете подать новую заявку позже."], ""),
        "shop_disbursed": (f"Займ на покупки{n} выдан — РУСФИНАНС 24", "Деньги отправлены!", green,
                           [f"Мы перевели вам <b>{amt}</b> по займу на покупки." if amt else "Займ на покупки выдан.", "Условия и график платежей — в личном кабинете."], "Открыть личный кабинет"),
        "support_reply": ("Ответ службы поддержки — РУСФИНАНС 24", "Ответ службы поддержки", blue,
                          ["Мы ответили на ваше сообщение в чате поддержки. Откройте личный кабинет, чтобы прочитать ответ."], "Открыть личный кабинет"),
    }
    t = templates.get(kind)
    if not t:
        return
    subject, title, color, lines, button = t
    html = _mail_html(title, color, name, lines, button)
    status, err = "sent", None
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    if not smtp_user or not smtp_pass:
        status, err = "failed", "Не заданы SMTP_USER / SMTP_PASSWORD"
    else:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"РУСФИНАНС 24 <{smtp_user}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))
        try:
            with smtplib.SMTP_SSL("smtp.yandex.ru", 465, timeout=5) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, to, msg.as_string())
        except Exception as ex:
            status, err = "failed", str(ex)[:300]
    try:
        c = psycopg2.connect(os.environ["DATABASE_URL"])
        k = c.cursor()
        e = lambda v: str(v or "").replace("'", "''")
        k.execute(
            f"INSERT INTO {SCHEMA}.email_log (to_email, subject, kind, status, error) "
            f"VALUES ('{e(to)}', '{e(subject)}', '{e(kind)}', '{status}', {('NULL' if not err else chr(39) + e(err) + chr(39))})"
        )
        c.commit(); k.close(); c.close()
    except Exception as ex:
        print(f"[notify_email] log error: {ex}")
    print(f"[notify_email] {kind} -> {to}: {status} {err or ''}")


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
            conn.commit()
            if kd == "investor":
                cur.execute(f"SELECT email, full_name FROM {SCHEMA}.investors WHERE id = {uid}")
            else:
                cur.execute(f"SELECT email, full_name FROM {SCHEMA}.users WHERE id = {uid}")
            mr = cur.fetchone()
            cur.close(); conn.close()
            if mr and mr[0]:
                notify_email(mr[0], "support_reply", mr[1])
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

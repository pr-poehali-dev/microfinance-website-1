"""Справки об отсутствии задолженности: выпускаются автоматически, когда клиент полностью погасил займ или лимит по карте."""
import os
from datetime import datetime

KIND_TITLE = {
    "loan": "договору потребительского займа",
    "carloan": "договору потребительского займа (под залог автомобиля)",
    "shoploan": "договору потребительского займа (на покупки)",
    "card": "договору кредитного лимита по карте РУСФИНАНС 24",
}


def _money(x) -> str:
    return f"{int(round(float(x or 0))):,}".replace(",", " ") + " ₽"


def _fmt(dt, d) -> str:
    return d["msk"](dt).strftime("%d.%m.%Y") if dt else "—"


def _collect(cur, user_id, phone_e, d):
    S = d["SCHEMA"]
    found = []

    cur.execute(
        f"SELECT id, amount, days, rate, status, disbursed_at, wheel_discount_rub FROM {S}.loans "
        f"WHERE user_id = {int(user_id)} AND disbursed_at IS NOT NULL AND status IN ('active','overdue','paid')"
    )
    for lid, amount, days, rate, status, disb, wheel in cur.fetchall():
        cur.execute(f"SELECT COALESCE(SUM(amount),0), MAX(paid_at) FROM {S}.payments WHERE loan_type = 'loan' AND loan_id = {lid}")
        paid, last = cur.fetchone()
        paid = float(paid)
        interest = round(float(amount) * float(rate) * int(days))
        interest -= min(int(wheel or 0), interest)
        total = float(amount) + interest
        if paid <= 0 or not (status == "paid" or paid >= total - 0.5):
            continue
        found.append({
            "kind": "loan", "ref": lid, "cycle": 0, "num": f"{str(lid).zfill(12)}/{d['msk'](disb).strftime('%Y')}",
            "amount": float(amount), "term": f"{int(days)} дн.", "contract_dt": disb, "repaid_at": last,
        })

    for kind, table, prefix, def_rate in (("carloan", "car_loan_applications", "А", 12), ("shoploan", "shopping_loan_applications", "Т", 9)):
        cur.execute(
            f"SELECT id, COALESCE(approved_amount, loan_amount), COALESCE(approved_months, loan_months), "
            f"COALESCE(approved_rate, {def_rate}), disbursed_at FROM {S}.{table} "
            f"WHERE phone = '{phone_e}' AND disbursed_at IS NOT NULL AND status NOT IN ('rejected','cancelled','pending')"
        )
        for rid, a, m, r, disb in cur.fetchall():
            cur.execute(f"SELECT COALESCE(SUM(amount),0), MAX(paid_at) FROM {S}.payments WHERE loan_type = '{kind}' AND loan_id = {rid}")
            paid, last = cur.fetchone()
            total = round(float(a) * (1 + float(r) / 100 * int(m)))
            if float(paid) <= 0 or float(paid) < total - 0.5:
                continue
            found.append({
                "kind": kind, "ref": rid, "cycle": 0, "num": f"{prefix}-{str(rid).zfill(12)}",
                "amount": float(a), "term": f"{int(m)} мес.", "contract_dt": disb, "repaid_at": last,
            })

    cur.execute(
        f"SELECT id, virtual_card_issued_at FROM {S}.applications WHERE phone = '{phone_e}' AND virtual_card_number IS NOT NULL"
    )
    for app_id, issued in cur.fetchall():
        cur.execute(
            f"SELECT id, amount, weeks, rate FROM {S}.card_transactions WHERE application_id = {app_id} AND status <> 'cancelled'"
        )
        txs = cur.fetchall()
        if not txs:
            continue
        gross = sum(float(a) + round(float(a) * float(r) / 100 * int(w)) for _, a, w, r in txs)
        used = sum(float(a) for _, a, _, _ in txs)
        cur.execute(f"SELECT COALESCE(SUM(amount),0), MAX(created_at) FROM {S}.card_repayments WHERE application_id = {app_id}")
        repaid, last = cur.fetchone()
        if gross <= 0 or float(repaid) < gross - 0.5:
            continue
        found.append({
            "kind": "card", "ref": app_id, "cycle": max(t[0] for t in txs),
            "num": f"К-{str(app_id).zfill(10)}/{d['msk'](issued or datetime.now()).strftime('%Y')}",
            "amount": used, "term": "", "contract_dt": issued, "repaid_at": last,
        })
    return found


def _html(c, person, number, d):
    MKK = d["MKK"]
    now = d["msk"](datetime.now())
    date_str = now.strftime("%d.%m.%Y")
    birth = f", дата рождения {person['birth']}" if person.get("birth") else ""
    rows = [
        ("Договор", f"№ {c['num']}"),
        ("Дата договора", _fmt(c["contract_dt"], d)),
        ("Сумма" + (" использованного лимита" if c["kind"] == "card" else " займа"), _money(c["amount"])),
    ]
    if c["term"]:
        rows.append(("Срок", c["term"]))
    rows.append(("Дата полного погашения", _fmt(c["repaid_at"], d) if c["repaid_at"] else date_str))
    rows.append(("Остаток задолженности", "0 ₽"))
    table = "".join(f'<tr><td class="label">{a}</td><td class="value">{b}</td></tr>' for a, b in rows)
    return f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>Справка {number}</title>
<style>{d['CSS']}</style></head>
<body>
<h1>Справка</h1>
<h2>об отсутствии задолженности № {number}</h2>
<p class="center num">г. Москва &nbsp;&nbsp;&nbsp; {date_str}</p>

<p><span class="bold">{MKK['name']}</span> (далее — «Займодавец») настоящей справкой подтверждает, что
<span class="bold">{person['name']}</span>{birth} (далее — «Заёмщик») полностью исполнил(а) свои обязательства по {KIND_TITLE[c['kind']]}, заключённому с Займодавцем.</p>

<table class="params">{table}</table>

<p>По состоянию на {date_str} задолженность Заёмщика перед Займодавцем по основному долгу, процентам, пеням, штрафам и иным платежам по указанному договору <span class="bold">отсутствует</span>. Займодавец претензий к Заёмщику по данному договору не имеет.</p>

<p>Справка выдана для предоставления по месту требования.</p>

<table class="sign">
  <tr>
    <td>
      <p class="bold">ЗАЙМОДАВЕЦ:</p>
      <p>{MKK['name']}</p>
      <p>{MKK['address']}</p>
      <p>Тел.: {MKK['phone']}</p>
      <p>Email: {MKK['email']}</p>
      <br>
      <p>Директор:</p>
      <p>{MKK['director']}</p>
      <p style="position:relative;height:34pt;"><span class="sign-line"></span>{d['SIGN_IMG']}</p>
      <p style="margin-top:8pt;position:relative;height:90pt;">М.П.{d['SEAL_IMG']}</p>
    </td>
    <td>
      <br>
      {d['digital_sign_block'](number)}
      <p style="margin-top:8pt;">Дата выдачи: {date_str}</p>
    </td>
  </tr>
</table>

<p style="margin-top:16pt;font-size:9pt;color:#555;text-align:center;">
  Справка сформирована автоматически {now.strftime('%d.%m.%Y в %H:%M')} · {MKK['name']} · {MKK['site']}
</p>
</body></html>"""


def ensure_certificates(cur, conn, user_id, phone, d) -> list:
    S = d["SCHEMA"]
    phone_e = str(phone).replace("'", "''")
    cur.execute(f"SELECT full_name FROM {S}.users WHERE id = {int(user_id)}")
    row = cur.fetchone()
    name = (row[0] if row else "") or ""
    cur.execute(f"SELECT full_name, birth_date FROM {S}.applications WHERE phone = '{phone_e}' ORDER BY created_at DESC LIMIT 1")
    ap = cur.fetchone()
    person = {"name": (ap[0] if ap and ap[0] else name) or "Клиент", "birth": str(ap[1]) if ap and ap[1] else ""}

    for c in _collect(cur, user_id, phone_e, d):
        cur.execute(f"SELECT 1 FROM {S}.debt_certificates WHERE kind = '{c['kind']}' AND ref_id = {int(c['ref'])} AND cycle = {int(c['cycle'])}")
        if cur.fetchone():
            continue
        try:
            cur.execute(
                f"INSERT INTO {S}.debt_certificates (phone, kind, ref_id, cycle, cert_number, url, repaid_at, title, amount) "
                f"VALUES ('{phone_e}', '{c['kind']}', {int(c['ref'])}, {int(c['cycle'])}, '', '', "
                f"{('%r' % c['repaid_at'].strftime('%Y-%m-%d %H:%M:%S')) if c['repaid_at'] else 'NULL'}, "
                f"'{('Договор № ' + c['num']).replace(chr(39), chr(39) * 2)}', {float(c['amount'])}) RETURNING id"
            )
            cid = cur.fetchone()[0]
            number = f"СОЗ-{d['msk'](datetime.now()).strftime('%Y')}-{str(cid).zfill(6)}"
            html = _html(c, person, number, d)
            key, body, ctype = d["store_contract_file"](html, f"debt_{cid}", datetime.now().strftime("%Y%m%d_%H%M%S"))
            d["s3_client"]().put_object(Bucket="files", Key=key, Body=body, ContentType=ctype)
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            cur.execute(f"UPDATE {S}.debt_certificates SET cert_number = '{number}', url = '{url}' WHERE id = {cid}")
            conn.commit()
        except Exception as ex:
            conn.rollback()
            print(f"[certs] {c['kind']} {c['ref']} error: {ex}")

    cur.execute(
        f"SELECT id, cert_number, kind, title, amount, repaid_at, issued_at, url FROM {S}.debt_certificates "
        f"WHERE phone = '{phone_e}' AND url <> '' ORDER BY issued_at DESC"
    )
    out = []
    for cid, num, kind, title, amount, repaid_at, issued_at, url in cur.fetchall():
        out.append({
            "id": cid, "number": num, "kind": kind, "title": title, "amount": float(amount),
            "repaidAt": d["msk"](repaid_at).strftime("%d.%m.%Y") if repaid_at else "",
            "issuedAt": d["msk"](issued_at).strftime("%d.%m.%Y"), "url": url,
        })
    return out

"""Генерация PDF договора займа для Русфинанс 24 и сохранение в S3."""
import json
import os
import io
import base64
from datetime import datetime, timedelta
import psycopg2
import boto3


from datetime import timedelta as _msk_td


def msk(dt):
    """Переводит время из UTC (как хранится в БД) в московское (UTC+3) для показа."""
    return dt + _msk_td(hours=3) if dt else dt

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p30184577_microfinance_website")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}

CARD_MIN_PAYMENT_PERCENT = 30

MKK = {
    "name": "Русфинанс 24",
    "address": "г. Москва, Проспект Мира д.112",
    "bank": 'АО "Газпромбанк"',
    "rs": "40817810165377982899",
    "ks": "30101810200000000823",
    "bik": "044525823",
    "phone": "+7-996-201-95-00",
    "email": "support@rusfinans24.ru",
    "site": "rusfinans24.ru",
    "director": "Ребров Александр Сергеевич",
}


from seal_data import SEAL_B64, SIGN_B64

SEAL_IMG = f'<img src="data:image/png;base64,{SEAL_B64}" style="width:120pt;height:120pt;position:absolute;left:78pt;top:-22pt;" alt="">'


SIGN_IMG = f'<img src="data:image/png;base64,{SIGN_B64}" style="width:120pt;position:absolute;left:6pt;top:-14pt;" alt="">'


def digital_sign_block(seed: str) -> str:
    import random as _r
    code = str(_r.Random(seed).randint(10000, 99999))
    return (f'<p style="margin-top:2pt;"><span style="color:#1e3a8a;font-weight:bold;">Цифровая подпись: {code}</span></p>'
            f'<p style="font-size:9pt;color:#555;">Подписано простой электронной подписью</p>')


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


CONTRACT_CSS = """
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; padding: 20mm 20mm 20mm 25mm; }
    h1 { font-size: 16pt; text-align: center; font-weight: bold; margin-bottom: 6pt; text-transform: uppercase; }
    h2 { font-size: 13pt; text-align: center; font-weight: bold; margin-bottom: 16pt; }
    h3 { font-size: 12pt; font-weight: bold; margin: 14pt 0 6pt; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3pt; }
    p { margin-bottom: 6pt; line-height: 1.5; text-align: justify; }
    .center { text-align: center; }
    .right { text-align: right; }
    table.params { width: 100%; border-collapse: collapse; margin: 10pt 0; }
    table.params td { padding: 5pt 8pt; border: 1pt solid #000; font-size: 11pt; }
    table.params td.label { width: 55%; background: #f5f5f5; font-weight: bold; }
    table.params td.value { width: 45%; }
    table.sign { width: 100%; border-collapse: collapse; margin-top: 20pt; }
    table.sign td { padding: 4pt 8pt; vertical-align: top; width: 50%; }
    .highlight { background: #fffde7; border: 1pt solid #f9a825; padding: 6pt 10pt; margin: 8pt 0; }
    .underline { text-decoration: underline; }
    .bold { font-weight: bold; }
    hr { border: none; border-top: 1pt solid #000; margin: 12pt 0; }
    .sign-line { border-bottom: 1pt solid #000; display: inline-block; width: 160pt; }
    .num { font-size: 11pt; color: #555; margin-bottom: 12pt; }
    """


def _plural(n: int, one: str, few: str, many: str) -> str:
    n = abs(n) % 100
    if 11 <= n <= 19:
        return many
    n %= 10
    if n == 1:
        return one
    if 2 <= n <= 4:
        return few
    return many


def _triplet(n: int, female: bool) -> list:
    units_m = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
    units_f = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
    teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
             "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"]
    tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят",
            "шестьдесят", "семьдесят", "восемьдесят", "девяносто"]
    hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот",
                "шестьсот", "семьсот", "восемьсот", "девятьсот"]
    parts = []
    h, r = n // 100, n % 100
    if h:
        parts.append(hundreds[h])
    if 10 <= r < 20:
        parts.append(teens[r - 10])
    else:
        if r // 10:
            parts.append(tens[r // 10])
        if r % 10:
            parts.append((units_f if female else units_m)[r % 10])
    return parts


def num_to_words(n: int) -> str:
    """Число прописью (рубли, до миллиардов)."""
    n = int(n)
    if n == 0:
        return "ноль"
    if n < 0:
        return "минус " + num_to_words(-n)
    parts = []
    billions, millions, thousands, rest = n // 10**9, (n // 10**6) % 1000, (n // 1000) % 1000, n % 1000
    if billions:
        parts += _triplet(billions, False) + [_plural(billions, "миллиард", "миллиарда", "миллиардов")]
    if millions:
        parts += _triplet(millions, False) + [_plural(millions, "миллион", "миллиона", "миллионов")]
    if thousands:
        parts += _triplet(thousands, True) + [_plural(thousands, "тысяча", "тысячи", "тысяч")]
    if rest:
        parts += _triplet(rest, False)
    return " ".join(parts)


def generate_contract_html(app_data: dict, loan_num: int) -> str:
    full_name = app_data.get("full_name", "")
    phone = app_data.get("phone", "")
    passport_series = app_data.get("passport_series", "")
    passport_number = app_data.get("passport_number", "")
    passport_date = app_data.get("passport_date", "")
    passport_by = app_data.get("passport_by", "")
    passport_code = app_data.get("passport_code", "")
    birth_date = app_data.get("birth_date", "")
    birth_place = app_data.get("birth_place", "")
    address = app_data.get("address", "")
    email = app_data.get("email", "")

    amount = float(app_data.get("amount", 0))
    rate = float(app_data.get("rate", 0.008))
    days = int(app_data.get("days", 0))
    interest = round(amount * rate * days)
    total = amount + interest
    rate_pct = round(rate * 100, 1)

    today = msk(datetime.now())
    date_str = today.strftime("%d.%m.%Y")
    due_date = (today + timedelta(days=days)).strftime("%d.%m.%Y")
    contract_num = f"{str(loan_num).zfill(12)}/{today.strftime('%Y')}"

    amount_words = num_to_words(int(amount))
    total_words = num_to_words(int(total))

    passport_str = f"{passport_series} {passport_number}"
    if passport_date:
        passport_str += f", выдан {passport_date}"
    if passport_by:
        passport_str += f" {passport_by}"
    if passport_code:
        passport_str += f", код {passport_code}"

    css = CONTRACT_CSS

    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор займа №{contract_num}</title>
<style>{css}</style>
</head>
<body>

<h1>Договор потребительского займа</h1>
<h2>№ {contract_num}</h2>
<p class="center num">г. Москва &nbsp;&nbsp;&nbsp; {date_str}</p>

<p><span class="bold">{MKK["name"]}</span>, именуемое в дальнейшем <span class="bold">«Займодавец»</span>, в лице директора {MKK["director"]}, действующего на основании Устава, с одной стороны, и</p>

<p><span class="bold">{full_name}</span>, дата рождения: {birth_date or "—"}, место рождения: {birth_place or "—"}, паспорт: {passport_str}, именуемый(-ая) в дальнейшем <span class="bold">«Заёмщик»</span>, с другой стороны,</p>

<p>совместно именуемые <span class="bold">«Стороны»</span>, заключили настоящий Договор потребительского займа (далее — «Договор») о нижеследующем:</p>

<h3>1. Индивидуальные условия займа</h3>

<table class="params">
  <tr><td class="label">Сумма займа</td><td class="value"><span class="bold">{int(amount):,} ₽</span> ({amount_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Срок займа</td><td class="value"><span class="bold">{days} календарных дней</span></td></tr>
  <tr><td class="label">Дата выдачи</td><td class="value"><span class="bold">{date_str}</span></td></tr>
  <tr><td class="label">Дата возврата</td><td class="value"><span class="bold">{due_date}</span></td></tr>
  <tr><td class="label">Процентная ставка</td><td class="value"><span class="bold">{rate_pct}% в день</span> ({round(rate_pct * 365, 1)}% годовых)</td></tr>
  <tr><td class="label">Начисленные проценты</td><td class="value"><span class="bold">{int(interest):,} ₽</span></td></tr>
  <tr><td class="label">Полная сумма к возврату</td><td class="value"><span class="bold">{int(total):,} ₽</span> ({total_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Способ получения</td><td class="value">Перевод на банковский счёт / СБП</td></tr>
  <tr><td class="label">Контактный телефон Заёмщика</td><td class="value">{phone}</td></tr>
  {f'<tr><td class="label">Email Заёмщика</td><td class="value">{email}</td></tr>' if email else ''}
</table>

<div class="highlight">
  <p class="bold">Полная стоимость займа (ПСК): {round(rate_pct * 365, 2)}% годовых</p>
</div>

<h3>2. Предмет договора</h3>

<p>2.1. Займодавец передаёт в собственность Заёмщику денежные средства в размере <span class="bold">{int(amount):,} ({"".join([amount_words, " рублей 00 копеек"])}</span>, а Заёмщик обязуется вернуть указанную сумму займа и уплатить проценты на неё в порядке и на условиях, предусмотренных настоящим Договором.</p>

<p>2.2. Заём предоставляется на потребительские нужды, не связанные с осуществлением предпринимательской деятельности.</p>

<p>2.3. Займодавец обязуется перечислить сумму займа на банковский счёт или номер телефона (СБП), указанный Заёмщиком, в течение 1 (одного) рабочего дня с момента подписания настоящего Договора.</p>

<h3>3. Права и обязанности сторон</h3>

<p>3.1. <span class="bold">Заёмщик обязуется:</span></p>
<p>3.1.1. Возвратить сумму займа и уплатить начисленные проценты в полном объёме в срок, указанный в п. 1 настоящего Договора.</p>
<p>3.1.2. Своевременно уведомлять Займодавца об изменении контактных данных, места жительства и иных существенных обстоятельств.</p>
<p>3.1.3. Не допускать просрочки платежей.</p>

<p>3.2. <span class="bold">Займодавец обязуется:</span></p>
<p>3.2.1. Передать Заёмщику сумму займа в порядке, установленном настоящим Договором.</p>
<p>3.2.2. Предоставлять Заёмщику информацию об остатке задолженности по его запросу.</p>

<p>3.3. <span class="bold">Займодавец вправе:</span></p>
<p>3.3.1. Потребовать досрочного возврата займа и уплаты процентов в случае нарушения Заёмщиком условий настоящего Договора.</p>
<p>3.3.2. Передать право требования третьим лицам в порядке, предусмотренном действующим законодательством РФ.</p>

<h3>4. Порядок начисления и уплаты процентов</h3>

<p>4.1. За пользование суммой займа Заёмщик уплачивает Займодавцу проценты из расчёта <span class="bold">{rate_pct}% в день</span> от суммы займа.</p>

<p>4.2. Проценты начисляются ежедневно, начиная со дня, следующего за днём предоставления займа, по день его фактического возврата включительно.</p>

<p>4.3. Уплата процентов производится одновременно с возвратом суммы основного долга в последний день срока займа — <span class="bold">{due_date}</span>.</p>

<h3>5. Ответственность сторон</h3>

<p>5.1. В случае нарушения срока возврата суммы займа и/или процентов Займодавец вправе начислять неустойку (пеню) в размере <span class="bold">0,1% от суммы просроченной задолженности за каждый день просрочки</span>, но не более 20% годовых от суммы займа при условии начисления процентов за период нарушения обязательства.</p>

<p>5.2. Заёмщик несёт ответственность за достоверность предоставленных данных. В случае предоставления заведомо ложных сведений Займодавец вправе обратиться в правоохранительные органы.</p>

<h3>6. Согласие на обработку персональных данных</h3>

<p>6.1. Подписывая настоящий Договор, Заёмщик даёт {MKK["name"]} согласие на обработку своих персональных данных в целях исполнения договора, а также в целях, предусмотренных Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>

<p>6.2. Заёмщик даёт согласие на передачу информации в бюро кредитных историй.</p>

<h3>7. Заключительные положения</h3>

<p>7.1. Настоящий Договор вступает в силу с момента передачи суммы займа Заёмщику и действует до полного исполнения Сторонами своих обязательств.</p>

<p>7.2. Все споры и разногласия, возникающие из настоящего Договора, разрешаются путём переговоров, а при недостижении согласия — в судебном порядке по месту нахождения Займодавца.</p>

<p>7.3. Настоящий Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон.</p>

<p>7.4. Во всём, что не предусмотрено настоящим Договором, Стороны руководствуются действующим законодательством Российской Федерации, в том числе Федеральным законом от 21.12.2013 № 353-ФЗ «О потребительском кредите (займе)».</p>

<h3>8. Реквизиты и подписи сторон</h3>

<table class="sign">
  <tr>
    <td>
      <p class="bold">ЗАЙМОДАВЕЦ:</p>
      <p>{MKK["name"]}</p>
      <p>Адрес: {MKK["address"]}</p>
      <p>Банк: {MKK["bank"]}</p>
      <p>р/с: {MKK["rs"]}</p>
      <p>к/с: {MKK["ks"]}</p>
      <p>БИК: {MKK["bik"]}</p>
      <p style="font-size:10pt;">(Если у вас оплата по реквизитам, обязательно указывайте в комментарии свой номер договора)</p>
      <p>Тел.: {MKK["phone"]}</p>
      <br>
      <p>Директор:</p>
      <p>{MKK["director"]}</p>
      <p style="position:relative;height:34pt;"><span class="sign-line"></span>{SIGN_IMG}</p>
      <p style="margin-top:8pt;position:relative;height:90pt;">М.П.{SEAL_IMG}</p>
    </td>
    <td>
      <p class="bold">ЗАЁМЩИК:</p>
      <p>{full_name}</p>
      <p>Дата рождения: {birth_date or "—"}</p>
      <p>Паспорт: {passport_str}</p>
      <p>Адрес регистрации: {address or "—"}</p>
      <p>Тел.: {phone}</p>
      {f'<p>Email: {email}</p>' if email else ''}
      <br>
      {digital_sign_block(contract_num)}
      <p style="margin-top:4pt;font-size:10pt;">({full_name})</p>
      <br>
      <p>Дата: {date_str}</p>
    </td>
  </tr>
</table>

<p style="margin-top:16pt;font-size:9pt;color:#555;text-align:center;">
  Договор сформирован автоматически {msk(datetime.now()).strftime("%d.%m.%Y в %H:%M")} · {MKK["name"]} · {MKK["site"]}
</p>

</body>
</html>"""
    return html


def html_to_pdf_bytes(html: str) -> bytes:
    """Конвертирует HTML в PDF через weasyprint."""
    from weasyprint import HTML as WH
    buf = io.BytesIO()
    WH(string=html).write_pdf(buf)
    return buf.getvalue()


BACKFILL_WHERE = f"""
    a.status IN ('approved','partner_card')
    AND (a.contract_url IS NULL OR a.contract_url = '')
    AND COALESCE(a.approved_amount, a.amount) >= 1000
    AND a.id = (SELECT x.id FROM {SCHEMA}.applications x WHERE x.phone = a.phone ORDER BY x.created_at DESC LIMIT 1)
"""


def store_contract_file(html: str, app_id: str, now_ts: str):
    """PDF, а если конвертер недоступен — готовая HTML-страница договора."""
    try:
        return f"contracts/contract_{app_id}_{now_ts}_v4.pdf", html_to_pdf_bytes(html), "application/pdf"
    except Exception as ex:
        print(f"[contract] pdf unavailable, saving html: {ex}")
        return f"contracts/contract_{app_id}_{now_ts}_v4.html", html.encode("utf-8"), "text/html; charset=utf-8"


def build_and_store(cur, app_id: str, loan_id: int) -> str:
    app_id_e = str(app_id).replace("'", "''")
    cur.execute(f"""
        SELECT full_name, phone, email, birth_date, birth_place,
               passport_series, passport_number, passport_date, passport_code, passport_by,
               approved_amount, approved_rate, approved_days, amount, days
        FROM {SCHEMA}.applications WHERE id = '{app_id_e}'
    """)
    (full_name, phone, email, birth_date, birth_place, ps, pn, pd, pc, pb,
     approved_amount, approved_rate, approved_days, amount, days) = cur.fetchone()
    app_data = {
        "full_name": full_name or "", "phone": phone or "", "email": email or "",
        "birth_date": str(birth_date) if birth_date else "", "birth_place": birth_place or "",
        "passport_series": ps or "", "passport_number": pn or "",
        "passport_date": str(pd) if pd else "", "passport_code": pc or "", "passport_by": pb or "",
        "amount": float(approved_amount) if approved_amount else float(amount),
        "rate": float(approved_rate) if approved_rate else 0.008,
        "days": int(approved_days) if approved_days else int(days),
    }
    html = generate_contract_html(app_data, loan_id or int(app_id_e))
    now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    s3_key, body_bytes, ctype = store_contract_file(html, str(app_id), now_ts)
    s3_client().put_object(Bucket="files", Key=s3_key, Body=body_bytes, ContentType=ctype)
    contract_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{s3_key}"
    cur.execute(f"UPDATE {SCHEMA}.applications SET contract_url='{contract_url.replace(chr(39), chr(39)*2)}' WHERE id='{app_id_e}'")
    return contract_url


REFRESH_WHERE = f"""
    a.status IN ('approved','partner_card')
    AND a.contract_url IS NOT NULL AND a.contract_url <> ''
    AND a.contract_url NOT LIKE '%v4.pdf' AND a.contract_url NOT LIKE '%v4.html'
    AND a.id = (SELECT x.id FROM {SCHEMA}.applications x WHERE x.phone = a.phone ORDER BY x.created_at DESC LIMIT 1)
    AND COALESCE((SELECT lo.signed FROM {SCHEMA}.loans lo JOIN {SCHEMA}.users u ON u.id = lo.user_id
                  WHERE u.phone = a.phone ORDER BY lo.created_at DESC LIMIT 1), FALSE) = FALSE
"""


def backfill_contracts(cur, conn, refresh: bool = False) -> dict:
    """Создаёт недостающие (или обновляет неподписанные) договоры пачкой по 3 штуки."""
    where = REFRESH_WHERE if refresh else BACKFILL_WHERE
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.applications a WHERE {where}")
    total_before = cur.fetchone()[0]
    cur.execute(f"""
        SELECT a.id, (SELECT lo.id FROM {SCHEMA}.loans lo JOIN {SCHEMA}.users u ON u.id = lo.user_id
                      WHERE u.phone = a.phone ORDER BY lo.created_at DESC LIMIT 1)
        FROM {SCHEMA}.applications a WHERE {where} ORDER BY a.id DESC LIMIT 3
    """)
    batch = cur.fetchall()
    done, failed = 0, 0
    for app_id, loan_id in batch:
        try:
            build_and_store(cur, str(app_id), int(loan_id) if loan_id else 0)
            conn.commit()
            done += 1
        except Exception as ex:
            conn.rollback()
            failed += 1
            print(f"[backfill] app_id={app_id} error: {ex}")
    cur.close(); conn.close()
    return {
        "statusCode": 200, "headers": CORS,
        "body": json.dumps({"ok": True, "created": done, "failed": failed,
                            "remaining": max(0, total_before - done)}, ensure_ascii=False),
    }


def generate_card_contract_html(d: dict, num: int) -> str:
    full_name = d.get("full_name", "")
    phone = d.get("phone", "")
    email = d.get("email", "")
    birth_date = d.get("birth_date", "")
    birth_place = d.get("birth_place", "")
    passport_str = f"{d.get('passport_series', '')} {d.get('passport_number', '')}"
    if d.get("passport_date"):
        passport_str += f", выдан {d['passport_date']}"
    if d.get("passport_by"):
        passport_str += f" {d['passport_by']}"
    if d.get("passport_code"):
        passport_str += f", код {d['passport_code']}"
    limit = float(d.get("limit", 0))
    rate_w = float(d.get("rate", 24) or 24)
    days = int(d.get("days", 0) or 0)
    card_last4 = str(d.get("card_number", ""))[-4:]
    issued = d.get("issued_at") or datetime.now()
    date_str = msk(issued).strftime("%d.%m.%Y")
    contract_num = f"К-{str(num).zfill(10)}/{msk(issued).strftime('%Y')}"
    limit_words = num_to_words(int(limit))
    term_row = f'<tr><td class="label">Срок действия лимита</td><td class="value"><span class="bold">{days} календарных дней</span></td></tr>' if days else ""

    html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор займа по карте №{contract_num}</title>
<style>{CONTRACT_CSS}</style>
</head>
<body>

<h1>Договор потребительского займа</h1>
<h2>(кредитный лимит по карте РУСФИНАНС 24) № {contract_num}</h2>
<p class="center num">г. Москва &nbsp;&nbsp;&nbsp; {date_str}</p>

<p><span class="bold">{MKK["name"]}</span>, именуемое в дальнейшем <span class="bold">«Займодавец»</span>, в лице директора {MKK["director"]}, действующего на основании Устава, с одной стороны, и</p>

<p><span class="bold">{full_name}</span>, дата рождения: {birth_date or "—"}, место рождения: {birth_place or "—"}, паспорт: {passport_str}, именуемый(-ая) в дальнейшем <span class="bold">«Заёмщик»</span>, с другой стороны, заключили настоящий Договор о нижеследующем:</p>

<h3>1. Индивидуальные условия</h3>

<table class="params">
  <tr><td class="label">Карта</td><td class="value">Виртуальная карта РУСФИНАНС 24 •••• {card_last4}</td></tr>
  <tr><td class="label">Лимит займа по карте</td><td class="value"><span class="bold">{int(limit):,} ₽</span> ({limit_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Процентная ставка</td><td class="value"><span class="bold">{rate_w:g}% в неделю</span></td></tr>
  {term_row}
  <tr><td class="label">Порядок погашения</td><td class="value">Еженедельные платежи, минимальный платёж — {CARD_MIN_PAYMENT_PERCENT}% от общей суммы задолженности</td></tr>
  <tr><td class="label">Способ получения средств</td><td class="value">Перевод из доступного лимита на банковскую карту / СБП Заёмщика</td></tr>
  <tr><td class="label">Контактный телефон Заёмщика</td><td class="value">{phone}</td></tr>
  {f'<tr><td class="label">Email Заёмщика</td><td class="value">{email}</td></tr>' if email else ''}
</table>

<h3>2. Предмет договора</h3>

<p>2.1. Займодавец открывает Заёмщику возобновляемый лимит займа по карте в размере, указанном в п. 1, а Заёмщик обязуется возвращать полученные суммы и уплачивать проценты в порядке, установленном настоящим Договором.</p>

<p>2.2. Заёмщик самостоятельно в личном кабинете определяет сумму и срок каждого перевода в пределах доступного остатка лимита. Доступный остаток увеличивается на сумму возвращённой задолженности.</p>

<p>2.3. Заём предоставляется на потребительские нужды, не связанные с предпринимательской деятельностью.</p>

<h3>3. Проценты и погашение</h3>

<p>3.1. За пользование суммами займа Заёмщик уплачивает проценты по ставке <span class="bold">{rate_w:g}% в неделю</span> от суммы использованного лимита.</p>

<p>3.2. Погашение производится еженедельно по графику, отображаемому в личном кабинете. Минимальный платёж составляет {CARD_MIN_PAYMENT_PERCENT}% от общей суммы задолженности; Заёмщик вправе погасить задолженность полностью в любой момент.</p>

<p>3.3. Платёж может быть внесён по реквизитам Займодавца, указанным в разделе 6. В комментарии к платежу необходимо указывать номер настоящего договора.</p>

<h3>4. Права и обязанности сторон</h3>

<p>4.1. Заёмщик обязуется своевременно вносить платежи, сообщать об изменении контактных данных и не передавать данные карты третьим лицам.</p>

<p>4.2. Займодавец вправе заблокировать карту и потребовать досрочного возврата задолженности при нарушении Заёмщиком условий настоящего Договора, а также передать право требования третьим лицам в порядке, предусмотренном законодательством РФ.</p>

<p>4.3. Заёмщик несёт ответственность за достоверность предоставленных данных. При просрочке платежей Займодавец вправе начислять неустойку в соответствии с действующим законодательством и Общими условиями.</p>

<h3>5. Заключительные положения</h3>

<p>5.1. Подписывая настоящий Договор, Заёмщик даёт согласие на обработку персональных данных в целях исполнения договора и на передачу информации в бюро кредитных историй.</p>

<p>5.2. Договор вступает в силу с момента его подписания Заёмщиком простой электронной подписью в личном кабинете и действует до полного исполнения обязательств.</p>

<p>5.3. Споры разрешаются путём переговоров, а при недостижении согласия — в судебном порядке по месту нахождения Займодавца. Во всём остальном Стороны руководствуются Федеральным законом от 21.12.2013 № 353-ФЗ «О потребительском кредите (займе)».</p>

<h3>6. Реквизиты и подписи сторон</h3>

<table class="sign">
  <tr>
    <td>
      <p class="bold">ЗАЙМОДАВЕЦ:</p>
      <p>{MKK["name"]}</p>
      <p>Адрес: {MKK["address"]}</p>
      <p>Банк: {MKK["bank"]}</p>
      <p>р/с: {MKK["rs"]}</p>
      <p>к/с: {MKK["ks"]}</p>
      <p>БИК: {MKK["bik"]}</p>
      <p style="font-size:10pt;">(Если у вас оплата по реквизитам, обязательно указывайте в комментарии свой номер договора)</p>
      <p>Тел.: {MKK["phone"]}</p>
      <br>
      <p>Директор:</p>
      <p>{MKK["director"]}</p>
      <p style="position:relative;height:34pt;"><span class="sign-line"></span>{SIGN_IMG}</p>
      <p style="margin-top:8pt;position:relative;height:90pt;">М.П.{SEAL_IMG}</p>
    </td>
    <td>
      <p class="bold">ЗАЁМЩИК:</p>
      <p>{full_name}</p>
      <p>Дата рождения: {birth_date or "—"}</p>
      <p>Паспорт: {passport_str}</p>
      <p>Тел.: {phone}</p>
      {f'<p>Email: {email}</p>' if email else ''}
      <br>
      {digital_sign_block(contract_num)}
      <p style="margin-top:4pt;font-size:10pt;">({full_name})</p>
      <br>
      <p>Дата: {date_str}</p>
    </td>
  </tr>
</table>

</body>
</html>"""
    return html


def build_card_contract(cur, app_id: str) -> str:
    app_id_e = str(app_id).replace("'", "''")
    cur.execute(f"""
        SELECT full_name, phone, email, birth_date, birth_place,
               passport_series, passport_number, passport_date, passport_code, passport_by,
               virtual_card_limit, virtual_card_rate, virtual_card_days, virtual_card_number, virtual_card_issued_at, id
        FROM {SCHEMA}.applications WHERE id = '{app_id_e}'
    """)
    r = cur.fetchone()
    d = {
        "full_name": r[0] or "", "phone": r[1] or "", "email": r[2] or "",
        "birth_date": str(r[3]) if r[3] else "", "birth_place": r[4] or "",
        "passport_series": r[5] or "", "passport_number": r[6] or "",
        "passport_date": str(r[7]) if r[7] else "", "passport_code": r[8] or "", "passport_by": r[9] or "",
        "limit": float(r[10] or 0), "rate": float(r[11] or 24), "days": r[12] or 0,
        "card_number": r[13] or "", "issued_at": r[14],
    }
    html = generate_card_contract_html(d, int(r[15]))
    now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext_key, body_bytes, ctype = store_contract_file(html, f"card_{app_id}", now_ts)
    s3_client().put_object(Bucket="files", Key=ext_key, Body=body_bytes, ContentType=ctype)
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{ext_key}"
    cur.execute(f"UPDATE {SCHEMA}.applications SET card_contract_url='{url.replace(chr(39), chr(39)*2)}' WHERE id='{app_id_e}'")
    return url


CARD_BACKFILL_WHERE = """
    a.virtual_card_number IS NOT NULL AND a.virtual_card_status IN ('pending','active','blocked')
    AND (a.card_contract_url IS NULL OR a.card_contract_url = ''
         OR (a.card_contract_url NOT LIKE '%v4.pdf' AND a.card_contract_url NOT LIKE '%v4.html'))
"""


def backfill_card_contracts(cur, conn) -> dict:
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.applications a WHERE {CARD_BACKFILL_WHERE}")
    total_before = cur.fetchone()[0]
    cur.execute(f"SELECT a.id FROM {SCHEMA}.applications a WHERE {CARD_BACKFILL_WHERE} ORDER BY a.id DESC LIMIT 3")
    done, failed = 0, 0
    for (app_id,) in cur.fetchall():
        try:
            build_card_contract(cur, str(app_id))
            conn.commit()
            done += 1
        except Exception as ex:
            conn.rollback()
            failed += 1
            print(f"[card-backfill] app_id={app_id} error: {ex}")
    cur.close(); conn.close()
    return {
        "statusCode": 200, "headers": CORS,
        "body": json.dumps({"ok": True, "created": done, "failed": failed,
                            "remaining": max(0, total_before - done)}, ensure_ascii=False),
    }


def handler(event: dict, context) -> dict:
    """Генерация PDF договора займа и сохранение в S3. Вызывается из admin при одобрении заявки."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # Авторизация через admin-токен
    hdrs = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    raw_token = hdrs.get("x-authorization") or hdrs.get("authorization") or ""
    token = raw_token.replace("Bearer ", "").replace("bearer ", "").strip()

    conn = get_conn()
    cur = conn.cursor()

    # Проверяем admin-токен
    t = token.replace("'", "''")
    cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()")
    if not cur.fetchone():
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    if body.get("cardBackfill"):
        return backfill_card_contracts(cur, conn)

    if body.get("cardAppId"):
        url = build_card_contract(cur, str(body["cardAppId"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "contractUrl": url}, ensure_ascii=False)}

    if body.get("backfill"):
        return backfill_contracts(cur, conn, bool(body.get("refresh")))

    app_id = body.get("appId")
    loan_id = body.get("loanId")

    if not app_id:
        cur.close(); conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан appId"})}

    # Получаем данные заявки
    app_id_e = str(app_id).replace("'", "''")
    cur.execute(f"""
        SELECT full_name, phone, email, birth_date, birth_place,
               passport_series, passport_number, passport_date, passport_code, passport_by,
               approved_amount, approved_rate, approved_days, amount, days
        FROM {SCHEMA}.applications WHERE id = '{app_id_e}'
    """)
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}

    (full_name, phone, email, birth_date, birth_place,
     ps, pn, pd, pc, pb,
     approved_amount, approved_rate, approved_days, amount, days) = row

    eff_amount = float(approved_amount) if approved_amount else float(amount)
    eff_rate = float(approved_rate) if approved_rate else 0.008
    eff_days = int(approved_days) if approved_days else int(days)
    eff_loan_id = int(loan_id) if loan_id else 0

    app_data = {
        "full_name": full_name or "",
        "phone": phone or "",
        "email": email or "",
        "birth_date": str(birth_date) if birth_date else "",
        "birth_place": birth_place or "",
        "passport_series": ps or "",
        "passport_number": pn or "",
        "passport_date": str(pd) if pd else "",
        "passport_code": pc or "",
        "passport_by": pb or "",
        "amount": eff_amount,
        "rate": eff_rate,
        "days": eff_days,
    }

    # Генерируем HTML и конвертируем в PDF
    html = generate_contract_html(app_data, eff_loan_id or int(app_id_e))

    s3 = s3_client()
    now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    s3_key, body_bytes, ctype = store_contract_file(html, str(app_id), now_ts)
    s3.put_object(Bucket="files", Key=s3_key, Body=body_bytes, ContentType=ctype)
    access_key = os.environ["AWS_ACCESS_KEY_ID"]
    contract_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{s3_key}"
    print(f"[generate-contract] saved {s3_key} -> {contract_url}")

    # Сохраняем ссылку в БД
    cu = contract_url.replace("'", "''")
    cur.execute(f"UPDATE {SCHEMA}.applications SET contract_url='{cu}' WHERE id='{app_id_e}'")
    conn.commit()
    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "contractUrl": contract_url}, ensure_ascii=False),
    }
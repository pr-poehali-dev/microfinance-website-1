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
    "bank": 'АО "Альфа-Банк", г. Москва',
    "rs": "40817810718541066730",
    "ks": "30101810200000000593",
    "bik": "044525593",
    "phone": "+7-996-201-95-00",
    "email": "support@rusfinans24.ru",
    "site": "rusfinans24.ru",
    "director": "Соколова Светлана Александровна",
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
    living_address = app_data.get("living_address", "")
    email = app_data.get("email", "")

    amount = float(app_data.get("amount", 0))
    rate = float(app_data.get("rate", 0.008))
    days = int(app_data.get("days", 0))
    insurance = float(app_data.get("insurance", 0) or 0)
    wheel_rub = int(app_data.get("wheel_rub", 0) or 0)
    debt = amount + insurance
    interest = round(debt * rate * days)
    interest -= min(wheel_rub, interest)
    total = debt + interest
    rate_pct = round(rate * 100, 1)

    today = app_data.get("contract_dt") or msk(datetime.now())
    date_str = today.strftime("%d.%m.%Y")
    due_date = (today + timedelta(days=days)).strftime("%d.%m.%Y")
    contract_num = f"{str(loan_num).zfill(12)}/{today.strftime('%Y')}"

    amount_words = num_to_words(int(amount))
    total_words = num_to_words(int(total))
    insurance_words = num_to_words(int(insurance))
    debt_words = num_to_words(int(debt))

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
<h2>{"(программа «Кредитный Доктор») " if app_data.get("credit_doctor") else ""}№ {contract_num}</h2>
<p class="center num">г. Москва &nbsp;&nbsp;&nbsp; {date_str}</p>

<p><span class="bold">{MKK["name"]}</span>, именуемое в дальнейшем <span class="bold">«Займодавец»</span>, в лице директора {MKK["director"]}, действующей на основании Устава, с одной стороны, и</p>

<p><span class="bold">{full_name}</span>, дата рождения: {birth_date or "—"}, место рождения: {birth_place or "—"}, паспорт: {passport_str}, именуемый(-ая) в дальнейшем <span class="bold">«Заёмщик»</span>, с другой стороны,</p>

<p>совместно именуемые <span class="bold">«Стороны»</span>, заключили настоящий Договор потребительского займа (далее — «Договор») о нижеследующем:</p>

<h3>1. Индивидуальные условия займа</h3>

<table class="params">
  <tr><td class="label">Сумма займа</td><td class="value"><span class="bold">{int(amount):,} ₽</span> ({amount_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Срок займа</td><td class="value"><span class="bold">{days} календарных дней</span></td></tr>
  {f'<tr><td class="label">Страхование жизни и здоровья (50% от суммы займа)</td><td class="value"><span class="bold">{int(insurance):,} ₽</span> ({insurance_words} рублей 00 копеек)</td></tr><tr><td class="label">Сумма долга (заём + страхование)</td><td class="value"><span class="bold">{int(debt):,} ₽</span> ({debt_words} рублей 00 копеек)</td></tr>' if insurance else ''}
  <tr><td class="label">Дата выдачи</td><td class="value"><span class="bold">{date_str}</span></td></tr>
  <tr><td class="label">Дата возврата</td><td class="value"><span class="bold">{due_date}</span></td></tr>
  <tr><td class="label">Процентная ставка</td><td class="value"><span class="bold">{rate_pct}% в день</span> ({round(rate_pct * 365, 1)}% годовых)</td></tr>
  <tr><td class="label">Начисленные проценты{' (на сумму долга)' if insurance else ''}</td><td class="value"><span class="bold">{int(interest):,} ₽</span></td></tr>
  <tr><td class="label">Итоговая сумма к выплате</td><td class="value"><span class="bold">{int(total):,} ₽</span> ({total_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Способ получения</td><td class="value">Перевод на банковский счёт / СБП</td></tr>
  <tr><td class="label">Контактный телефон Заёмщика</td><td class="value">{phone}</td></tr>
  {f'<tr><td class="label">Email Заёмщика</td><td class="value">{email}</td></tr>' if email else ''}
</table>

<div class="highlight">
  <p class="bold">Полная стоимость займа (ПСК): {round(rate_pct * 365, 2)}% годовых</p>
</div>

<h3>2. Предмет договора</h3>

<p>2.1. Займодавец передаёт в собственность Заёмщику денежные средства в размере <span class="bold">{int(amount):,} ({"".join([amount_words, " рублей 00 копеек"])}</span>, а Заёмщик обязуется вернуть указанную сумму займа{" (с учётом страхования жизни и здоровья на сумму " + format(int(insurance), ",") + " ₽)" if insurance else ""} и уплатить проценты в порядке и на условиях, предусмотренных настоящим Договором. Итоговая сумма к выплате составляет <span class="bold">{int(total):,} ₽</span>.</p>

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

<p>4.1. За пользование суммой займа Заёмщик уплачивает Займодавцу проценты из расчёта <span class="bold">{rate_pct}% в день</span> от {"суммы долга (сумма займа и страхование жизни и здоровья)" if insurance else "суммы займа"}.</p>

<p>4.2. Проценты начисляются ежедневно, начиная со дня, следующего за днём предоставления займа, по день его фактического возврата включительно.</p>

<p>4.3. Уплата процентов производится одновременно с возвратом суммы основного долга в последний день срока займа — <span class="bold">{due_date}</span>.</p>

<h3>5. Ответственность сторон</h3>

<p>5.1. В случае нарушения срока возврата суммы займа и/или процентов Займодавец начисляет штраф (пеню) в размере <span class="bold">2,99% от суммы основного долга за каждый день просрочки</span>. Штраф начисляется автоматически, ежедневно, начиная с первого дня после окончания срока займа, и до полного погашения задолженности.</p>

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
      <p>Адрес проживания: {living_address or "—"}</p>
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
        return f"contracts/contract_{app_id}_{now_ts}_v10.pdf", html_to_pdf_bytes(html), "application/pdf"
    except Exception as ex:
        print(f"[contract] pdf unavailable, saving html: {ex}")
        return f"contracts/contract_{app_id}_{now_ts}_v10.html", html.encode("utf-8"), "text/html; charset=utf-8"


def build_and_store(cur, app_id: str, loan_id: int, when=None) -> str:
    app_id_e = str(app_id).replace("'", "''")
    cur.execute(f"""
        SELECT full_name, phone, email, birth_date, birth_place,
               passport_series, passport_number, passport_date, passport_code, passport_by,
               approved_amount, approved_rate, approved_days, amount, days, reg_address, living_address,
               insurance_amount, wheel_discount_rub, COALESCE(is_credit_doctor, FALSE)
        FROM {SCHEMA}.applications WHERE id = '{app_id_e}'
    """)
    (full_name, phone, email, birth_date, birth_place, ps, pn, pd, pc, pb,
     approved_amount, approved_rate, approved_days, amount, days, reg_address, living_address,
     insurance_amount, wheel_discount_rub, is_cd) = cur.fetchone()
    app_data = {
        "full_name": full_name or "", "phone": phone or "", "email": email or "",
        "birth_date": str(birth_date) if birth_date else "", "birth_place": birth_place or "",
        "passport_series": ps or "", "passport_number": pn or "",
        "passport_date": str(pd) if pd else "", "passport_code": pc or "", "passport_by": pb or "",
        "amount": float(approved_amount) if approved_amount else float(amount),
        "rate": float(approved_rate) if approved_rate else 0.008,
        "days": int(approved_days) if approved_days else int(days),
        "address": reg_address or "",
        "living_address": living_address or "",
        "insurance": float(insurance_amount) if insurance_amount else 0,
        "wheel_rub": int(wheel_discount_rub) if wheel_discount_rub else 0,
        "credit_doctor": bool(is_cd),
    }
    if when:
        app_data["contract_dt"] = msk(when)
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
    AND a.contract_url NOT LIKE '%v10.pdf' AND a.contract_url NOT LIKE '%v10.html'
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

<p><span class="bold">{MKK["name"]}</span>, именуемое в дальнейшем <span class="bold">«Займодавец»</span>, в лице директора {MKK["director"]}, действующей на основании Устава, с одной стороны, и</p>

<p><span class="bold">{full_name}</span>, дата рождения: {birth_date or "—"}, место рождения: {birth_place or "—"}, паспорт: {passport_str}, именуемый(-ая) в дальнейшем <span class="bold">«Заёмщик»</span>, с другой стороны, заключили настоящий Договор о нижеследующем:</p>

<h3>1. Индивидуальные условия</h3>

<table class="params">
  <tr><td class="label">Карта</td><td class="value">Виртуальная карта РУСФИНАНС 24 •••• {card_last4}</td></tr>
  <tr><td class="label">Лимит займа по карте</td><td class="value"><span class="bold">{int(limit):,} ₽</span> ({limit_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Процентная ставка</td><td class="value"><span class="bold">{rate_w:g}% в неделю</span></td></tr>
  {term_row}
  <tr><td class="label">Порядок погашения</td><td class="value">Еженедельные платежи, минимальный платёж — {CARD_MIN_PAYMENT_PERCENT}% от общей суммы задолженности</td></tr>
  <tr><td class="label">Способ получения средств</td><td class="value">Перевод из доступного лимита на банковскую карту / СБП Заёмщика</td></tr>
  <tr><td class="label">Обслуживание карты</td><td class="value">399 руб. в месяц, списывается с лимита карты при активации и далее ежемесячно</td></tr>
  <tr><td class="label">Комиссия за перевод с карты на карту</td><td class="value">199 руб. + 3,9% от суммы перевода</td></tr>
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

<p>3.4. За обслуживание карты Заёмщик уплачивает <span class="bold">399 (триста девяносто девять) рублей в месяц</span>. Первое списание производится автоматически из лимита карты в момент её активации, последующие — ежемесячно в день активации. Списанные суммы уменьшают доступный остаток лимита.</p>

<p>3.5. За перевод денежных средств с карты РУСФИНАНС 24 на любую другую карту Заёмщик уплачивает комиссию в размере <span class="bold">199 (сто девяносто девять) рублей + 3,9% от суммы перевода</span>. Комиссия списывается из доступного остатка лимита в момент оформления перевода.</p>

<h3>4. Права и обязанности сторон</h3>

<p>4.1. Заёмщик обязуется своевременно вносить платежи, сообщать об изменении контактных данных и не передавать данные карты третьим лицам.</p>

<p>4.2. Займодавец вправе заблокировать карту и потребовать досрочного возврата задолженности при нарушении Заёмщиком условий настоящего Договора, а также передать право требования третьим лицам в порядке, предусмотренном законодательством РФ.</p>

<p>4.3. Заёмщик несёт ответственность за достоверность предоставленных данных. При просрочке платежей Займодавец начисляет штраф в размере <span class="bold">2,99% в день</span> от суммы просроченного основного долга по каждому переводу, начиная со дня, следующего за последним днём срока перевода, и до полного погашения задолженности. Штраф начисляется автоматически, ежедневно, и включается в сумму задолженности в личном кабинете.</p>

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
      <p>Адрес регистрации: {d.get("address") or "—"}</p>
      <p>Адрес проживания: {d.get("living_address") or "—"}</p>
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
               virtual_card_limit, virtual_card_rate, virtual_card_days, virtual_card_number, virtual_card_issued_at, id,
               reg_address, living_address
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
        "address": r[16] or "", "living_address": r[17] or "",
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
         OR (a.virtual_card_status = 'pending'
             AND a.card_contract_url NOT LIKE '%v10.pdf' AND a.card_contract_url NOT LIKE '%v10.html'))
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



TERM_KINDS = {
    "car": {
        "table": "car_loan_applications", "prefix": "А", "title": "Договор потребительского займа",
        "subtitle": "(займ под залог автомобиля)", "store": "car",
    },
    "shop": {
        "table": "shopping_loan_applications", "prefix": "Т", "title": "Договор потребительского займа",
        "subtitle": "(займ на покупки)", "store": "shop",
    },
}


def term_schedule(amount: float, months: int, rate: float, start) -> list:
    rows = []
    principal = amount / months
    remaining = amount
    for m in range(1, months + 1):
        interest = round(remaining * rate / 100)
        rows.append({
            "n": m, "due": (start + timedelta(days=30 * m)).strftime("%d.%m.%Y"),
            "principal": round(principal), "interest": interest, "total": round(principal + interest),
        })
        remaining -= principal
    return rows


def generate_term_contract_html(kind: str, d: dict) -> str:
    k = TERM_KINDS[kind]
    full_name = d.get("full_name", "")
    phone = d.get("phone", "")
    email = d.get("email", "")
    passport_str = d.get("passport", "")
    amount = float(d.get("amount", 0))
    months = int(d.get("months", 1) or 1)
    rate = float(d.get("rate", 0))
    start = d.get("start") or datetime.now()
    date_str = msk(start).strftime("%d.%m.%Y")
    contract_num = f"{k['prefix']}-{str(d['id']).zfill(12)}"
    rows = term_schedule(amount, months, rate, msk(start))
    total_pay = sum(r["total"] for r in rows)
    amount_words = num_to_words(int(amount))
    sched_rows = "".join(
        f'<tr><td>{r["n"]}</td><td>{r["due"]}</td><td>{r["principal"]:,} ₽</td><td>{r["interest"]:,} ₽</td><td>{r["total"]:,} ₽</td></tr>'
        for r in rows
    )
    if kind == "car":
        subject = (f'<tr><td class="label">Залоговое имущество</td><td class="value">Автомобиль {d.get("car_brand") or ""} '
                   f'{d.get("car_model") or ""}, {d.get("car_year") or "—"} г.в.</td></tr>')
        subject_p = ("2.4. Исполнение обязательств Заёмщика по настоящему Договору обеспечивается залогом автомобиля, "
                     "указанного в п. 1. Заёмщик подтверждает, что является собственником автомобиля, он не находится в залоге "
                     "у третьих лиц и не обременён иными правами.")
    else:
        subject = (f'<tr><td class="label">Приобретаемый товар</td><td class="value">{d.get("item_name") or "—"}, '
                   f'магазин: {d.get("shop_name") or "—"}</td></tr>')
        subject_p = ("2.4. Заём предоставляется для оплаты товара, указанного в п. 1. Заёмщик подтверждает, "
                     "что приобретает товар для личных нужд, не связанных с предпринимательской деятельностью.")
    if kind == "shop":
        receive_method = "Перевод в магазин партнёра"
        receive_p = ("2.2. Заём считается предоставленным в момент перечисления средств в магазин партнёра, "
                     "указанный в п. 1, в счёт оплаты приобретаемого Заёмщиком товара.")
    else:
        receive_method = "Перевод на банковскую карту / СБП Заёмщика"
        receive_p = "2.2. Заём считается предоставленным в момент перечисления средств на банковскую карту или счёт Заёмщика, указанные им."
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор займа №{contract_num}</title>
<style>{CONTRACT_CSS} table.sched {{width:100%;border-collapse:collapse;font-size:10pt;}} table.sched td, table.sched th {{border:1px solid #444;padding:3pt 5pt;text-align:center;}}</style>
</head>
<body>

<h1>{k["title"]}</h1>
<h2>{k["subtitle"]} № {contract_num}</h2>
<p class="center num">г. Москва &nbsp;&nbsp;&nbsp; {date_str}</p>

<p><span class="bold">{MKK["name"]}</span>, именуемое в дальнейшем <span class="bold">«Займодавец»</span>, в лице директора {MKK["director"]}, действующей на основании Устава, с одной стороны, и</p>

<p><span class="bold">{full_name}</span>, дата рождения: {d.get("birth_date") or "—"}, паспорт: {passport_str}, именуемый(-ая) в дальнейшем <span class="bold">«Заёмщик»</span>, с другой стороны, заключили настоящий Договор о нижеследующем:</p>

<h3>1. Индивидуальные условия</h3>

<table class="params">
  <tr><td class="label">Сумма займа</td><td class="value"><span class="bold">{int(amount):,} ₽</span> ({amount_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Срок займа</td><td class="value"><span class="bold">{months} мес.</span></td></tr>
  <tr><td class="label">Процентная ставка</td><td class="value"><span class="bold">{rate:g}% в месяц</span> от остатка основного долга</td></tr>
  <tr><td class="label">Порядок погашения</td><td class="value">Ежемесячные платежи по графику (основной долг равными частями + проценты на остаток)</td></tr>
  <tr><td class="label">Общая сумма выплат</td><td class="value"><span class="bold">{total_pay:,} ₽</span></td></tr>
  {subject}
  <tr><td class="label">Способ получения средств</td><td class="value">{receive_method}</td></tr>
  <tr><td class="label">Контактный телефон Заёмщика</td><td class="value">{phone}</td></tr>
  {f'<tr><td class="label">Email Заёмщика</td><td class="value">{email}</td></tr>' if email else ''}
</table>

<h3>2. Предмет договора</h3>

<p>2.1. Займодавец передаёт Заёмщику денежные средства в сумме, указанной в п. 1, а Заёмщик обязуется возвратить сумму займа и уплатить проценты в сроки и на условиях настоящего Договора.</p>

<p>{receive_p}</p>

<p>2.3. Заём предоставляется на потребительские нужды, не связанные с предпринимательской деятельностью.</p>

<p>{subject_p}</p>

<h3>3. Проценты и погашение</h3>

<p>3.1. За пользование займом Заёмщик уплачивает проценты по ставке <span class="bold">{rate:g}% в месяц</span> от остатка основного долга.</p>

<p>3.2. Погашение производится ежемесячно по графику ниже. Платёж может быть внесён по реквизитам Займодавца, указанным в разделе 6, с указанием номера настоящего договора в комментарии.</p>

<table class="sched">
  <tr><th>№</th><th>Дата</th><th>Основной долг</th><th>Проценты</th><th>Платёж</th></tr>
  {sched_rows}
</table>

<p>3.3. За просрочку платежа ежедневно автоматически начисляется штраф в размере 2,99% в день от суммы просроченного основного долга до полного погашения задолженности.</p>

<h3>4. Права и обязанности сторон</h3>

<p>4.1. Заёмщик обязуется своевременно вносить платежи и сообщать об изменении контактных данных.</p>

<p>4.2. Займодавец вправе потребовать досрочного возврата задолженности при нарушении Заёмщиком условий настоящего Договора.</p>

<p>4.3. Заёмщик несёт ответственность за достоверность предоставленных данных.</p>

<h3>5. Заключительные положения</h3>

<p>5.1. Подписывая настоящий Договор, Заёмщик даёт согласие на обработку персональных данных в целях его исполнения.</p>

<p>5.2. Договор вступает в силу с момента его подписания Заёмщиком простой электронной подписью и действует до полного исполнения сторонами обязательств.</p>

<p>5.3. Споры разрешаются путём переговоров, а при недостижении согласия — в судебном порядке по месту нахождения Займодавца.</p>

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
      <p>Дата рождения: {d.get("birth_date") or "—"}</p>
      <p>Паспорт: {passport_str}</p>
      <p>Адрес регистрации: {d.get("address") or "—"}</p>
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


def build_term_contract(cur, kind: str, app_id: int) -> str:
    k = TERM_KINDS[kind]
    if kind == "car":
        cur.execute(
            f"SELECT id, full_name, phone, email, birth_date, address, passport_serial, passport_num, passport_issued, "
            f"approved_amount, loan_amount, approved_months, loan_months, approved_rate, promo_discount, created_at, car_brand, car_model, car_year "
            f"FROM {SCHEMA}.{k['table']} WHERE id = {int(app_id)}"
        )
        r = cur.fetchone()
        passport = f"{r[6] or ''} {r[7] or ''}".strip() + (f", выдан {r[8]}" if r[8] else "")
        extra = {"car_brand": r[16], "car_model": r[17], "car_year": r[18]}
    else:
        cur.execute(
            f"SELECT id, full_name, phone, email, birth_date, address, passport_series, passport_number, passport_by, "
            f"approved_amount, loan_amount, approved_months, loan_months, approved_rate, promo_discount, created_at, shop_name, item_name, passport_date "
            f"FROM {SCHEMA}.{k['table']} WHERE id = {int(app_id)}"
        )
        r = cur.fetchone()
        passport = f"{r[6] or ''} {r[7] or ''}".strip()
        if r[18]:
            passport += f", выдан {r[18]}"
        if r[8]:
            passport += f" {r[8]}"
        extra = {"shop_name": r[16], "item_name": r[17]}
    rate = float(r[13] or 0)
    disc = int(r[14] or 0)
    if rate and disc:
        rate = round(rate * (100 - disc) / 100, 4)
    d = {
        "id": r[0], "full_name": r[1] or "", "phone": r[2] or "", "email": r[3] or "",
        "birth_date": r[4] or "", "address": r[5] or "", "passport": passport,
        "amount": float(r[9] or r[10] or 0), "months": int(r[11] or r[12] or 1), "rate": rate,
        "start": r[15], **extra,
    }
    html = generate_term_contract_html(kind, d)
    now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext_key, body_bytes, ctype = store_contract_file(html, f"{k['store']}_{app_id}", now_ts)
    s3_client().put_object(Bucket="files", Key=ext_key, Body=body_bytes, ContentType=ctype)
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{ext_key}"
    cur.execute(f"UPDATE {SCHEMA}.{k['table']} SET contract_url = '{url}' WHERE id = {int(app_id)}")
    return url


def backfill_term_contracts(cur, conn) -> dict:
    """Пересоздаёт неподписанные договоры по автозаймам и займам на покупки (старая версия файла), пачкой по 3."""
    where_tpl = (
        "contract_url IS NOT NULL AND contract_url <> '' AND contract_url NOT LIKE '%v10.pdf' AND contract_url NOT LIKE '%v10.html' "
        "AND COALESCE(contract_signed, FALSE) = FALSE AND status IN ('approved','signing') AND approved_rate IS NOT NULL"
    )
    pending = []
    for kind, k in TERM_KINDS.items():
        cur.execute(f"SELECT id FROM {SCHEMA}.{k['table']} WHERE {where_tpl} ORDER BY id DESC")
        pending += [(kind, r[0]) for r in cur.fetchall()]
    total_before = len(pending)
    done, failed = 0, 0
    for kind, aid in pending[:3]:
        try:
            build_term_contract(cur, kind, int(aid))
            conn.commit()
            done += 1
        except Exception as ex:
            conn.rollback()
            failed += 1
            print(f"[term-backfill] {kind} {aid} error: {ex}")
    cur.close(); conn.close()
    return {
        "statusCode": 200, "headers": CORS,
        "body": json.dumps({"ok": True, "created": done, "failed": failed,
                            "remaining": max(0, total_before - done)}, ensure_ascii=False),
    }


def generate_invest_contract_html(d: dict) -> str:
    full_name = d.get("full_name", "")
    amount = int(d.get("amount", 0))
    term = int(d.get("term", 12))
    rate = float(d.get("rate", 8))
    payout = d.get("payout", "monthly")
    start = d["start"]
    end = d["end"]
    contract_num = f"И-{str(d['id']).zfill(12)}"
    date_str = start.strftime("%d.%m.%Y")
    monthly = round(amount * rate / 100)
    total_income = monthly * term
    amount_words = num_to_words(amount)
    if term % 12 == 0:
        y = term // 12
        term_text = f"{y} {_plural(y, 'год', 'года', 'лет')}"
    else:
        term_text = f"{term} {_plural(term, 'месяц', 'месяца', 'месяцев')}"
    if payout == "monthly":
        payout_text = f"Ежемесячно, не позднее даты, соответствующей дате внесения средств. Размер ежемесячной выплаты: {monthly:,} ₽"
        payout_p = ("3.2. Проценты выплачиваются Инвестору ежемесячно на банковскую карту, указанную Инвестором в личном кабинете. "
                    "Возврат суммы вложения осуществляется в последний день срока договора.")
    else:
        payout_text = f"Единовременно в конце срока вместе с возвратом суммы вложения. Общая сумма процентов: {total_income:,} ₽"
        payout_p = ("3.2. Проценты начисляются ежемесячно и выплачиваются Инвестору единовременно в конце срока договора вместе с возвратом "
                    "суммы вложения на банковскую карту, указанную Инвестором в личном кабинете.")
    phone = d.get("phone", "")
    email = d.get("email", "")
    _bd = str(d.get("birth_date") or "")
    if len(_bd) == 10 and _bd[4] == "-" and _bd[7] == "-":
        d = {**d, "birth_date": f"{_bd[8:10]}.{_bd[5:7]}.{_bd[0:4]}"}
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор инвестирования №{contract_num}</title>
<style>{CONTRACT_CSS}</style>
</head>
<body>

<h1>Договор инвестирования</h1>
<h2>(привлечение денежных средств) № {contract_num}</h2>
<p class="center num">г. Москва &nbsp;&nbsp;&nbsp; {date_str}</p>

<p><span class="bold">{MKK["name"]}</span>, именуемое в дальнейшем <span class="bold">«Компания»</span>, в лице директора {MKK["director"]}, действующей на основании Устава, с одной стороны, и</p>

<p><span class="bold">{full_name}</span>, дата рождения: {d.get("birth_date") or "—"}, именуемый(-ая) в дальнейшем <span class="bold">«Инвестор»</span>, с другой стороны, заключили настоящий Договор о нижеследующем.</p>

<h3>1. Индивидуальные условия</h3>

<table class="params">
  <tr><td class="label">Сумма вложения</td><td class="value"><span class="bold">{amount:,} ₽</span> ({amount_words} рублей 00 копеек)</td></tr>
  <tr><td class="label">Срок договора</td><td class="value"><span class="bold">{term_text}</span> (с {date_str} по {end.strftime("%d.%m.%Y")})</td></tr>
  <tr><td class="label">Доходность</td><td class="value"><span class="bold">{rate:g}% в месяц</span> от суммы вложения</td></tr>
  <tr><td class="label">Ежемесячный доход</td><td class="value"><span class="bold">{monthly:,} ₽</span></td></tr>
  <tr><td class="label">Выплата процентов</td><td class="value">{payout_text}</td></tr>
  <tr><td class="label">Общий доход за срок</td><td class="value"><span class="bold">{total_income:,} ₽</span></td></tr>
  <tr><td class="label">Пополнение</td><td class="value">Допускается в любое время на условиях отдельного договора</td></tr>
  <tr><td class="label">Контактный телефон Инвестора</td><td class="value">{phone}</td></tr>
  {f'<tr><td class="label">Email Инвестора</td><td class="value">{email}</td></tr>' if email else ''}
</table>

<h3>2. Предмет договора</h3>

<p>2.1. Инвестор передаёт Компании денежные средства в сумме, указанной в п. 1, для использования в деятельности Компании по предоставлению займов, а Компания обязуется вернуть сумму вложения по окончании срока договора и выплачивать Инвестору доход в размере и в сроки, предусмотренные настоящим Договором.</p>

<p>2.2. Средства считаются переданными Компании с момента их поступления на расчётный счёт Компании, реквизиты которого указаны в разделе 6.</p>

<h3>3. Доход и порядок расчётов</h3>

<p>3.1. Доход Инвестора составляет {rate:g}% в месяц от суммы вложения и начисляется за каждый полный месяц срока договора.</p>

<p>{payout_p}</p>

<p>3.3. Выплаты осуществляются в безналичном порядке. Инвестор самостоятельно указывает и при необходимости обновляет реквизиты банковской карты в личном кабинете. Компания не несёт ответственности за задержку выплат, вызванную неверно указанными реквизитами.</p>

<p>3.4. Инвестор вправе в любой момент пополнить сумму вложения. Каждое пополнение оформляется отдельным договором с собственными условиями и сроком.</p>

<h3>4. Права и обязанности сторон</h3>

<p>4.1. Компания обязуется использовать средства Инвестора в своей деятельности, своевременно выплачивать доход и вернуть сумму вложения по окончании срока.</p>

<p>4.2. Инвестор обязуется передать средства в порядке и в сроки, указанные в Договоре, и предоставлять достоверные сведения о себе.</p>

<p>4.3. Стороны несут ответственность за неисполнение обязательств в соответствии с законодательством Российской Федерации.</p>

<h3>5. Заключительные положения</h3>

<p>5.1. Подписывая настоящий Договор, Инвестор даёт согласие на обработку персональных данных в целях его исполнения.</p>

<p>5.2. Договор вступает в силу с момента его подписания сторонами и действует до полного исполнения обязательств. Договор подписывается простой электронной подписью.</p>

<p>5.3. Споры разрешаются путём переговоров, а при недостижении согласия — в судебном порядке по месту нахождения Компании.</p>

<h3>6. Реквизиты и подписи сторон</h3>

<table class="sign">
  <tr>
    <td>
      <p class="bold">КОМПАНИЯ:</p>
      <p>{MKK["name"]}</p>
      <p>Адрес: {MKK["address"]}</p>
      <p>Банк: {MKK["bank"]}</p>
      <p>р/с: {MKK["rs"]}</p>
      <p>к/с: {MKK["ks"]}</p>
      <p>БИК: {MKK["bik"]}</p>
      <p>Тел.: {MKK["phone"]}</p>
      <br>
      <p>Директор:</p>
      <p>{MKK["director"]}</p>
      <p style="position:relative;height:34pt;"><span class="sign-line"></span>{SIGN_IMG}</p>
      <p style="margin-top:8pt;position:relative;height:90pt;">М.П.{SEAL_IMG}</p>
    </td>
    <td>
      <p class="bold">ИНВЕСТОР:</p>
      <p>{full_name}</p>
      <p>Дата рождения: {d.get("birth_date") or "—"}</p>
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


def build_invest_contract(cur, investment_id: int) -> str:
    cur.execute(
        f"SELECT v.id, v.amount, v.term_months, v.payout, v.rate, v.start_date, i.full_name, i.birth_date, i.phone, i.email "
        f"FROM {SCHEMA}.investments v JOIN {SCHEMA}.investors i ON i.id = v.investor_id WHERE v.id = {int(investment_id)}"
    )
    r = cur.fetchone()
    if not r:
        raise ValueError("investment not found")
    start = r[5]
    m = start.month - 1 + int(r[2])
    y = start.year + m // 12
    m = m % 12 + 1
    import calendar
    end = start.replace(year=y, month=m, day=min(start.day, calendar.monthrange(y, m)[1]))
    d = {"id": r[0], "amount": int(r[1]), "term": int(r[2]), "payout": r[3], "rate": float(r[4]), "start": start, "end": end,
         "full_name": r[6] or "", "birth_date": r[7] or "", "phone": r[8] or "", "email": r[9] or ""}
    html = generate_invest_contract_html(d)
    now_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    key, body_bytes, ctype = store_contract_file(html, f"invest_{investment_id}", now_ts)
    s3_client().put_object(Bucket="files", Key=key, Body=body_bytes, ContentType=ctype)
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    cur.execute(f"UPDATE {SCHEMA}.investments SET contract_url = '{url}' WHERE id = {int(investment_id)}")
    return url


def backfill_invest_contracts(cur, conn) -> dict:
    cur.execute(f"SELECT id FROM {SCHEMA}.investments WHERE funded = TRUE AND (contract_url IS NULL OR contract_url = '') ORDER BY id")
    ids = [r[0] for r in cur.fetchall()]
    done, failed = 0, 0
    for iid in ids[:3]:
        try:
            build_invest_contract(cur, iid)
            conn.commit()
            done += 1
        except Exception as ex:
            conn.rollback()
            failed += 1
            print(f"[invest-backfill] {iid} error: {ex}")
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS,
            "body": json.dumps({"ok": True, "created": done, "failed": failed, "remaining": max(0, len(ids) - done)}, ensure_ascii=False)}


NOT_CURRENT = "NOT LIKE '%v10.pdf' AND {c} NOT LIKE '%v10.html'"


def rebuild_all(cur, conn, kind: str) -> dict:
    """Пересоздаёт все договоры выбранного вида (в том числе подписанные), сохраняя исходные номер и дату. Пачками по 3."""
    todo = []
    if kind == "loans":
        cur.execute(f"""
            SELECT a.id, lo.id, lo.created_at
            FROM {SCHEMA}.applications a
            LEFT JOIN LATERAL (
                SELECT l.id, l.created_at FROM {SCHEMA}.loans l JOIN {SCHEMA}.users u ON u.id = l.user_id
                WHERE u.phone = a.phone
                ORDER BY abs(extract(epoch from (l.created_at - COALESCE(a.reviewed_at, a.created_at)))) LIMIT 1
            ) lo ON TRUE
            WHERE a.status IN ('approved','partner_card') AND a.contract_url IS NOT NULL AND a.contract_url <> ''
              AND a.contract_url {NOT_CURRENT.format(c='a.contract_url')}
            ORDER BY a.id DESC
        """)
        todo = [("loans", r[0], r[1], r[2]) for r in cur.fetchall()]
    elif kind == "cards":
        cur.execute(
            f"SELECT id FROM {SCHEMA}.applications WHERE virtual_card_number IS NOT NULL AND card_contract_url IS NOT NULL "
            f"AND card_contract_url <> '' AND card_contract_url {NOT_CURRENT.format(c='card_contract_url')} ORDER BY id DESC"
        )
        todo = [("cards", r[0], None, None) for r in cur.fetchall()]
    elif kind == "term":
        for tk, k in TERM_KINDS.items():
            cur.execute(
                f"SELECT id FROM {SCHEMA}.{k['table']} WHERE contract_url IS NOT NULL AND contract_url <> '' "
                f"AND contract_url {NOT_CURRENT.format(c='contract_url')} ORDER BY id DESC"
            )
            todo += [(tk, r[0], None, None) for r in cur.fetchall()]
    elif kind == "invest":
        cur.execute(
            f"SELECT id FROM {SCHEMA}.investments WHERE contract_url IS NOT NULL AND contract_url <> '' "
            f"AND contract_url {NOT_CURRENT.format(c='contract_url')} ORDER BY id"
        )
        todo = [("invest", r[0], None, None) for r in cur.fetchall()]

    done, failed = 0, 0
    for what, rid, loan_id, loan_dt in todo[:3]:
        try:
            if what == "loans":
                build_and_store(cur, str(rid), int(loan_id) if loan_id else 0, loan_dt)
            elif what == "cards":
                build_card_contract(cur, str(rid))
            elif what == "invest":
                build_invest_contract(cur, int(rid))
            else:
                build_term_contract(cur, what, int(rid))
            conn.commit()
            done += 1
        except Exception as ex:
            conn.rollback()
            failed += 1
            print(f"[rebuild-all] {kind} {rid} error: {ex}")
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS,
            "body": json.dumps({"ok": True, "created": done, "failed": failed, "remaining": max(0, len(todo) - done)}, ensure_ascii=False)}


def ensure_term_contracts(cur, conn, phone_e: str) -> dict:
    out = {}
    for kind, k in TERM_KINDS.items():
        cur.execute(
            f"SELECT id FROM {SCHEMA}.{k['table']} WHERE phone = '{phone_e}' "
            f"AND status IN ('approved','signing','disbursed') AND (contract_url IS NULL OR contract_url = '') "
            f"AND COALESCE(approved_amount, 0) > 0 AND approved_rate IS NOT NULL "
            f"ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        out[kind] = False
        if row:
            try:
                build_term_contract(cur, kind, int(row[0]))
                conn.commit()
                out[kind] = True
            except Exception as ex:
                conn.rollback()
                print(f"[ensure] {kind} contract error: {ex}")
    return out


def ensure_client_contracts(cur, conn, token_e: str) -> dict:
    """Клиент запрашивает свои недостающие договоры (займ и карта) — создаются сразу."""
    cur.execute(
        f"SELECT u.id, u.phone FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = '{token_e}' AND s.expires_at > NOW()"
    )
    u = cur.fetchone()
    if not u:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
    user_id, phone = u
    ph = str(phone).replace("'", "''")
    created = {"loan": False, "card": False}
    created.update(ensure_term_contracts(cur, conn, ph))

    cur.execute(
        f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph}' "
        f"ORDER BY created_at DESC LIMIT 1"
    )
    last = cur.fetchone()
    if last:
        cur.execute(
            f"SELECT id FROM {SCHEMA}.applications WHERE id = {int(last[0])} "
            f"AND status IN ('approved','partner_card') AND (contract_url IS NULL OR contract_url = '') "
            f"AND COALESCE(approved_amount, amount) >= 1"
        )
        need = cur.fetchone()
        if need:
            cur.execute(f"SELECT id FROM {SCHEMA}.loans WHERE user_id = {int(user_id)} ORDER BY created_at DESC LIMIT 1")
            lr = cur.fetchone()
            try:
                build_and_store(cur, str(need[0]), int(lr[0]) if lr else 0)
                conn.commit()
                created["loan"] = True
            except Exception as ex:
                conn.rollback()
                print(f"[ensure] loan contract error: {ex}")

    cur.execute(
        f"SELECT id FROM {SCHEMA}.applications WHERE phone = '{ph}' AND virtual_card_number IS NOT NULL "
        f"AND virtual_card_status IN ('pending','active','blocked') "
        f"AND (card_contract_url IS NULL OR card_contract_url = '') "
        f"ORDER BY virtual_card_issued_at DESC NULLS LAST LIMIT 1"
    )
    cr = cur.fetchone()
    if cr:
        try:
            build_card_contract(cur, str(cr[0]))
            conn.commit()
            created["card"] = True
        except Exception as ex:
            conn.rollback()
            print(f"[ensure] card contract error: {ex}")

    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "created": created})}


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

    raw = event.get("body") or "{}"
    body = json.loads(raw) if isinstance(raw, str) else raw

    t = token.replace("'", "''")

    if body.get("ensure"):
        return ensure_client_contracts(cur, conn, t)

    if body.get("investorEnsure"):
        cur.execute(
            f"SELECT s.investor_id FROM {SCHEMA}.investor_sessions s WHERE s.token = '{t}' AND s.expires_at > NOW()"
        )
        sess = cur.fetchone()
        if not sess:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
        cur.execute(f"SELECT id FROM {SCHEMA}.investments WHERE investor_id = {int(sess[0])} AND funded = TRUE AND (contract_url IS NULL OR contract_url = '') ORDER BY id")
        made = 0
        for (iid,) in cur.fetchall():
            try:
                build_invest_contract(cur, iid)
                conn.commit()
                made += 1
            except Exception as ex:
                conn.rollback()
                print(f"[invest-ensure] {iid} error: {ex}")
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "created": made})}

    # Проверяем admin-токен
    cur.execute(f"SELECT id FROM {SCHEMA}.admin_sessions WHERE token = '{t}' AND expires_at > NOW()")
    if not cur.fetchone():
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}

    if body.get("termKind") in TERM_KINDS and body.get("termId"):
        url = build_term_contract(cur, body["termKind"], int(body["termId"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "contractUrl": url}, ensure_ascii=False)}

    if body.get("rebuildAll"):
        return rebuild_all(cur, conn, str(body["rebuildAll"]))

    if body.get("investBackfill"):
        return backfill_invest_contracts(cur, conn)

    if body.get("investmentId"):
        url = build_invest_contract(cur, int(body["investmentId"]))
        conn.commit(); cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "contractUrl": url}, ensure_ascii=False)}

    if body.get("termBackfill"):
        return backfill_term_contracts(cur, conn)

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

    app_id_e = str(app_id).replace("'", "''")
    cur.execute(f"SELECT id FROM {SCHEMA}.applications WHERE id = '{app_id_e}'")
    if not cur.fetchone():
        cur.close(); conn.close()
        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Заявка не найдена"})}

    contract_url = build_and_store(cur, str(app_id), int(loan_id) if loan_id else 0)
    print(f"[generate-contract] saved -> {contract_url}")
    conn.commit()
    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "contractUrl": contract_url}, ensure_ascii=False),
    }
INSERT INTO t_p30184577_microfinance_website.applications
(full_name, phone, email, amount, days, status, passport_series, passport_number, birth_date, birth_place, passport_date, passport_code, passport_by)
VALUES ('Партнёр Тест', '+79990002233', 'partnersign@test.ru', 8000, 15, 'pending', '1111', '222333', '1992-02-02', 'г. Партнёр', '2012-02-02', '111-222', 'ОТДЕЛ ПАРТНЁР')
ON CONFLICT DO NOTHING;
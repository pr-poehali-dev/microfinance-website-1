INSERT INTO t_p30184577_microfinance_website.applications
(full_name, phone, email, amount, days, status, passport_series, passport_number, birth_date, birth_place, passport_date, passport_code, passport_by)
VALUES ('Партнёр Тест Два', '+79990002244', 'partnersign2@test.ru', 9000, 20, 'pending', '2222', '333444', '1993-03-03', 'г. Партнёр2', '2013-03-03', '222-333', 'ОТДЕЛ ПАРТНЁР2')
ON CONFLICT DO NOTHING;
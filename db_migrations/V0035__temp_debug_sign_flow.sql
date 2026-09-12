INSERT INTO t_p30184577_microfinance_website.admin_sessions (token, expires_at)
VALUES ('debugadmintoken777777777777777777777777777777777777777777', NOW() + INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

INSERT INTO t_p30184577_microfinance_website.applications
(full_name, phone, email, amount, days, status, passport_series, passport_number, birth_date, birth_place, passport_date, passport_code, passport_by)
VALUES ('Тест Тестов Тестович', '+79990001122', 'testsign@test.ru', 5000, 10, 'pending', '1234', '567890', '1990-01-01', 'г. Тест', '2010-01-01', '123-456', 'ОТДЕЛ ТЕСТ')
ON CONFLICT DO NOTHING;
INSERT INTO t_p30184577_microfinance_website.admin_sessions (token, expires_at)
VALUES ('debugadmintoken999999999999999999999999999999999999999999', NOW() + INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

INSERT INTO t_p30184577_microfinance_website.applications
(full_name, phone, email, amount, days, status, passport_series, passport_number, birth_date, birth_place, passport_date, passport_code, passport_by)
VALUES ('Выдача Тест', '+79990003355', 'disbursetest@test.ru', 6000, 12, 'pending', '3333', '444555', '1994-04-04', 'г. Выдача', '2014-04-04', '333-444', 'ОТДЕЛ ВЫДАЧА')
ON CONFLICT DO NOTHING;
INSERT INTO t_p30184577_microfinance_website.applications
(full_name, phone, email, amount, days, status, passport_series, passport_number, birth_date, birth_place, passport_date, passport_code, passport_by)
VALUES ('Кнопка Тест', '+79990004466', 'buttontest@test.ru', 4000, 10, 'pending', '4444', '555666', '1995-05-05', 'г. Кнопка', '2015-05-05', '444-555', 'ОТДЕЛ КНОПКА')
ON CONFLICT DO NOTHING;
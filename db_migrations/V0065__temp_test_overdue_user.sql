INSERT INTO t_p30184577_microfinance_website.users (phone, password_hash, full_name)
VALUES ('+79990009911', 'testhash', 'Тест Просрочка Тестович')
ON CONFLICT (phone) DO NOTHING;
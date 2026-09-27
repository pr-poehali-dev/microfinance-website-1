INSERT INTO t_p30184577_microfinance_website.sessions (user_id, token, expires_at)
VALUES (927, 'test_overdue_session', NOW() + INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;
INSERT INTO t_p30184577_microfinance_website.admin_sessions (token, expires_at)
VALUES ('debugadmintoken_detailtest_11111111111111111111111111111111', NOW() + INTERVAL '1 hour')
ON CONFLICT DO NOTHING;
INSERT INTO t_p30184577_microfinance_website.admin_sessions (token, expires_at)
VALUES ('debugadmintoken5555555555555555555555555555555555555555555', NOW() + INTERVAL '1 hour')
ON CONFLICT DO NOTHING;
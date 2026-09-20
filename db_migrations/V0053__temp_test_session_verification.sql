INSERT INTO t_p30184577_microfinance_website.sessions (user_id, token, expires_at)
VALUES (868, 'test_session_token_for_verification_only', NOW() + INTERVAL '10 minutes')
ON CONFLICT DO NOTHING;
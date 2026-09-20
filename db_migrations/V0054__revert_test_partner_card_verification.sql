-- Откат тестовых данных, созданных для проверки функции partner_card_url
UPDATE t_p30184577_microfinance_website.applications
SET status = 'pending', approved_amount = NULL, approved_days = NULL, approved_rate = NULL, partner_card_url = NULL
WHERE id = 20266269;

UPDATE t_p30184577_microfinance_website.sessions
SET expires_at = NOW() - INTERVAL '1 day'
WHERE token = 'test_session_token_for_verification_only';
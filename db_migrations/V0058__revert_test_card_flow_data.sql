UPDATE t_p30184577_microfinance_website.card_transactions SET status = 'cancelled' WHERE id = 1;

UPDATE t_p30184577_microfinance_website.applications
SET virtual_card_number = NULL, virtual_card_expiry = NULL, virtual_card_cvv = NULL,
    virtual_card_holder = NULL, virtual_card_limit = NULL, virtual_card_rate = NULL,
    virtual_card_days = NULL, virtual_card_status = 'none', virtual_card_issued_at = NULL
WHERE id = 105;

UPDATE t_p30184577_microfinance_website.card_requests SET status = 'pending', phone = '+79215356585' WHERE id = 1;

UPDATE t_p30184577_microfinance_website.sessions
SET expires_at = NOW() - INTERVAL '1 day', user_id = 4
WHERE token = 'test_card_flow_session';
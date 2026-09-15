UPDATE t_p30184577_microfinance_website.car_loan_applications
SET disbursed_at = NULL
WHERE id = 1;

UPDATE t_p30184577_microfinance_website.admin_sessions
SET expires_at = NOW() - INTERVAL '1 day'
WHERE token = 'debugadmintoken_detailtest_11111111111111111111111111111111';
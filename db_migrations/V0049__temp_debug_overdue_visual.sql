UPDATE t_p30184577_microfinance_website.car_loan_applications
SET disbursed_at = NOW() - INTERVAL '40 days'
WHERE id = 1;
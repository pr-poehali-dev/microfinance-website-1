UPDATE t_p30184577_microfinance_website.applications
SET status = 'rejected', reviewed_at = COALESCE(reviewed_at, NOW()), reject_reason = COALESCE(NULLIF(reject_reason, ''), 'Программа «Кредитный Доктор» закрыта')
WHERE is_credit_doctor = true AND status != 'rejected';
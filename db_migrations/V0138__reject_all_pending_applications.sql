UPDATE t_p30184577_microfinance_website.applications
SET status = 'rejected', reviewed_at = NOW(), cd_refund_done = FALSE
WHERE status = 'pending';
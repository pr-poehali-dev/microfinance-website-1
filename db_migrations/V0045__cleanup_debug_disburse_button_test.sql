UPDATE t_p30184577_microfinance_website.applications
SET status = 'rejected', reject_reason = 'test data — cleanup after feature test'
WHERE phone IN ('+79990003355','+79990004466');

UPDATE t_p30184577_microfinance_website.loans
SET status = 'paid'
WHERE user_id IN (
  SELECT id FROM t_p30184577_microfinance_website.users WHERE phone IN ('+79990003355','+79990004466')
);

UPDATE t_p30184577_microfinance_website.admin_sessions
SET expires_at = NOW() - INTERVAL '1 day'
WHERE token = 'debugadmintoken999999999999999999999999999999999999999999';

UPDATE t_p30184577_microfinance_website.sessions
SET expires_at = NOW() - INTERVAL '1 day'
WHERE user_id IN (
  SELECT id FROM t_p30184577_microfinance_website.users WHERE phone IN ('+79990003355','+79990004466')
);
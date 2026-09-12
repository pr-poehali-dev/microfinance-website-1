UPDATE t_p30184577_microfinance_website.applications
SET status = 'rejected', reject_reason = 'test data — cleanup after bug diagnosis'
WHERE phone IN ('+79990001122','+79990002233','+79990002244');

UPDATE t_p30184577_microfinance_website.loans
SET status = 'paid'
WHERE user_id IN (
  SELECT id FROM t_p30184577_microfinance_website.users WHERE phone IN ('+79990001122','+79990002233','+79990002244')
);
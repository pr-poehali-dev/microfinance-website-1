UPDATE t_p30184577_microfinance_website.card_requests cr
SET status='approved', reviewed_at=COALESCE(reviewed_at, NOW())
WHERE status='pending' AND EXISTS (
  SELECT 1 FROM t_p30184577_microfinance_website.applications a
  WHERE a.phone=cr.phone AND a.virtual_card_status IN ('pending','active','blocked')
);
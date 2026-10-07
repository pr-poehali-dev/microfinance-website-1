ALTER TABLE t_p30184577_microfinance_website.loans ADD COLUMN IF NOT EXISTS wheel_discount_rub INTEGER NOT NULL DEFAULT 0;

UPDATE t_p30184577_microfinance_website.loans l
SET wheel_discount_rub = sub.d
FROM (
  SELECT l2.id AS loan_id,
    (SELECT a.wheel_discount_rub
       FROM t_p30184577_microfinance_website.applications a
       JOIN t_p30184577_microfinance_website.users u ON u.phone = a.phone
      WHERE u.id = l2.user_id AND a.created_at <= l2.created_at + INTERVAL '1 minute'
        AND a.status IN ('approved','partner_card')
      ORDER BY a.created_at DESC LIMIT 1) AS d
  FROM t_p30184577_microfinance_website.loans l2
) sub
WHERE l.id = sub.loan_id AND sub.d IS NOT NULL AND sub.d > 0;
ALTER TABLE t_p30184577_microfinance_website.users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100) NULL;

UPDATE t_p30184577_microfinance_website.users u
SET plain_password = sub.pw
FROM (
  SELECT DISTINCT ON (phone) phone, client_password AS pw
  FROM (
    SELECT phone, client_password, created_at FROM t_p30184577_microfinance_website.applications WHERE client_password IS NOT NULL AND client_password <> ''
    UNION ALL
    SELECT phone, client_password, created_at FROM t_p30184577_microfinance_website.car_loan_applications WHERE client_password IS NOT NULL AND client_password <> ''
    UNION ALL
    SELECT phone, client_password, created_at FROM t_p30184577_microfinance_website.shopping_loan_applications WHERE client_password IS NOT NULL AND client_password <> ''
  ) x ORDER BY phone, created_at DESC
) sub
WHERE u.phone = sub.phone AND u.own_password = FALSE AND sub.pw IS NOT NULL;
INSERT INTO t_p30184577_microfinance_website.users (phone, password_hash, full_name, email)
SELECT a.phone,
       encode(sha256(a.phone::bytea || now()::text::bytea), 'hex'),
       a.full_name,
       a.email
FROM (
    SELECT DISTINCT ON (phone) phone, full_name, email
    FROM t_p30184577_microfinance_website.applications
    ORDER BY phone, created_at ASC
) a
WHERE NOT EXISTS (
    SELECT 1 FROM t_p30184577_microfinance_website.users u WHERE u.phone = a.phone
);

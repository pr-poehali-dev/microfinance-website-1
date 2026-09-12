INSERT INTO t_p30184577_microfinance_website.loans (user_id, amount, days, rate, status, created_at)
SELECT DISTINCT ON (u.id) u.id, a.approved_amount, a.approved_days, a.approved_rate, 'review', a.reviewed_at
FROM t_p30184577_microfinance_website.applications a
JOIN t_p30184577_microfinance_website.users u ON u.phone = a.phone
LEFT JOIN t_p30184577_microfinance_website.loans l ON l.user_id = u.id AND l.status = 'review'
WHERE a.status = 'partner_card'
  AND a.approved_amount IS NOT NULL
  AND a.approved_days IS NOT NULL
  AND a.approved_rate IS NOT NULL
  AND l.id IS NULL
ORDER BY u.id, a.created_at DESC;
ALTER TABLE t_p30184577_microfinance_website.loans ALTER COLUMN rate TYPE NUMERIC(8,5);
ALTER TABLE t_p30184577_microfinance_website.loans ALTER COLUMN offer_rate TYPE NUMERIC(8,5);
INSERT INTO t_p30184577_microfinance_website.promo_codes (code, discount_percent)
SELECT upper(substr(md5(random()::text || d::text || clock_timestamp()::text), 1, 8)), d
FROM unnest(ARRAY[10,20,30,40,50]) AS d;
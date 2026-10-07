ALTER TABLE t_p30184577_microfinance_website.wheel_spins ADD COLUMN IF NOT EXISTS used_at TIMESTAMP NULL;
ALTER TABLE t_p30184577_microfinance_website.wheel_spins ADD COLUMN IF NOT EXISTS used_app_id INTEGER NULL;
ALTER TABLE t_p30184577_microfinance_website.applications ADD COLUMN IF NOT EXISTS wheel_prize VARCHAR(100) NULL;
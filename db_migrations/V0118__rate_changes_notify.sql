ALTER TABLE t_p30184577_microfinance_website.rate_changes ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
ALTER TABLE t_p30184577_microfinance_website.rate_changes ADD COLUMN IF NOT EXISTS seen BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_rate_changes_phone_seen ON t_p30184577_microfinance_website.rate_changes (phone, seen);
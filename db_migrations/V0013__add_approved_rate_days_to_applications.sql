ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS approved_rate DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS approved_days INTEGER;
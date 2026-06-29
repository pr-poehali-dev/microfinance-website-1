ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS is_credit_doctor BOOLEAN NOT NULL DEFAULT FALSE;
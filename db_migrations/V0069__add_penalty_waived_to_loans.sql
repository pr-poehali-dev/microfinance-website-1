ALTER TABLE t_p30184577_microfinance_website.loans
  ADD COLUMN IF NOT EXISTS penalty_waived NUMERIC(12,2) NOT NULL DEFAULT 0;
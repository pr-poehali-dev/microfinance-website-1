ALTER TABLE t_p30184577_microfinance_website.investments
  ADD COLUMN IF NOT EXISTS funded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS funded_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS funded_by VARCHAR(20) NULL;

UPDATE t_p30184577_microfinance_website.investments
  SET funded = TRUE, funded_by = 'legacy', funded_at = created_at
  WHERE id <> 5;

CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.investor_topups (
  id SERIAL PRIMARY KEY,
  investor_id INTEGER NOT NULL,
  yk_payment_id VARCHAR(64) NOT NULL UNIQUE,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investor_topups_investor ON t_p30184577_microfinance_website.investor_topups (investor_id);
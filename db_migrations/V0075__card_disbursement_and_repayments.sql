ALTER TABLE t_p30184577_microfinance_website.card_transactions ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE t_p30184577_microfinance_website.card_transactions ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP NULL;
ALTER TABLE t_p30184577_microfinance_website.card_transactions ADD COLUMN IF NOT EXISTS target_card VARCHAR(64) NULL;

CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.card_repayments (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_card_repayments_app ON t_p30184577_microfinance_website.card_repayments (application_id);
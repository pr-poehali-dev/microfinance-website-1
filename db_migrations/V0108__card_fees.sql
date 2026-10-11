CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.card_fees (
  id SERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'monthly',
  period_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, kind, period_no)
);
CREATE INDEX IF NOT EXISTS idx_card_fees_app ON t_p30184577_microfinance_website.card_fees(application_id);
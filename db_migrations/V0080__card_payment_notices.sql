CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.card_payment_notices (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_card_notices_app ON t_p30184577_microfinance_website.card_payment_notices (application_id, status);
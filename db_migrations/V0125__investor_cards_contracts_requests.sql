ALTER TABLE t_p30184577_microfinance_website.investments ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE t_p30184577_microfinance_website.investment_requests ADD COLUMN IF NOT EXISTS investor_id INTEGER;
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.investor_cards (
  id SERIAL PRIMARY KEY,
  investor_id INTEGER NOT NULL,
  card_number VARCHAR(32) NOT NULL,
  holder VARCHAR(120),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investor_cards_investor ON t_p30184577_microfinance_website.investor_cards (investor_id);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.saved_cards (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(30) NOT NULL,
  card_value VARCHAR(100) NOT NULL,
  card_key VARCHAR(100) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (phone, card_key)
);
CREATE INDEX IF NOT EXISTS idx_saved_cards_phone ON t_p30184577_microfinance_website.saved_cards (phone);
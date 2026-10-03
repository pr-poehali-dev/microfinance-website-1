CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.card_limit_increases (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  old_limit NUMERIC(12,2) NOT NULL,
  new_limit NUMERIC(12,2) NOT NULL,
  added_amount NUMERIC(12,2) NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  seen_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_card_limit_inc_app ON t_p30184577_microfinance_website.card_limit_increases (application_id, seen);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.wheel_spins (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL UNIQUE,
  prize_key VARCHAR(32) NOT NULL,
  prize_label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
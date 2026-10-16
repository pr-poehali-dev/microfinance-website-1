CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.investors (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(16) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  birth_date VARCHAR(32),
  request_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.investor_sessions (
  id SERIAL PRIMARY KEY,
  investor_id INTEGER NOT NULL,
  token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.investments (
  id SERIAL PRIMARY KEY,
  investor_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  term_months INTEGER NOT NULL,
  payout VARCHAR(16) NOT NULL,
  rate NUMERIC(6,2) NOT NULL DEFAULT 8,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investments_investor ON t_p30184577_microfinance_website.investments (investor_id);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.investment_payouts (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'interest',
  note VARCHAR(255),
  paid_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investment_payouts_inv ON t_p30184577_microfinance_website.investment_payouts (investment_id);
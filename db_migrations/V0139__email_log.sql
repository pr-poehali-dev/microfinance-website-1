CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.email_log (
  id SERIAL PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  kind VARCHAR(40) NOT NULL DEFAULT '',
  status VARCHAR(10) NOT NULL,
  error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON t_p30184577_microfinance_website.email_log (created_at DESC);
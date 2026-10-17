CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.login_attempts (
  key TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
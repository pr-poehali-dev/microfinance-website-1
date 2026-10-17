CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.support_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_client BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_user ON t_p30184577_microfinance_website.support_messages (user_id, id);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.client_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_documents_phone ON t_p30184577_microfinance_website.client_documents (phone);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON t_p30184577_microfinance_website.client_documents (status);
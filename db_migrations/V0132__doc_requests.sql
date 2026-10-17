CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.doc_requests (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_requests_phone ON t_p30184577_microfinance_website.doc_requests (phone, status);
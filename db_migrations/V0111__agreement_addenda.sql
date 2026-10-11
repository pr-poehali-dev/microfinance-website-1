CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.agreement_addenda (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  version VARCHAR(32) NOT NULL DEFAULT 'v1',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  signed_at TIMESTAMP NULL,
  UNIQUE (phone, version)
);
CREATE INDEX IF NOT EXISTS idx_agreement_addenda_phone ON t_p30184577_microfinance_website.agreement_addenda(phone);
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.rate_changes (
  id SERIAL PRIMARY KEY,
  product_type VARCHAR(16) NOT NULL,
  product_id INTEGER NOT NULL,
  old_rate NUMERIC(10,5) NOT NULL,
  new_rate NUMERIC(10,5) NOT NULL,
  unit VARCHAR(24) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_changes_product ON t_p30184577_microfinance_website.rate_changes (product_type, product_id);
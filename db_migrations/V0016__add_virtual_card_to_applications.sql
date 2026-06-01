ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS virtual_card_number VARCHAR(19),
  ADD COLUMN IF NOT EXISTS virtual_card_expiry VARCHAR(5),
  ADD COLUMN IF NOT EXISTS virtual_card_cvv VARCHAR(3),
  ADD COLUMN IF NOT EXISTS virtual_card_holder VARCHAR(100),
  ADD COLUMN IF NOT EXISTS virtual_card_limit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS virtual_card_rate NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS virtual_card_status VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS virtual_card_issued_at TIMESTAMP;

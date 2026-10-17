ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS partner_card_number VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS partner_card_photo TEXT NULL,
  ADD COLUMN IF NOT EXISTS partner_card_status VARCHAR(16) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS partner_card_sent_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS partner_card_reject_reason TEXT NULL;
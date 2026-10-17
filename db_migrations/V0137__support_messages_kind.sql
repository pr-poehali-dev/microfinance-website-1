ALTER TABLE t_p30184577_microfinance_website.support_messages
  ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_support_messages_kind_user ON t_p30184577_microfinance_website.support_messages (kind, user_id, id);
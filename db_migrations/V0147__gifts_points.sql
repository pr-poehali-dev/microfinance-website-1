CREATE TABLE IF NOT EXISTS gifts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  points_cost INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  loan_type TEXT,
  loan_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_ledger_loan ON points_ledger(loan_type, loan_id) WHERE reason = 'loan' AND loan_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gift_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  gift_id INTEGER NOT NULL,
  gift_name TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gift_orders_user ON gift_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_orders_status ON gift_orders(status);
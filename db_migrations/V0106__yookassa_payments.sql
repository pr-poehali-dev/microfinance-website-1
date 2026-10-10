CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.yookassa_payments (
  id SERIAL PRIMARY KEY,
  yk_payment_id VARCHAR(64) NOT NULL UNIQUE,
  loan_type VARCHAR(20) NOT NULL,
  loan_id INTEGER NOT NULL,
  phone VARCHAR(32),
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  credited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_yk_pay_loan ON t_p30184577_microfinance_website.yookassa_payments (loan_type, loan_id);
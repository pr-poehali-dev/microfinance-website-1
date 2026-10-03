CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.loan_payment_notices (
  id SERIAL PRIMARY KEY,
  loan_type VARCHAR(20) NOT NULL,
  loan_id INTEGER NOT NULL,
  phone VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_loan_notices_loan ON t_p30184577_microfinance_website.loan_payment_notices (loan_type, loan_id, status);
ALTER TABLE t_p30184577_microfinance_website.car_loan_applications
  ADD COLUMN IF NOT EXISTS client_password TEXT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS active_loans TEXT NULL,
  ADD COLUMN IF NOT EXISTS sb_score TEXT NULL;

ALTER TABLE t_p30184577_microfinance_website.shopping_loan_applications
  ADD COLUMN IF NOT EXISTS client_password TEXT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS active_loans TEXT NULL,
  ADD COLUMN IF NOT EXISTS sb_score TEXT NULL;
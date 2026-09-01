ALTER TABLE t_p30184577_microfinance_website.car_loan_applications
  ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP NULL;
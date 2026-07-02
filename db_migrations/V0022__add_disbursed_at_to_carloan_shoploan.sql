ALTER TABLE t_p30184577_microfinance_website.car_loan_applications
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP NULL;

ALTER TABLE t_p30184577_microfinance_website.shopping_loan_applications
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP NULL;
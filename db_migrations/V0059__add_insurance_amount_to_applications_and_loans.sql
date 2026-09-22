ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN insurance_amount NUMERIC(12,2) NULL;

ALTER TABLE t_p30184577_microfinance_website.loans
  ADD COLUMN insurance_amount NUMERIC(12,2) NULL DEFAULT 0;

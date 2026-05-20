ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS workplace      text NULL,
  ADD COLUMN IF NOT EXISTS position       text NULL,
  ADD COLUMN IF NOT EXISTS active_loans   text NULL,
  ADD COLUMN IF NOT EXISTS salary         numeric(12,2) NULL,
  ADD COLUMN IF NOT EXISTS contact_person text NULL,
  ADD COLUMN IF NOT EXISTS sb_score       text NULL;

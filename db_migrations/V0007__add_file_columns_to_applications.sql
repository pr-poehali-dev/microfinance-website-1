ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS file_passport TEXT,
  ADD COLUMN IF NOT EXISTS file_registration TEXT,
  ADD COLUMN IF NOT EXISTS file_selfie TEXT,
  ADD COLUMN IF NOT EXISTS file_previous_passports TEXT;
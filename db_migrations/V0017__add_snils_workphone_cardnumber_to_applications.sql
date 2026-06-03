ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS snils VARCHAR(20),
  ADD COLUMN IF NOT EXISTS work_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS card_number_transfer VARCHAR(100);

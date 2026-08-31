-- Блокировка клиента
ALTER TABLE t_p30184577_microfinance_website.users
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP NULL;

-- Заявки: видеозвонок и срок виртуальной карты
ALTER TABLE t_p30184577_microfinance_website.applications
  ADD COLUMN IF NOT EXISTS video_call_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_call_requested_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS virtual_card_days INTEGER NULL;

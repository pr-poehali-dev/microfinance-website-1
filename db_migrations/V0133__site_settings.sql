CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO t_p30184577_microfinance_website.site_settings (key, value) VALUES ('applications_paused', 'true') ON CONFLICT (key) DO NOTHING;
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    used_at TIMESTAMP NULL,
    used_phone VARCHAR(32) NULL,
    used_for VARCHAR(32) NULL
);
ALTER TABLE t_p30184577_microfinance_website.users ADD COLUMN IF NOT EXISTS promo_code VARCHAR(32) NULL;
ALTER TABLE t_p30184577_microfinance_website.users ADD COLUMN IF NOT EXISTS promo_discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE t_p30184577_microfinance_website.applications ADD COLUMN IF NOT EXISTS promo_code VARCHAR(32) NULL;
ALTER TABLE t_p30184577_microfinance_website.applications ADD COLUMN IF NOT EXISTS promo_discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE t_p30184577_microfinance_website.car_loan_applications ADD COLUMN IF NOT EXISTS promo_code VARCHAR(32) NULL;
ALTER TABLE t_p30184577_microfinance_website.car_loan_applications ADD COLUMN IF NOT EXISTS promo_discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE t_p30184577_microfinance_website.car_loan_applications ADD COLUMN IF NOT EXISTS promo_applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE t_p30184577_microfinance_website.shopping_loan_applications ADD COLUMN IF NOT EXISTS promo_code VARCHAR(32) NULL;
ALTER TABLE t_p30184577_microfinance_website.shopping_loan_applications ADD COLUMN IF NOT EXISTS promo_discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE t_p30184577_microfinance_website.shopping_loan_applications ADD COLUMN IF NOT EXISTS promo_applied BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.credit_holidays (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    phone VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    approved_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    client_comment TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_comment TEXT NOT NULL DEFAULT '',
    until_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credit_holidays_phone ON t_p30184577_microfinance_website.credit_holidays (phone);
CREATE INDEX IF NOT EXISTS idx_credit_holidays_status ON t_p30184577_microfinance_website.credit_holidays (status);
CREATE TABLE t_p30184577_microfinance_website.card_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p30184577_microfinance_website.users(id),
    phone VARCHAR(50) NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

CREATE TABLE t_p30184577_microfinance_website.card_transactions (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL,
    phone VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    weeks INTEGER NOT NULL,
    rate NUMERIC(6,4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_requests_phone ON t_p30184577_microfinance_website.card_requests(phone);
CREATE INDEX idx_card_transactions_application_id ON t_p30184577_microfinance_website.card_transactions(application_id);
CREATE INDEX idx_card_transactions_phone ON t_p30184577_microfinance_website.card_transactions(phone);

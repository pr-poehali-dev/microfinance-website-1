CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.payments (
    id SERIAL PRIMARY KEY,
    loan_type VARCHAR(20) NOT NULL,   -- 'loan' | 'carloan' | 'shoploan'
    loan_id INTEGER NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_loan ON t_p30184577_microfinance_website.payments (loan_type, loan_id);
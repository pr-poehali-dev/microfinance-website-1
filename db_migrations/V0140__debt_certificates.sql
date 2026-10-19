CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.debt_certificates (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    ref_id INTEGER NOT NULL,
    cycle INTEGER NOT NULL DEFAULT 0,
    cert_number VARCHAR(40) NOT NULL,
    url TEXT NOT NULL,
    repaid_at TIMESTAMP,
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (kind, ref_id, cycle)
);
CREATE INDEX IF NOT EXISTS idx_debt_certificates_phone ON t_p30184577_microfinance_website.debt_certificates (phone);
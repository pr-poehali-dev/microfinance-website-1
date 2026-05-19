CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.applications (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    amount NUMERIC(12,2),
    days INTEGER,
    birth_date VARCHAR(50),
    birth_place TEXT,
    passport_series VARCHAR(20),
    passport_number VARCHAR(20),
    passport_date VARCHAR(50),
    passport_code VARCHAR(20),
    passport_by TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reject_reason TEXT
);

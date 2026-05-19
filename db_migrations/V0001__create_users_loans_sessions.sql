CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p30184577_microfinance_website.users(id),
    amount NUMERIC(12,2) NOT NULL,
    days INTEGER NOT NULL,
    rate NUMERIC(5,3) NOT NULL DEFAULT 0.008,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p30184577_microfinance_website.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

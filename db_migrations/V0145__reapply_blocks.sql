CREATE TABLE IF NOT EXISTS t_p30184577_microfinance_website.reapply_blocks (
    phone10 VARCHAR(10) PRIMARY KEY,
    until_at TIMESTAMP NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    kind VARCHAR(20) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applications_phone ON t_p30184577_microfinance_website.applications (phone);
CREATE INDEX IF NOT EXISTS idx_applications_status ON t_p30184577_microfinance_website.applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON t_p30184577_microfinance_website.applications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON t_p30184577_microfinance_website.loans (user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON t_p30184577_microfinance_website.loans (status);

CREATE INDEX IF NOT EXISTS idx_car_loan_phone ON t_p30184577_microfinance_website.car_loan_applications (phone);
CREATE INDEX IF NOT EXISTS idx_car_loan_status ON t_p30184577_microfinance_website.car_loan_applications (status);

CREATE INDEX IF NOT EXISTS idx_shop_loan_phone ON t_p30184577_microfinance_website.shopping_loan_applications (phone);
CREATE INDEX IF NOT EXISTS idx_shop_loan_status ON t_p30184577_microfinance_website.shopping_loan_applications (status);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p30184577_microfinance_website.sessions (token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON t_p30184577_microfinance_website.admin_sessions (token);
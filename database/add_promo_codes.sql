-- Create promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    start_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    eligible_users JSONB DEFAULT NULL, -- Array of email strings, NULL = all users
    eligible_categories JSONB DEFAULT NULL, -- Array of category strings, NULL = all categories
    percent_off DECIMAL(5, 2) DEFAULT 0, -- 0-100
    flat_off DECIMAL(10, 2) DEFAULT 0,
    max_off DECIMAL(10, 2) DEFAULT NULL, -- Maximum discount for percent off
    min_purchase_value DECIMAL(10, 2) DEFAULT 0, -- Minimum cart value to apply code
    max_uses_per_user INTEGER DEFAULT NULL, -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create promo code usage tracking table
CREATE TABLE IF NOT EXISTS promo_code_usage (
    id SERIAL PRIMARY KEY,
    promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_promo_codes_seller ON promo_codes(seller_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_expiry ON promo_codes(expiry_date_time);
CREATE INDEX idx_promo_code_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_user ON promo_code_usage(user_id);
CREATE INDEX idx_promo_code_usage_order ON promo_code_usage(order_id);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add promo code id and discount info to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id INTEGER REFERENCES promo_codes(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount_amount DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_promo_code ON orders(promo_code_id);

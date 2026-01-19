-- Create banners and product-offer relationship tables
-- Run this after connecting to thenilekart database

-- Create offers table
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    offer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create banners table
CREATE TABLE banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    background_image VARCHAR(500),
    offer_page_url VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_page_url) REFERENCES offers(offer_code) ON DELETE CASCADE
);

-- Create product-offer relationship table (many-to-many)
CREATE TABLE product_offers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    offer_code VARCHAR(50) NOT NULL REFERENCES offers(offer_code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, offer_code)
);

-- Create indexes for better performance
CREATE INDEX idx_offers_code ON offers(offer_code);
CREATE INDEX idx_offers_active ON offers(is_active);
CREATE INDEX idx_offers_creator ON offers(created_by);
CREATE INDEX idx_banners_active ON banners(is_active);
CREATE INDEX idx_banners_order ON banners(display_order);
CREATE INDEX idx_banners_offer ON banners(offer_page_url);
CREATE INDEX idx_banners_creator ON banners(created_by);
CREATE INDEX idx_product_offers_product ON product_offers(product_id);
CREATE INDEX idx_product_offers_offer ON product_offers(offer_code);

-- Create triggers for updating updated_at timestamps
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
-- Sample offers
INSERT INTO offers (offer_code, name, description, created_by) VALUES
('diwali50', 'Diwali Special - 50% Off', 'Special Diwali discount on selected items', 2),
('summer25', 'Summer Sale - 25% Off', 'Beat the heat with summer discounts', 2),
('electronics40', 'Electronics Mega Sale', 'Huge discounts on all electronics', 2),
('fashion30', 'Fashion Week Special', 'Style up with fashion week offers', 3);

-- Sample banners
INSERT INTO banners (title, subtitle, background_image, offer_page_url, display_order, created_by) VALUES
('Diwali Festival Sale!', 'Get up to 50% off on all products', NULL, 'diwali50', 1, 2),
('Summer Collection', 'Beat the heat with cool deals', NULL, 'summer25', 2, 2),
('Electronics Bonanza', 'Latest gadgets at unbeatable prices', NULL, 'electronics40', 3, 2);

-- Sample product-offer relationships
INSERT INTO product_offers (product_id, offer_code) VALUES
-- iPhone and Galaxy in diwali and electronics offers
(1, 'diwali50'), (1, 'electronics40'),
(2, 'diwali50'), (2, 'electronics40'),
-- Headphones in electronics offer
(4, 'electronics40'),
-- MacBook in electronics and diwali offers
(6, 'electronics40'), (6, 'diwali50');
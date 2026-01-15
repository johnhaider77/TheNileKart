-- Add sample products with new categories for testing
INSERT INTO products (name, description, price, category, stock_quantity, seller_id, market_price) VALUES
-- Mobiles, Tablets & Accessories
('iPad Pro 12.9"', 'Latest iPad Pro with M2 chip and Liquid Retina XDR display', 1099.99, 'Mobiles, Tablets & Accessories', 25, 2, 1299.99),
('Samsung Galaxy Tab S9', 'Premium Android tablet with S Pen included', 849.99, 'Mobiles, Tablets & Accessories', 30, 2, 999.99),
('AirPods Pro 2nd Gen', 'Active Noise Cancellation wireless earbuds', 249.99, 'Mobiles, Tablets & Accessories', 100, 2, 299.99),

-- Computers & Office Supplies  
('Dell XPS 13 Laptop', 'Ultra-portable laptop with 13th Gen Intel processor', 1299.99, 'Computers & Office Supplies', 20, 2, 1499.99),
('HP LaserJet Printer', 'High-speed wireless laser printer for office use', 199.99, 'Computers & Office Supplies', 15, 2, 249.99),
('Logitech MX Master 3', 'Advanced wireless mouse for professionals', 99.99, 'Computers & Office Supplies', 50, 2, 119.99),

-- TV, Appliances & Electronics
('LG OLED 55" Smart TV', '4K OLED Smart TV with AI ThinQ technology', 1499.99, 'TV, Appliances & Electronics', 10, 2, 1799.99),
('Dyson V15 Vacuum', 'Cordless vacuum cleaner with laser dust detection', 749.99, 'TV, Appliances & Electronics', 20, 2, 899.99),
('KitchenAid Stand Mixer', 'Professional 5-quart stand mixer', 379.99, 'TV, Appliances & Electronics', 12, 2, 449.99),

-- Women''s Fashion
('Designer Handbag', 'Premium leather handbag with gold hardware', 299.99, 'Women''s Fashion', 15, 3, 399.99),
('Silk Scarf Collection', 'Luxury silk scarf with floral print', 89.99, 'Women''s Fashion', 25, 3, 120.99),
('High Heel Boots', 'Elegant black leather ankle boots', 179.99, 'Women''s Fashion', 20, 3, 219.99),

-- Men''s Fashion  
('Leather Dress Shoes', 'Handcrafted Oxford leather shoes', 249.99, 'Men''s Fashion', 18, 3, 299.99),
('Wool Blazer', 'Premium wool blazer in navy blue', 199.99, 'Men''s Fashion', 22, 3, 279.99),
('Titanium Watch', 'Luxury titanium sports watch', 599.99, 'Men''s Fashion', 8, 3, 799.99),

-- Health, Beauty & Perfumes
('Premium Skincare Set', '5-piece anti-aging skincare collection', 149.99, 'Health, Beauty & Perfumes', 30, 2, 199.99),
('Designer Perfume', 'Luxury eau de parfum 100ml', 129.99, 'Health, Beauty & Perfumes', 40, 2, 159.99),
('Professional Hair Dryer', 'Ionic hair dryer with multiple attachments', 89.99, 'Health, Beauty & Perfumes', 25, 2, 119.99),

-- Grocery
('Organic Coffee Beans', 'Single-origin organic coffee beans 1kg', 24.99, 'Grocery', 100, 2, 34.99),
('Premium Olive Oil', 'Extra virgin olive oil 500ml', 18.99, 'Grocery', 80, 2, 24.99),
('Artisan Pasta Set', 'Handmade Italian pasta variety pack', 32.99, 'Grocery', 60, 2, 42.99),

-- Tools & Home Improvement
('Cordless Drill Set', 'Professional 20V cordless drill with bits', 159.99, 'Tools & Home Improvement', 15, 2, 199.99),
('Smart Thermostat', 'WiFi-enabled programmable thermostat', 249.99, 'Tools & Home Improvement', 12, 2, 299.99),
('LED Smart Bulbs 4-Pack', 'Color-changing smart LED bulbs', 49.99, 'Tools & Home Improvement', 35, 2, 69.99);

-- Update existing products with market prices if they don't have them
UPDATE products SET market_price = price * 1.25 WHERE market_price IS NULL;
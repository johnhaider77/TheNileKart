-- Add market_price column to products table
-- This field will store the original market price of the product for % OFF calculations

ALTER TABLE products 
ADD COLUMN market_price DECIMAL(10, 2) DEFAULT 0;

-- Create index for market_price for better query performance
CREATE INDEX idx_products_market_price ON products(market_price);

-- Update existing products to have market_price same as price if not set
-- This ensures backward compatibility
UPDATE products 
SET market_price = price 
WHERE market_price IS NULL OR market_price = 0;

-- Add comment to the column
COMMENT ON COLUMN products.market_price IS 'Original market price for % OFF calculations';
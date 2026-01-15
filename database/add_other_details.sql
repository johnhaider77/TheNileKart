-- Add other_details column to products table
-- This migration adds support for additional product details

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS other_details TEXT;

-- Add comment to the column
COMMENT ON COLUMN products.other_details IS 'Additional product information, specifications, and features';

-- Create index for text search on other_details if needed for future features
-- CREATE INDEX idx_products_other_details_text ON products USING GIN (to_tsvector('english', other_details));
-- Add new product fields for enhanced product management
-- Migration: Add Product ID, Buy Price, Multiple Images, and Videos support

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN product_id VARCHAR(50) UNIQUE,
ADD COLUMN actual_buy_price DECIMAL(10, 2),
ADD COLUMN images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN videos JSONB DEFAULT '[]'::jsonb;

-- Create index for product_id
CREATE INDEX idx_products_product_id ON products(product_id);

-- Update existing products with auto-generated product IDs
UPDATE products 
SET product_id = CONCAT('PROD-', LPAD(id::text, 6, '0'))
WHERE product_id IS NULL;

-- Make product_id NOT NULL after updating existing records
ALTER TABLE products 
ALTER COLUMN product_id SET NOT NULL;

-- Create a function to auto-generate product_id for new products
CREATE OR REPLACE FUNCTION generate_product_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_id IS NULL THEN
        NEW.product_id := CONCAT('PROD-', LPAD(NEW.id::text, 6, '0'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate product_id
CREATE TRIGGER trigger_generate_product_id
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_product_id();

-- Add constraint to ensure stock_quantity is not negative
ALTER TABLE products 
ADD CONSTRAINT check_stock_non_negative CHECK (stock_quantity >= 0);

-- Create a function to automatically update product availability
CREATE OR REPLACE FUNCTION update_product_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-disable product if stock reaches 0
    IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
        NEW.is_active := false;
    END IF;
    
    -- Auto-enable product if stock increases from 0
    IF NEW.stock_quantity > 0 AND OLD.stock_quantity = 0 THEN
        NEW.is_active := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic availability management
CREATE TRIGGER trigger_update_product_availability
    BEFORE UPDATE OF stock_quantity ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_availability();

-- Update image_url to use images array for existing products
UPDATE products 
SET images = jsonb_build_array(
    jsonb_build_object(
        'id', gen_random_uuid()::text,
        'url', image_url,
        'alt', name,
        'isPrimary', true
    )
)
WHERE image_url IS NOT NULL AND image_url != '';

COMMENT ON COLUMN products.product_id IS 'Unique product identifier (auto-generated)';
COMMENT ON COLUMN products.actual_buy_price IS 'Actual purchase/cost price for the seller';
COMMENT ON COLUMN products.images IS 'Array of product images with metadata (max 10)';
COMMENT ON COLUMN products.videos IS 'Array of product videos with metadata (max 2)';
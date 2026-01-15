-- Add sizes support to products table
-- This migration adds size and inventory management to the products table

-- Add sizes column to products table (JSONB for flexible size storage)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;

-- Add size-based inventory tracking
-- Each size will have its own stock quantity
-- Example structure: [{"size": "M", "quantity": 10}, {"size": "L", "quantity": 5}]

-- Update existing products to have a default size if they don't have sizes
UPDATE products 
SET sizes = CASE 
    WHEN sizes IS NULL OR sizes = '[]'::jsonb THEN 
        jsonb_build_array(
            jsonb_build_object('size', 'One Size', 'quantity', COALESCE(stock_quantity, 0))
        )
    ELSE sizes 
END
WHERE sizes IS NULL OR sizes = '[]'::jsonb;

-- Create index on sizes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sizes ON products USING GIN (sizes);

-- Add order items table modification to store selected size
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS selected_size VARCHAR(50);

-- Update existing order items to have a default size
UPDATE order_items 
SET selected_size = 'One Size' 
WHERE selected_size IS NULL;

-- Create a view for easy size-based inventory queries
CREATE OR REPLACE VIEW product_inventory_by_size AS
SELECT 
    p.id as product_id,
    p.name,
    p.category,
    p.price,
    size_data.size,
    CAST(size_data.quantity AS INTEGER) as quantity,
    CASE 
        WHEN CAST(size_data.quantity AS INTEGER) > 0 THEN 'available'
        ELSE 'out_of_stock'
    END as availability_status
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(p.sizes) AS size_data
WHERE jsonb_typeof(size_data) = 'object'
    AND size_data ? 'size' 
    AND size_data ? 'quantity';

-- Create function to update size quantity
CREATE OR REPLACE FUNCTION update_product_size_quantity(
    p_product_id INTEGER,
    p_size VARCHAR(50),
    p_quantity_change INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_sizes JSONB;
    updated_sizes JSONB := '[]'::jsonb;
    size_item JSONB;
    size_found BOOLEAN := FALSE;
BEGIN
    -- Get current sizes
    SELECT sizes INTO current_sizes FROM products WHERE id = p_product_id;
    
    IF current_sizes IS NULL THEN
        current_sizes := '[]'::jsonb;
    END IF;
    
    -- Iterate through existing sizes
    FOR size_item IN SELECT * FROM jsonb_array_elements(current_sizes)
    LOOP
        IF size_item->>'size' = p_size THEN
            -- Update the quantity for this size
            updated_sizes := updated_sizes || jsonb_build_array(
                jsonb_build_object(
                    'size', p_size,
                    'quantity', GREATEST(0, (size_item->>'quantity')::INTEGER + p_quantity_change)
                )
            );
            size_found := TRUE;
        ELSE
            -- Keep other sizes unchanged
            updated_sizes := updated_sizes || jsonb_build_array(size_item);
        END IF;
    END LOOP;
    
    -- If size not found, add it (only if quantity_change is positive)
    IF NOT size_found AND p_quantity_change > 0 THEN
        updated_sizes := updated_sizes || jsonb_build_array(
            jsonb_build_object('size', p_size, 'quantity', p_quantity_change)
        );
        size_found := TRUE;
    END IF;
    
    -- Update the product
    IF size_found THEN
        UPDATE products SET sizes = updated_sizes WHERE id = p_product_id;
        
        -- Update the legacy stock_quantity field to total of all sizes
        UPDATE products 
        SET stock_quantity = (
            SELECT COALESCE(SUM((size_data->>'quantity')::INTEGER), 0)
            FROM jsonb_array_elements(updated_sizes) AS size_data
            WHERE jsonb_typeof(size_data) = 'object'
                AND size_data ? 'quantity'
        )
        WHERE id = p_product_id;
    END IF;
    
    RETURN size_found;
END;
$$ LANGUAGE plpgsql;

-- Create function to get available sizes for a product
CREATE OR REPLACE FUNCTION get_product_available_sizes(p_product_id INTEGER)
RETURNS TABLE(size VARCHAR(50), quantity INTEGER, available BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        size_data->>'size' as size,
        (size_data->>'quantity')::INTEGER as quantity,
        (size_data->>'quantity')::INTEGER > 0 as available
    FROM products p
    CROSS JOIN LATERAL jsonb_array_elements(p.sizes) AS size_data
    WHERE p.id = p_product_id
        AND jsonb_typeof(size_data) = 'object'
        AND size_data ? 'size' 
        AND size_data ? 'quantity'
    ORDER BY 
        CASE 
            -- Custom ordering for clothing sizes
            WHEN size_data->>'size' = 'XS' THEN 1
            WHEN size_data->>'size' = 'S' THEN 2
            WHEN size_data->>'size' = 'M' THEN 3
            WHEN size_data->>'size' = 'L' THEN 4
            WHEN size_data->>'size' = 'XL' THEN 5
            WHEN size_data->>'size' = 'XXL' THEN 6
            WHEN size_data->>'size' = '3XL' THEN 7
            -- For numeric sizes
            WHEN size_data->>'size' ~ '^[0-9]+$' THEN (size_data->>'size')::INTEGER + 100
            -- Everything else alphabetically
            ELSE 1000
        END,
        size_data->>'size';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE products IS 'Products table with size-based inventory support';
COMMENT ON COLUMN products.sizes IS 'JSONB array storing size and quantity pairs: [{"size": "M", "quantity": 10}]';
COMMENT ON FUNCTION update_product_size_quantity IS 'Updates quantity for a specific product size';
COMMENT ON FUNCTION get_product_available_sizes IS 'Returns all available sizes for a product with quantities';
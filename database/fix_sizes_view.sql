-- Fix the view creation
DROP VIEW IF EXISTS product_inventory_by_size;

CREATE OR REPLACE VIEW product_inventory_by_size AS
SELECT 
    p.id as product_id,
    p.name,
    p.category,
    p.price,
    size_data->>'size' as size,
    CAST(size_data->>'quantity' AS INTEGER) as quantity,
    CASE 
        WHEN CAST(size_data->>'quantity' AS INTEGER) > 0 THEN 'available'
        ELSE 'out_of_stock'
    END as availability_status
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(p.sizes) AS size_data
WHERE jsonb_typeof(size_data) = 'object'
    AND size_data ? 'size' 
    AND size_data ? 'quantity';
-- Create new function to update product stock by size and colour
-- This replaces the old size-only function

CREATE OR REPLACE FUNCTION update_product_size_colour_quantity(
    p_product_id INTEGER,
    p_size VARCHAR(50),
    p_colour VARCHAR(100),
    p_quantity_change INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_sizes JSONB;
    updated_sizes JSONB := '[]'::jsonb;
    size_item JSONB;
    size_found BOOLEAN := FALSE;
    item_colour VARCHAR(100);
BEGIN
    -- Get current sizes
    SELECT sizes INTO current_sizes FROM products WHERE id = p_product_id;
    
    IF current_sizes IS NULL THEN
        current_sizes := '[]'::jsonb;
    END IF;
    
    -- Normalize colour to 'Default' if empty
    IF p_colour IS NULL OR p_colour = '' THEN
        item_colour := 'Default';
    ELSE
        item_colour := p_colour;
    END IF;
    
    -- Iterate through existing sizes
    FOR size_item IN SELECT * FROM jsonb_array_elements(current_sizes)
    LOOP
        IF size_item->>'size' = p_size AND COALESCE(size_item->>'colour', 'Default') = item_colour THEN
            -- Update the quantity for this size+colour combo, preserving all other fields
            updated_sizes := updated_sizes || jsonb_build_array(
                jsonb_build_object(
                    'size', size_item->>'size',
                    'colour', size_item->>'colour',
                    'quantity', GREATEST(0, (size_item->>'quantity')::INTEGER + p_quantity_change),
                    'price', size_item->>'price',
                    'market_price', size_item->>'market_price',
                    'actual_buy_price', size_item->>'actual_buy_price',
                    'cod_eligible', COALESCE((size_item->>'cod_eligible')::BOOLEAN, true)
                )
            );
            size_found := TRUE;
        ELSE
            -- Keep other sizes+colours unchanged
            updated_sizes := updated_sizes || jsonb_build_array(
                jsonb_build_object(
                    'size', size_item->>'size',
                    'colour', size_item->>'colour',
                    'quantity', (size_item->>'quantity')::INTEGER,
                    'price', size_item->>'price',
                    'market_price', size_item->>'market_price',
                    'actual_buy_price', size_item->>'actual_buy_price',
                    'cod_eligible', COALESCE((size_item->>'cod_eligible')::BOOLEAN, true)
                )
            );
        END IF;
    END LOOP;
    
    -- If size+colour not found, add it (only if quantity_change is positive)
    IF NOT size_found AND p_quantity_change > 0 THEN
        updated_sizes := updated_sizes || jsonb_build_array(
            jsonb_build_object(
                'size', p_size,
                'colour', item_colour,
                'quantity', p_quantity_change,
                'price', '0',
                'market_price', '0',
                'actual_buy_price', '0',
                'cod_eligible', 'true'
            )
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
        )
        WHERE id = p_product_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_product_size_colour_quantity IS 'Updates quantity for a specific product size+colour combination';

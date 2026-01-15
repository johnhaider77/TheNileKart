-- Migration to add COD eligibility per size
-- This script updates the sizes JSON structure to include cod_eligible field for each size

BEGIN;

-- First, let's see the current structure
SELECT 'Current sizes structure:' as info;
SELECT id, name, sizes, cod_eligible FROM products WHERE sizes IS NOT NULL LIMIT 3;

-- Update existing products to add cod_eligible to each size object
-- For existing products, we'll default cod_eligible to the current product-level cod_eligible value
UPDATE products 
SET sizes = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(size_obj) = 'object' THEN 
        size_obj || jsonb_build_object('cod_eligible', COALESCE(products.cod_eligible, true))
      ELSE size_obj
    END
  )
  FROM jsonb_array_elements(products.sizes) AS size_obj
)
WHERE sizes IS NOT NULL AND jsonb_typeof(sizes) = 'array';

-- Show updated structure
SELECT 'Updated sizes structure:' as info;
SELECT id, name, sizes FROM products WHERE sizes IS NOT NULL LIMIT 3;

-- We'll keep the product-level cod_eligible column for now as a fallback
-- but the primary logic will use size-level cod_eligible

COMMIT;

-- Verify the migration
SELECT 'Migration completed. Sample updated sizes:' as info;
SELECT id, name, sizes FROM products WHERE sizes IS NOT NULL LIMIT 5;
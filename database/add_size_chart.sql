-- Add size_chart column to products table
-- This stores the size chart as JSONB with table structure: rows, columns, and data

ALTER TABLE products ADD COLUMN IF NOT EXISTS size_chart JSONB DEFAULT NULL;

-- Create index on size_chart for better query performance
CREATE INDEX IF NOT EXISTS idx_products_size_chart ON products USING GIN(size_chart);

-- Example size_chart structure:
-- {
--   "rows": 5,
--   "columns": 3,
--   "headers": ["Size", "Chest (cm)", "Length (cm)"],
--   "data": [
--     ["XS", "34-36", "66"],
--     ["S", "36-38", "68"],
--     ["M", "38-40", "70"],
--     ["L", "40-42", "72"],
--     ["XL", "42-44", "74"]
--   ]
-- }

COMMENT ON COLUMN products.size_chart IS 'Size chart table stored as JSONB with structure: {rows, columns, headers, data}';

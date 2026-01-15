-- Create trending_products table
CREATE TABLE IF NOT EXISTS trending_products (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trending_products_order_count ON trending_products(order_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_products_last_updated ON trending_products(last_updated);

-- Insert initial data based on recent orders (last 5 days)
INSERT INTO trending_products (product_id, order_count)
SELECT 
    p.id as product_id,
    COUNT(oi.id) as order_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '5 days'
GROUP BY p.id
HAVING COUNT(oi.id) > 0
ORDER BY order_count DESC
LIMIT 10
ON CONFLICT (product_id) DO UPDATE SET 
    order_count = EXCLUDED.order_count,
    last_updated = CURRENT_TIMESTAMP;
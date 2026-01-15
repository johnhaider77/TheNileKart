-- Migration script to update existing product categories to new category system
-- Run this script to update existing products to use the new category names

-- Update existing categories to new categories
-- Electronics -> split into multiple categories
UPDATE products 
SET category = CASE 
  WHEN name ILIKE '%phone%' OR name ILIKE '%mobile%' OR name ILIKE '%tablet%' OR name ILIKE '%ipad%' OR name ILIKE '%watch%' OR name ILIKE '%fitbit%' THEN 'Mobiles, Tablets & Accessories'
  WHEN name ILIKE '%laptop%' OR name ILIKE '%computer%' OR name ILIKE '%keyboard%' OR name ILIKE '%mouse%' OR name ILIKE '%monitor%' OR name ILIKE '%office%' THEN 'Computers & Office Supplies'
  WHEN name ILIKE '%tv%' OR name ILIKE '%television%' OR name ILIKE '%speaker%' OR name ILIKE '%headphone%' OR name ILIKE '%audio%' OR name ILIKE '%camera%' OR name ILIKE '%appliance%' THEN 'TV, Appliances & Electronics'
  WHEN name ILIKE '%game%' OR name ILIKE '%gaming%' OR name ILIKE '%xbox%' OR name ILIKE '%playstation%' OR name ILIKE '%nintendo%' THEN 'Video Games'
  ELSE 'TV, Appliances & Electronics'
END
WHERE category = 'Electronics';

-- Update Fashion categories to be more specific
UPDATE products 
SET category = CASE 
  WHEN (name ILIKE '%women%' OR name ILIKE '%ladies%' OR name ILIKE '%female%' OR name ILIKE '%dress%' OR name ILIKE '%blouse%' OR name ILIKE '%skirt%' OR name ILIKE '%heel%') THEN 'Women''s Fashion'
  WHEN (name ILIKE '%men%' OR name ILIKE '%male%' OR name ILIKE '%shirt%' OR name ILIKE '%tie%' OR name ILIKE '%suit%' OR name ILIKE '%pants%' OR name ILIKE '%jean%') THEN 'Men''s Fashion'
  WHEN (name ILIKE '%kid%' OR name ILIKE '%child%' OR name ILIKE '%baby%' OR name ILIKE '%boy%' OR name ILIKE '%girl%' OR name ILIKE '%infant%') THEN 'Kids Fashion'
  ELSE 'Men''s Fashion'  -- default for generic fashion items
END
WHERE category = 'Fashion';

-- Update other categories
UPDATE products SET category = 'Home, Kitchen & Pets' 
WHERE category IN ('Home & Garden', 'Kitchen', 'Garden', 'Pet Supplies', 'Home');

UPDATE products SET category = 'Health, Beauty & Perfumes' 
WHERE category IN ('Health & Beauty', 'Beauty', 'Health', 'Cosmetics', 'Personal Care');

UPDATE products SET category = 'Sports, Fitness & Outdoors' 
WHERE category IN ('Sports & Outdoors', 'Sports', 'Fitness', 'Outdoor');

UPDATE products SET category = 'Toys, Games & Baby' 
WHERE category IN ('Toys & Games', 'Toys', 'Games', 'Baby');

UPDATE products SET category = 'Tools & Home Improvement' 
WHERE category IN ('Tools', 'Hardware', 'Home Improvement', 'DIY');

UPDATE products SET category = 'Grocery' 
WHERE category IN ('Food & Beverages', 'Food', 'Beverages', 'Snacks', 'Drinks');

UPDATE products SET category = 'Computers & Office Supplies' 
WHERE category IN ('Office Supplies', 'Stationery');

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('migrate_categories_to_new_system', NOW())
ON CONFLICT DO NOTHING;

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
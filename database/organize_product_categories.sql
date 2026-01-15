-- ================================================
-- TheNileKart Product Category Organization Script
-- ================================================
-- This script organizes all products in the database into 
-- the standardized 16 categories used throughout the application

-- First, let's see current category distribution
SELECT 
    category,
    COUNT(*) as product_count
FROM products 
WHERE category IS NOT NULL AND category != ''
GROUP BY category
ORDER BY product_count DESC;

-- Display products without categories
SELECT COUNT(*) as uncategorized_products
FROM products 
WHERE category IS NULL OR category = '' OR TRIM(category) = '';

-- ================================================
-- CATEGORY STANDARDIZATION
-- ================================================
-- Update variations of category names to standard names

-- 1. Mobile and Electronics variations
UPDATE products SET category = 'Mobiles, Tablets & Accessories' 
WHERE category IN (
    'Mobile', 'Mobiles', 'Mobile Phones', 'Smartphones', 'Tablets', 
    'Mobile Accessories', 'Phone Accessories', 'Tablet Accessories',
    'Cell Phones', 'Electronics - Mobile', 'Mobile & Accessories'
);

UPDATE products SET category = 'Computers & Office Supplies'
WHERE category IN (
    'Computers', 'Computer', 'Laptops', 'Desktop', 'Office Supplies',
    'Office Equipment', 'Computing', 'PC', 'Laptop', 'Computer Accessories',
    'Electronics - Computer', 'Software', 'Peripherals', 'IT Equipment',
    'Computer Hardware'
);

UPDATE products SET category = 'TV, Appliances & Electronics'
WHERE category IN (
    'Electronics', 'TV', 'Television', 'Appliances', 'Home Appliances',
    'Electronic Devices', 'Audio', 'Video', 'Home Electronics',
    'Kitchen Appliances', 'Small Appliances', 'Audio Equipment', 'TV & Audio'
);

-- 2. Fashion categories
UPDATE products SET category = 'Women''s Fashion'
WHERE category IN (
    'Women', 'Womens Fashion', 'Ladies Fashion', 'Female Fashion',
    'Women Clothing', 'Ladies Wear', 'Women''s Wear', 'Womens',
    'Fashion - Women', 'Ladies', 'Women''s Apparel'
);

UPDATE products SET category = 'Men''s Fashion'
WHERE category IN (
    'Men', 'Mens Fashion', 'Male Fashion', 'Mens Clothing', 
    'Men Clothing', 'Men''s Wear', 'Mens Wear', 'Gentlemen',
    'Fashion - Men', 'Men''s Apparel'
);

UPDATE products SET category = 'Kids Fashion'
WHERE category IN (
    'Kids', 'Children', 'Baby', 'Infants', 'Toddler', 'Youth',
    'Kids Clothing', 'Children Clothing', 'Baby Clothes',
    'Kids Fashion', 'Children Fashion', 'Junior'
);

-- 3. Beauty and Personal Care
UPDATE products SET category = 'Health, Beauty & Perfumes'
WHERE category IN (
    'Beauty', 'Health', 'Personal Care', 'Cosmetics', 'Skincare',
    'Makeup', 'Perfumes', 'Fragrance', 'Health & Beauty',
    'Beauty & Personal Care', 'Wellness', 'Healthcare'
);

-- 4. Home and Kitchen
UPDATE products SET category = 'Home, Kitchen & Pets'
WHERE category IN (
    'Home', 'Kitchen', 'Home & Kitchen', 'Home Decor', 'Kitchenware',
    'Home Improvement', 'Pets', 'Pet Supplies', 'Home & Garden',
    'Furniture', 'Decor', 'Pet Care', 'Home Accessories'
);

UPDATE products SET category = 'Tools & Home Improvement'
WHERE category IN (
    'Tools', 'Hardware', 'DIY', 'Construction', 'Home Improvement',
    'Power Tools', 'Hand Tools', 'Building Supplies', 'Garden Tools',
    'Auto Tools', 'Industrial'
);

-- 5. Sports and Recreation
UPDATE products SET category = 'Sports, Fitness & Outdoors'
WHERE category IN (
    'Sports', 'Fitness', 'Outdoors', 'Recreation', 'Exercise',
    'Sporting Goods', 'Outdoor Recreation', 'Athletic',
    'Sports Equipment', 'Gym', 'Camping', 'Hiking'
);

UPDATE products SET category = 'Toys, Games & Baby'
WHERE category IN (
    'Toys', 'Games', 'Baby Products', 'Toy', 'Gaming', 'Puzzles',
    'Board Games', 'Educational Toys', 'Action Figures',
    'Dolls', 'Baby Care', 'Nursery'
);

-- 6. Media and Entertainment
UPDATE products SET category = 'Books'
WHERE category IN (
    'Books', 'Literature', 'Reading', 'Textbooks', 'Novels',
    'Educational Books', 'Fiction', 'Non-Fiction', 'E-books'
);

UPDATE products SET category = 'Video Games'
WHERE category IN (
    'Games', 'Gaming', 'Video Games', 'Console Games', 'PC Games',
    'Gaming Accessories', 'Game Software', 'Gaming Hardware'
);

-- 7. Other categories
UPDATE products SET category = 'Grocery'
WHERE category IN (
    'Food', 'Beverages', 'Grocery', 'Groceries', 'Food & Beverages',
    'Snacks', 'Drinks', 'Consumables', 'Edibles', 'Nutrition'
);

UPDATE products SET category = 'Automotive'
WHERE category IN (
    'Auto', 'Car', 'Vehicle', 'Automotive', 'Car Accessories',
    'Auto Parts', 'Motorcycle', 'Transportation', 'Vehicle Parts'
);

-- ================================================
-- KEYWORD-BASED CATEGORIZATION FOR UNCATEGORIZED PRODUCTS
-- ================================================
-- Categorize products based on keywords in name and description

-- Mobile and Electronics
UPDATE products 
SET category = 'Mobiles, Tablets & Accessories'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobile%' OR 
    LOWER(name) LIKE '%tablet%' OR LOWER(name) LIKE '%smartphone%' OR
    LOWER(name) LIKE '%iphone%' OR LOWER(name) LIKE '%samsung%' OR
    LOWER(name) LIKE '%charging%' OR LOWER(name) LIKE '%charger%' OR
    LOWER(name) LIKE '%case%' OR LOWER(name) LIKE '%screen protector%' OR
    LOWER(description) LIKE '%mobile%' OR LOWER(description) LIKE '%phone%'
);

UPDATE products 
SET category = 'Computers & Office Supplies'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%laptop%' OR LOWER(name) LIKE '%computer%' OR 
    LOWER(name) LIKE '%desktop%' OR LOWER(name) LIKE '%printer%' OR
    LOWER(name) LIKE '%keyboard%' OR LOWER(name) LIKE '%mouse%' OR
    LOWER(name) LIKE '%monitor%' OR LOWER(name) LIKE '%office%' OR
    LOWER(description) LIKE '%computer%' OR LOWER(description) LIKE '%office%'
);

UPDATE products 
SET category = 'TV, Appliances & Electronics'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%tv%' OR LOWER(name) LIKE '%television%' OR 
    LOWER(name) LIKE '%refrigerator%' OR LOWER(name) LIKE '%washing machine%' OR
    LOWER(name) LIKE '%microwave%' OR LOWER(name) LIKE '%air conditioner%' OR
    LOWER(name) LIKE '%speaker%' OR LOWER(name) LIKE '%headphone%' OR
    LOWER(description) LIKE '%appliance%' OR LOWER(description) LIKE '%electronic%'
);

-- Fashion
UPDATE products 
SET category = 'Women''s Fashion'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%women%' OR LOWER(name) LIKE '%ladies%' OR 
    LOWER(name) LIKE '%dress%' OR LOWER(name) LIKE '%blouse%' OR
    LOWER(name) LIKE '%skirt%' OR LOWER(name) LIKE '%heels%' OR
    LOWER(name) LIKE '%handbag%' OR LOWER(name) LIKE '%purse%' OR
    LOWER(description) LIKE '%women%' OR LOWER(description) LIKE '%ladies%'
);

UPDATE products 
SET category = 'Men''s Fashion'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%men%' OR LOWER(name) LIKE '%shirt%' OR 
    LOWER(name) LIKE '%pants%' OR LOWER(name) LIKE '%jeans%' OR
    LOWER(name) LIKE '%suit%' OR LOWER(name) LIKE '%tie%' OR
    LOWER(name) LIKE '%wallet%' OR LOWER(name) LIKE '%belt%' OR
    LOWER(description) LIKE '%men%' OR LOWER(description) LIKE '%gentleman%'
);

UPDATE products 
SET category = 'Kids Fashion'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%kids%' OR LOWER(name) LIKE '%children%' OR 
    LOWER(name) LIKE '%baby%' OR LOWER(name) LIKE '%toddler%' OR
    LOWER(name) LIKE '%infant%' OR LOWER(name) LIKE '%youth%' OR
    LOWER(description) LIKE '%kids%' OR LOWER(description) LIKE '%children%'
);

-- Beauty and Health
UPDATE products 
SET category = 'Health, Beauty & Perfumes'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%perfume%' OR LOWER(name) LIKE '%makeup%' OR 
    LOWER(name) LIKE '%skincare%' OR LOWER(name) LIKE '%cosmetic%' OR
    LOWER(name) LIKE '%beauty%' OR LOWER(name) LIKE '%fragrance%' OR
    LOWER(name) LIKE '%cream%' OR LOWER(name) LIKE '%lotion%' OR
    LOWER(description) LIKE '%beauty%' OR LOWER(description) LIKE '%cosmetic%'
);

-- Home and Kitchen
UPDATE products 
SET category = 'Home, Kitchen & Pets'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%kitchen%' OR LOWER(name) LIKE '%home%' OR 
    LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%decor%' OR
    LOWER(name) LIKE '%pet%' OR LOWER(name) LIKE '%dog%' OR
    LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%cookware%' OR
    LOWER(description) LIKE '%kitchen%' OR LOWER(description) LIKE '%home%'
);

UPDATE products 
SET category = 'Tools & Home Improvement'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%tool%' OR LOWER(name) LIKE '%drill%' OR 
    LOWER(name) LIKE '%hammer%' OR LOWER(name) LIKE '%screwdriver%' OR
    LOWER(name) LIKE '%hardware%' OR LOWER(name) LIKE '%improvement%' OR
    LOWER(description) LIKE '%tool%' OR LOWER(description) LIKE '%hardware%'
);

-- Sports and Recreation
UPDATE products 
SET category = 'Sports, Fitness & Outdoors'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%fitness%' OR 
    LOWER(name) LIKE '%outdoor%' OR LOWER(name) LIKE '%exercise%' OR
    LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%camping%' OR
    LOWER(name) LIKE '%hiking%' OR LOWER(name) LIKE '%bike%' OR
    LOWER(description) LIKE '%sport%' OR LOWER(description) LIKE '%fitness%'
);

UPDATE products 
SET category = 'Toys, Games & Baby'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%toy%' OR LOWER(name) LIKE '%game%' OR 
    LOWER(name) LIKE '%doll%' OR LOWER(name) LIKE '%puzzle%' OR
    LOWER(name) LIKE '%baby%' OR LOWER(name) LIKE '%nursery%' OR
    LOWER(description) LIKE '%toy%' OR LOWER(description) LIKE '%game%'
);

-- Media
UPDATE products 
SET category = 'Books'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%novel%' OR 
    LOWER(name) LIKE '%textbook%' OR LOWER(name) LIKE '%literature%' OR
    LOWER(description) LIKE '%book%' OR LOWER(description) LIKE '%reading%'
);

UPDATE products 
SET category = 'Video Games'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%game%' OR LOWER(name) LIKE '%console%' OR 
    LOWER(name) LIKE '%playstation%' OR LOWER(name) LIKE '%xbox%' OR
    LOWER(name) LIKE '%nintendo%' OR LOWER(name) LIKE '%gaming%' OR
    LOWER(description) LIKE '%video game%' OR LOWER(description) LIKE '%gaming%'
);

-- Grocery
UPDATE products 
SET category = 'Grocery'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%food%' OR LOWER(name) LIKE '%drink%' OR 
    LOWER(name) LIKE '%snack%' OR LOWER(name) LIKE '%beverage%' OR
    LOWER(name) LIKE '%grocery%' OR LOWER(name) LIKE '%organic%' OR
    LOWER(description) LIKE '%food%' OR LOWER(description) LIKE '%edible%'
);

-- Automotive
UPDATE products 
SET category = 'Automotive'
WHERE (category IS NULL OR category = '' OR TRIM(category) = '')
AND (
    LOWER(name) LIKE '%car%' OR LOWER(name) LIKE '%auto%' OR 
    LOWER(name) LIKE '%vehicle%' OR LOWER(name) LIKE '%motor%' OR
    LOWER(name) LIKE '%tire%' OR LOWER(name) LIKE '%battery%' OR
    LOWER(description) LIKE '%automotive%' OR LOWER(description) LIKE '%vehicle%'
);

-- ================================================
-- VERIFICATION AND CLEANUP
-- ================================================

-- Show final category distribution
SELECT 
    COALESCE(category, 'UNCATEGORIZED') as category,
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage
FROM products 
GROUP BY category
ORDER BY product_count DESC;

-- Show remaining uncategorized products for manual review
SELECT id, name, description, category
FROM products 
WHERE category IS NULL OR category = '' OR TRIM(category) = ''
LIMIT 20;

-- Update any remaining uncategorized products to a default category
-- (You may want to review these manually first)
UPDATE products 
SET category = 'Home, Kitchen & Pets'  -- Default category for unclassified items
WHERE category IS NULL OR category = '' OR TRIM(category) = '';

-- Final verification
SELECT 
    'Total Products' as metric,
    COUNT(*) as count
FROM products
UNION ALL
SELECT 
    'Categorized Products',
    COUNT(*)
FROM products 
WHERE category IS NOT NULL AND category != '' AND TRIM(category) != ''
UNION ALL
SELECT 
    'Uncategorized Products',
    COUNT(*)
FROM products 
WHERE category IS NULL OR category = '' OR TRIM(category) = '';

-- Show all 16 standard categories with their product counts
SELECT 
    c.category_name,
    COALESCE(p.product_count, 0) as product_count
FROM (
    VALUES 
        ('Mobiles, Tablets & Accessories'),
        ('Computers & Office Supplies'),
        ('TV, Appliances & Electronics'),
        ('Women''s Fashion'),
        ('Men''s Fashion'),
        ('Kids Fashion'),
        ('Health, Beauty & Perfumes'),
        ('Intimacy'),
        ('Grocery'),
        ('Home, Kitchen & Pets'),
        ('Tools & Home Improvement'),
        ('Toys, Games & Baby'),
        ('Sports, Fitness & Outdoors'),
        ('Books'),
        ('Video Games'),
        ('Automotive')
) AS c(category_name)
LEFT JOIN (
    SELECT category, COUNT(*) as product_count
    FROM products
    GROUP BY category
) AS p ON c.category_name = p.category
ORDER BY p.product_count DESC NULLS LAST;

-- Success message
SELECT 'Product categories have been successfully organized!' as status;
);

-- Update Fashion categories
UPDATE products 
SET category = 'Women''s Fashion'
WHERE category IN (
    'Women Fashion',
    'Ladies Fashion',
    'Women Clothing',
    'Female Fashion',
    'Womens Wear'
);

UPDATE products 
SET category = 'Men''s Fashion'
WHERE category IN (
    'Men Fashion',
    'Mens Fashion',
    'Men Clothing',
    'Male Fashion',
    'Mens Wear',
    'Gentlemen Fashion'
);

UPDATE products 
SET category = 'Kids Fashion'
WHERE category IN (
    'Children Fashion',
    'Baby Fashion',
    'Kid Fashion',
    'Children Clothing',
    'Baby Clothing',
    'Kids Wear',
    'Children Wear'
);

-- Update Beauty & Health categories
UPDATE products 
SET category = 'Health, Beauty & Perfumes'
WHERE category IN (
    'Beauty',
    'Health & Beauty',
    'Cosmetics',
    'Perfumes',
    'Health Products',
    'Beauty Products',
    'Personal Care',
    'Skincare',
    'Makeup'
);

-- Update Home & Kitchen categories
UPDATE products 
SET category = 'Home, Kitchen & Pets'
WHERE category IN (
    'Home & Kitchen',
    'Kitchen',
    'Home Decor',
    'Pet Supplies',
    'Home Accessories',
    'Kitchen Appliances',
    'Pet Products'
);

-- Update Tools & Hardware categories
UPDATE products 
SET category = 'Tools & Home Improvement'
WHERE category IN (
    'Tools',
    'Hardware',
    'Home Improvement',
    'Garden Tools',
    'Power Tools',
    'Hand Tools',
    'DIY Tools'
);

-- Update Baby & Toys categories
UPDATE products 
SET category = 'Toys, Games & Baby'
WHERE category IN (
    'Toys',
    'Games',
    'Baby Products',
    'Children Toys',
    'Board Games',
    'Video Games Hardware',
    'Toy Games'
);

-- Update Sports & Fitness categories
UPDATE products 
SET category = 'Sports, Fitness & Outdoors'
WHERE category IN (
    'Sports',
    'Fitness',
    'Outdoor',
    'Sports Equipment',
    'Fitness Equipment',
    'Outdoor Gear',
    'Athletic Wear',
    'Sports & Recreation'
);

-- Update Automotive categories
UPDATE products 
SET category = 'Automotive'
WHERE category IN (
    'Auto',
    'Car Accessories',
    'Vehicle Parts',
    'Auto Parts',
    'Car Care',
    'Motorcycle'
);

-- Update Video Games categories
UPDATE products 
SET category = 'Video Games'
WHERE category IN (
    'Gaming',
    'Console Games',
    'PC Games',
    'Game Software'
);

-- Update Books categories
UPDATE products 
SET category = 'Books'
WHERE category IN (
    'Literature',
    'Educational Books',
    'Fiction',
    'Non-Fiction',
    'Textbooks'
);

-- Handle any products with NULL or empty categories
-- Assign them to a default category based on keywords in their name/description
UPDATE products 
SET category = 'Mobiles, Tablets & Accessories'
WHERE (category IS NULL OR category = '' OR category = 'Uncategorized')
AND (
    LOWER(name) LIKE '%phone%' OR 
    LOWER(name) LIKE '%mobile%' OR 
    LOWER(name) LIKE '%tablet%' OR
    LOWER(description) LIKE '%smartphone%' OR
    LOWER(description) LIKE '%mobile%'
);

UPDATE products 
SET category = 'Computers & Office Supplies'
WHERE (category IS NULL OR category = '' OR category = 'Uncategorized')
AND (
    LOWER(name) LIKE '%computer%' OR 
    LOWER(name) LIKE '%laptop%' OR 
    LOWER(name) LIKE '%office%' OR
    LOWER(description) LIKE '%computer%' OR
    LOWER(description) LIKE '%laptop%'
);

UPDATE products 
SET category = 'TV, Appliances & Electronics'
WHERE (category IS NULL OR category = '' OR category = 'Uncategorized')
AND (
    LOWER(name) LIKE '%tv%' OR 
    LOWER(name) LIKE '%television%' OR 
    LOWER(name) LIKE '%electronic%' OR
    LOWER(name) LIKE '%appliance%' OR
    LOWER(description) LIKE '%electronic%'
);

-- Assign any remaining uncategorized products to 'Home, Kitchen & Pets' as default
UPDATE products 
SET category = 'Home, Kitchen & Pets'
WHERE category IS NULL OR category = '' OR category = 'Uncategorized';

-- Verify the final category distribution
SELECT 
    category, 
    COUNT(*) as product_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM products), 2) as percentage
FROM products 
GROUP BY category 
ORDER BY product_count DESC;

-- Show any products that might still have non-standard categories
SELECT DISTINCT category 
FROM products 
WHERE category NOT IN (
    'Mobiles, Tablets & Accessories',
    'Computers & Office Supplies',
    'TV, Appliances & Electronics',
    'Women''s Fashion',
    'Men''s Fashion',
    'Kids Fashion',
    'Health, Beauty & Perfumes',
    'Intimacy',
    'Grocery',
    'Home, Kitchen & Pets',
    'Tools & Home Improvement',
    'Toys, Games & Baby',
    'Sports, Fitness & Outdoors',
    'Books',
    'Video Games',
    'Automotive'
);

-- Create an index on category for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Summary report
SELECT 
    'Total Products' as metric,
    COUNT(*) as value
FROM products
UNION ALL
SELECT 
    'Total Categories' as metric,
    COUNT(DISTINCT category) as value
FROM products
UNION ALL
SELECT 
    'Products without Category' as metric,
    COUNT(*) as value
FROM products 
WHERE category IS NULL OR category = '';
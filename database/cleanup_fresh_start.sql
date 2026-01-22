-- Cleanup Database - Keep only specified users and their data
-- Run this script to clean up products, banners, offers created by other sellers

-- Store the user IDs to keep
DO $$
DECLARE
    user_id_1 INTEGER;
    user_id_2 INTEGER;
BEGIN
    -- Get the IDs of the users to keep
    SELECT id INTO user_id_1 FROM users WHERE email = 'johnhader77@gmail.com' LIMIT 1;
    SELECT id INTO user_id_2 FROM users WHERE email = 'maryam.zaidi2904@gmail.com' LIMIT 1;
    
    RAISE NOTICE 'Keeping user IDs: % and %', user_id_1, user_id_2;
    
    -- Delete product_offers for products NOT owned by these users
    DELETE FROM product_offers
    WHERE product_id IN (
        SELECT id FROM products 
        WHERE seller_id NOT IN (user_id_1, user_id_2)
    );
    
    RAISE NOTICE 'Deleted product_offers for products by other sellers';
    
    -- Delete order_items for products NOT owned by these users
    DELETE FROM order_items
    WHERE product_id IN (
        SELECT id FROM products 
        WHERE seller_id NOT IN (user_id_1, user_id_2)
    );
    
    RAISE NOTICE 'Deleted order_items for products by other sellers';
    
    -- Delete orders that have no items left (orphaned orders)
    DELETE FROM orders
    WHERE id NOT IN (
        SELECT DISTINCT order_id FROM order_items
    );
    
    RAISE NOTICE 'Deleted orphaned orders';
    
    -- Delete cart items for products NOT owned by these users
    DELETE FROM cart_items
    WHERE product_id IN (
        SELECT id FROM products 
        WHERE seller_id NOT IN (user_id_1, user_id_2)
    );
    
    RAISE NOTICE 'Deleted cart_items for products by other sellers';
    
    -- Delete products NOT owned by these users
    DELETE FROM products
    WHERE seller_id NOT IN (user_id_1, user_id_2);
    
    RAISE NOTICE 'Deleted products by other sellers';
    
    -- Delete banners created by other sellers
    DELETE FROM banners
    WHERE created_by NOT IN (user_id_1, user_id_2);
    
    RAISE NOTICE 'Deleted banners by other sellers';
    
    -- Delete offers created by other sellers (and their related product_offers if any remain)
    DELETE FROM product_offers
    WHERE offer_code IN (
        SELECT offer_code FROM offers 
        WHERE created_by NOT IN (user_id_1, user_id_2)
    );
    
    DELETE FROM offers
    WHERE created_by NOT IN (user_id_1, user_id_2);
    
    RAISE NOTICE 'Deleted offers by other sellers';
    
    -- Delete all seller accounts except the two specified (optional - comment out if you want to keep seller records)
    DELETE FROM users
    WHERE user_type = 'seller' 
    AND id NOT IN (user_id_1, user_id_2);
    
    RAISE NOTICE 'Deleted seller accounts (kept specified users)';
    
    RAISE NOTICE 'Database cleanup completed successfully!';
    RAISE NOTICE 'Kept products and banners/offers from users: johnhader77@gmail.com and maryam.zaidi2904@gmail.com';
    
END $$;

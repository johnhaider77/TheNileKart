-- Add COD eligibility field to products table
-- Cash On Delivery functionality enhancement

-- Add COD eligible column to products table
ALTER TABLE products 
ADD COLUMN cod_eligible BOOLEAN DEFAULT true;

-- Update existing products to be COD eligible by default
UPDATE products SET cod_eligible = true WHERE cod_eligible IS NULL;

-- Add index for better performance
CREATE INDEX idx_products_cod_eligible ON products(cod_eligible);

-- Add comment for documentation
COMMENT ON COLUMN products.cod_eligible IS 'Indicates if the product is eligible for Cash On Delivery orders';

-- Add COD fee and payment method to orders table
ALTER TABLE orders 
ADD COLUMN cod_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cod' CHECK (payment_method IN ('cod', 'paypal', 'card', 'ziina'));

-- Add comments for new order fields
COMMENT ON COLUMN orders.cod_fee IS 'Cash on Delivery fee charged for the order';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used for the order (cod, paypal, card, ziina)';
-- Migration to add payment method and payment ID support to orders table
-- Add payment_method and payment_id columns to orders table

ALTER TABLE orders 
ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cod',
ADD COLUMN payment_id VARCHAR(100) NULL;

-- Add index for payment lookups
CREATE INDEX idx_orders_payment_id ON orders(payment_id);

-- Update existing orders to have 'cod' as payment method
UPDATE orders SET payment_method = 'cod' WHERE payment_method IS NULL;

-- Add comment to document the payment methods
COMMENT ON COLUMN orders.payment_method IS 'Payment method used: cod, paypal, stripe, etc.';
COMMENT ON COLUMN orders.payment_id IS 'External payment provider transaction ID';
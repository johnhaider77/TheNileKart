-- Add shipping_fee column to orders table for online payment shipping fees
-- Rule: Flat 5 AED for orders <= 50 AED, else free

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN orders.shipping_fee IS 'Shipping fee charged for online (pre-paid) payment orders. Flat 5 AED for orders <= 50 AED, else free';

-- Migration to add Ziina as a payment method
-- This migration updates the payment_method check constraint to include 'ziina'

-- Drop the existing check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add the new check constraint with 'ziina' included
ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'paypal', 'card', 'ziina'));

-- Update comment
COMMENT ON COLUMN orders.payment_method IS 'Payment method used: cod, paypal, card, ziina';

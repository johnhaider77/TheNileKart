-- Add new order status values to the enum
-- This migration adds payment_failed, pending_payment, and payment_cancelled states

-- Step 1: Create a new enum type with all values
ALTER TYPE order_status_enum ADD VALUE 'pending_payment' BEFORE 'payment_failed';
ALTER TYPE order_status_enum ADD VALUE 'payment_failed' BEFORE 'cancelled';
ALTER TYPE order_status_enum ADD VALUE 'payment_cancelled' BEFORE 'cancelled';

-- Step 2: Verify the enum has been updated
-- SELECT enum_range(NULL::order_status_enum);

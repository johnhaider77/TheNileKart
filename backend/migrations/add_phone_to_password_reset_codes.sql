-- Add phone and reset_type columns to password_reset_codes table
-- This migration adds support for SMS-based password reset

-- Check if phone column doesn't exist, then add it
ALTER TABLE password_reset_codes
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add reset_type column to differentiate between email and phone resets
ALTER TABLE password_reset_codes
ADD COLUMN IF NOT EXISTS reset_type VARCHAR(10) DEFAULT 'email';

-- Drop the old unique constraint on email since we need flexible unique constraints
ALTER TABLE password_reset_codes
DROP CONSTRAINT IF EXISTS password_reset_codes_email_key;

-- Add composite unique constraint for (email, reset_type) and (phone, reset_type)
ALTER TABLE password_reset_codes
ADD CONSTRAINT unique_email_reset_type UNIQUE (email, reset_type) WHERE email IS NOT NULL;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_phone 
ON password_reset_codes(phone, reset_type) 
WHERE phone IS NOT NULL;

-- Create index for reset_type
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_reset_type 
ON password_reset_codes(reset_type);

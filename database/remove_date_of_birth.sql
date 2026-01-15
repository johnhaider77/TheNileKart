-- Remove date_of_birth field from users table
ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth;
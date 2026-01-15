-- Add date_of_birth field to users table
ALTER TABLE users ADD COLUMN date_of_birth DATE;

-- Add comment for the new field
COMMENT ON COLUMN users.date_of_birth IS 'User date of birth for profile information';
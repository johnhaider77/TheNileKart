-- Create password reset codes table
CREATE TABLE password_reset_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Add index on email for faster lookups
CREATE INDEX idx_password_reset_codes_email ON password_reset_codes(email);

-- Add index on expires_at for cleanup queries
CREATE INDEX idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);
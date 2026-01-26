-- Create password_reset_codes table for forgot password functionality
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  reset_type VARCHAR(50) NOT NULL DEFAULT 'email',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  UNIQUE(email, reset_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code ON password_reset_codes(code);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);

-- Add comment
COMMENT ON TABLE password_reset_codes IS 'Stores temporary password reset codes sent via email';

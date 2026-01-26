-- Create OTP verification table for customer signup
CREATE TABLE IF NOT EXISTS signup_otp_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    attempts_count INTEGER DEFAULT 0
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_signup_otp_email ON signup_otp_attempts(email);
CREATE INDEX IF NOT EXISTS idx_signup_otp_expires ON signup_otp_attempts(expires_at);
CREATE INDEX IF NOT EXISTS idx_signup_otp_unused ON signup_otp_attempts(email, is_used);

-- Add a function to clean up expired OTP records
CREATE OR REPLACE FUNCTION cleanup_expired_signup_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM signup_otp_attempts
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

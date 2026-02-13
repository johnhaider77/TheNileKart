-- Add push notification support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_tokens JSONB DEFAULT '[]'::jsonb;

-- Create push_notifications table for storing sent notifications
CREATE TABLE IF NOT EXISTS push_notifications (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    heading VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_type VARCHAR(50) DEFAULT 'home', -- 'home', 'product', 'order', etc.
    action_data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'sent', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_push_notifications_seller ON push_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_recipient ON push_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created ON push_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);

-- Create trigger for push_notifications updated_at
CREATE TRIGGER IF NOT EXISTS update_push_notifications_updated_at BEFORE UPDATE ON push_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

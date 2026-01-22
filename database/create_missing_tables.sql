-- Create metrics and tracking tables that were deleted during reset

-- Create user_sessions table (for metrics/session tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    ip_address VARCHAR(50),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id)
);

-- Create metrics_tracking table (for analytics)
CREATE TABLE IF NOT EXISTS metrics_tracking (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    page VARCHAR(100),
    action VARCHAR(100),
    product_id INTEGER,
    order_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_page ON metrics_tracking(page);
CREATE INDEX IF NOT EXISTS idx_metrics_product ON metrics_tracking(product_id);

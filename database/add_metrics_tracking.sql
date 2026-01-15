-- Add metrics tracking tables for live user activity monitoring

-- Create session tracking table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create page visit tracking table
CREATE TABLE page_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    page_type VARCHAR(50) NOT NULL, -- 'homepage', 'category', 'offer', 'checkout', 'payment', 'payment_error'
    page_identifier VARCHAR(255), -- category name, offer id, etc.
    page_url VARCHAR(500),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Create checkout tracking table for detailed checkout/payment error tracking
CREATE TABLE checkout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    checkout_items JSONB, -- cart items details
    total_amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    checkout_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_started_at TIMESTAMP WITH TIME ZONE,
    payment_completed_at TIMESTAMP WITH TIME ZONE,
    payment_error_at TIMESTAMP WITH TIME ZONE,
    error_details JSONB, -- error message, error code, etc.
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'payment_started', 'completed', 'failed', 'abandoned'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create real-time metrics summary table for quick lookups
CREATE TABLE live_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'homepage', 'category', 'offer', 'checkout', 'payment', 'payment_error'
    metric_identifier VARCHAR(255), -- category name, offer id, etc.
    active_users_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_type, metric_identifier)
);

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);

CREATE INDEX idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX idx_page_visits_page_type ON page_visits(page_type);
CREATE INDEX idx_page_visits_is_active ON page_visits(is_active);
CREATE INDEX idx_page_visits_entered_at ON page_visits(entered_at);

CREATE INDEX idx_checkout_sessions_session_id ON checkout_sessions(session_id);
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_payment_error_at ON checkout_sessions(payment_error_at);

CREATE INDEX idx_live_metrics_type_identifier ON live_metrics(metric_type, metric_identifier);

-- Insert default metrics entries
INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count) VALUES
('homepage', '', 0),
('checkout', '', 0),
('payment', '', 0),
('payment_error', '', 0)
ON CONFLICT (metric_type, metric_identifier) DO NOTHING;

-- Function to clean up old inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
    -- Mark sessions inactive if no activity for more than 90 seconds
    UPDATE user_sessions 
    SET is_active = false 
    WHERE is_active = true 
    AND last_activity < NOW() - INTERVAL '90 seconds';
    
    -- Mark page visits as ended if session is inactive
    UPDATE page_visits 
    SET is_active = false, 
        exited_at = COALESCE(exited_at, NOW()),
        duration_seconds = COALESCE(duration_seconds, EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER)
    WHERE is_active = true 
    AND session_id IN (
        SELECT session_id FROM user_sessions WHERE is_active = false
    );
    
    -- Update live metrics after cleanup
    PERFORM update_live_metrics();
END;
$$ LANGUAGE plpgsql;

-- Function to update live metrics
CREATE OR REPLACE FUNCTION update_live_metrics()
RETURNS void AS $$
BEGIN
    -- Update homepage metrics
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    VALUES ('homepage', '', (
        SELECT COUNT(DISTINCT pv.session_id)
        FROM page_visits pv
        JOIN user_sessions us ON pv.session_id = us.session_id
        WHERE pv.page_type = 'homepage' 
        AND pv.is_active = true 
        AND us.is_active = true
    ), NOW())
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;

    -- Update category page metrics
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    SELECT 
        'category',
        pv.page_identifier,
        COUNT(DISTINCT pv.session_id),
        NOW()
    FROM page_visits pv
    JOIN user_sessions us ON pv.session_id = us.session_id
    WHERE pv.page_type = 'category' 
    AND pv.is_active = true 
    AND us.is_active = true
    AND pv.page_identifier IS NOT NULL
    GROUP BY pv.page_identifier
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;

    -- First, reset all category metrics to 0
    UPDATE live_metrics 
    SET active_users_count = 0, last_updated = NOW() 
    WHERE metric_type = 'category';

    -- Then update category page metrics with current active counts
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    SELECT 
        'category',
        pv.page_identifier,
        COUNT(DISTINCT pv.session_id),
        NOW()
    FROM page_visits pv
    JOIN user_sessions us ON pv.session_id = us.session_id
    WHERE pv.page_type = 'category' 
    AND pv.is_active = true 
    AND us.is_active = true
    AND pv.page_identifier IS NOT NULL
    GROUP BY pv.page_identifier
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;

    -- First, reset all offer metrics to 0
    UPDATE live_metrics 
    SET active_users_count = 0, last_updated = NOW() 
    WHERE metric_type = 'offer';

    -- Then update offer page metrics with current active counts
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    SELECT 
        'offer',
        pv.page_identifier,
        COUNT(DISTINCT pv.session_id),
        NOW()
    FROM page_visits pv
    JOIN user_sessions us ON pv.session_id = us.session_id
    WHERE pv.page_type = 'offer' 
    AND pv.is_active = true 
    AND us.is_active = true
    AND pv.page_identifier IS NOT NULL
    GROUP BY pv.page_identifier
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;

    -- Update checkout metrics
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    VALUES ('checkout', '', (
        SELECT COUNT(DISTINCT pv.session_id)
        FROM page_visits pv
        JOIN user_sessions us ON pv.session_id = us.session_id
        WHERE pv.page_type = 'checkout' 
        AND pv.is_active = true 
        AND us.is_active = true
    ), NOW())
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;

    -- Update payment metrics
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    VALUES ('payment', '', (
        SELECT COUNT(DISTINCT pv.session_id)
        FROM page_visits pv
        JOIN user_sessions us ON pv.session_id = us.session_id
        WHERE pv.page_type = 'payment' 
        AND pv.is_active = true 
        AND us.is_active = true
    ), NOW())
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;

    -- Update payment error metrics
    INSERT INTO live_metrics (metric_type, metric_identifier, active_users_count, last_updated)
    VALUES ('payment_error', '', (
        SELECT COUNT(DISTINCT pv.session_id)
        FROM page_visits pv
        JOIN user_sessions us ON pv.session_id = us.session_id
        WHERE pv.page_type = 'payment_error' 
        AND pv.is_active = true 
        AND us.is_active = true
    ), NOW())
    ON CONFLICT (metric_type, metric_identifier) 
    DO UPDATE SET 
        active_users_count = EXCLUDED.active_users_count,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;
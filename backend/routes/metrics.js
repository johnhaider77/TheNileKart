const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Middleware to get user info from session or IP
const getUserInfo = (req) => {
  return {
    userId: req.user?.id || null,
    email: req.user?.email || null,
    phone: req.user?.phone || null,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  };
};

// Start a new session when user enters the website
router.post('/session/start', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const userInfo = getUserInfo(req);
    
    const query = `
      INSERT INTO user_sessions 
      (session_id, user_id, email, phone, ip_address, user_agent, is_active, last_activity)
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
      RETURNING session_id
    `;
    
    const result = await db.query(query, [
      sessionId, 
      userInfo.userId, 
      userInfo.email, 
      userInfo.phone, 
      userInfo.ipAddress, 
      userInfo.userAgent
    ]);
    
    res.json({ sessionId: result.rows[0].session_id });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Session heartbeat endpoint to keep session active
router.post('/session/heartbeat', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Update session last_activity to keep it alive
    const result = await db.query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE session_id = $1 AND is_active = true RETURNING *',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    res.json({ success: true, message: 'Heartbeat received' });
  } catch (error) {
    console.error('Error in session heartbeat:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

// Track page visit
router.post('/track/page-visit', async (req, res) => {
  try {
    const { sessionId, pageType, pageIdentifier, pageUrl } = req.body;
    
    if (!sessionId || !pageType) {
      return res.status(400).json({ error: 'Session ID and page type are required' });
    }
    
    // End previous active page visits for this session
    await db.query(`
      UPDATE page_visits 
      SET is_active = false, 
          exited_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER
      WHERE session_id = $1 AND is_active = true
    `, [sessionId]);
    
    // Update session last activity
    await db.query(`
      UPDATE user_sessions 
      SET last_activity = NOW() 
      WHERE session_id = $1
    `, [sessionId]);
    
    // Start new page visit
    const query = `
      INSERT INTO page_visits 
      (session_id, page_type, page_identifier, page_url, entered_at, is_active)
      VALUES ($1, $2, $3, $4, NOW(), true)
      RETURNING id
    `;
    
    await db.query(query, [sessionId, pageType, pageIdentifier, pageUrl]);
    
    // Update live metrics
    await db.query('SELECT update_live_metrics()');
    
    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const metrics = await getLiveMetrics();
      io.emit('metrics-update', metrics);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking page visit:', error);
    res.status(500).json({ error: 'Failed to track page visit' });
  }
});

// Track checkout session
router.post('/track/checkout-start', async (req, res) => {
  try {
    const { sessionId, checkoutItems, totalAmount, paymentMethod } = req.body;
    const userInfo = getUserInfo(req);
    
    const query = `
      INSERT INTO checkout_sessions 
      (session_id, user_id, email, phone, checkout_items, total_amount, payment_method, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress')
      RETURNING id
    `;
    
    await db.query(query, [
      sessionId,
      userInfo.userId,
      userInfo.email,
      userInfo.phone,
      JSON.stringify(checkoutItems),
      totalAmount,
      paymentMethod
    ]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking checkout start:', error);
    res.status(500).json({ error: 'Failed to track checkout start' });
  }
});

// Track payment start
router.post('/track/payment-start', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    await db.query(`
      UPDATE checkout_sessions 
      SET payment_started_at = NOW(), status = 'payment_started'
      WHERE session_id = $1 AND status = 'in_progress'
    `, [sessionId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking payment start:', error);
    res.status(500).json({ error: 'Failed to track payment start' });
  }
});

// Track payment error
router.post('/track/payment-error', async (req, res) => {
  try {
    const { sessionId, errorDetails } = req.body;
    
    // Update checkout session with error details
    await db.query(`
      UPDATE checkout_sessions 
      SET payment_error_at = NOW(), 
          error_details = $2, 
          status = 'failed'
      WHERE session_id = $1
    `, [sessionId, JSON.stringify(errorDetails)]);
    
    // Update session last activity
    await db.query(`
      UPDATE user_sessions 
      SET last_activity = NOW() 
      WHERE session_id = $1
    `, [sessionId]);
    
    // Update live metrics
    await db.query('SELECT update_live_metrics()');
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const metrics = await getLiveMetrics();
      const paymentErrors = await getPaymentErrorDetails();
      io.emit('metrics-update', metrics);
      io.emit('payment-errors-update', paymentErrors);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking payment error:', error);
    res.status(500).json({ error: 'Failed to track payment error' });
  }
});

// Track payment success
router.post('/track/payment-success', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    await db.query(`
      UPDATE checkout_sessions 
      SET payment_completed_at = NOW(), status = 'completed'
      WHERE session_id = $1
    `, [sessionId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking payment success:', error);
    res.status(500).json({ error: 'Failed to track payment success' });
  }
});

// End session when user leaves
router.post('/session/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Mark session as inactive
    await db.query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE session_id = $1
    `, [sessionId]);
    
    // End active page visits
    await db.query(`
      UPDATE page_visits 
      SET is_active = false, 
          exited_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - entered_at))::INTEGER
      WHERE session_id = $1 AND is_active = true
    `, [sessionId]);
    
    // Update live metrics
    await db.query('SELECT update_live_metrics()');
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const metrics = await getLiveMetrics();
      io.emit('metrics-update', metrics);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Get live metrics for sellers
router.get('/live-metrics', async (req, res) => {
  try {
    const metrics = await getLiveMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching live metrics:', error);
    res.status(500).json({ error: 'Failed to fetch live metrics' });
  }
});

// Get payment error details for sellers
router.get('/payment-errors', async (req, res) => {
  try {
    const errors = await getPaymentErrorDetails();
    res.json(errors);
  } catch (error) {
    console.error('Error fetching payment errors:', error);
    res.status(500).json({ error: 'Failed to fetch payment errors' });
  }
});

// Helper function to get live metrics
async function getLiveMetrics() {
  // Clean up inactive sessions first
  await db.query('SELECT cleanup_inactive_sessions()');
  
  const metricsQuery = `
    SELECT metric_type, metric_identifier, active_users_count, last_updated
    FROM live_metrics
    ORDER BY metric_type, metric_identifier
  `;
  
  const result = await db.query(metricsQuery);
  
  // Organize metrics by type
  const metrics = {
    homepage: 0,
    categories: {},
    offers: {},
    checkout: 0,
    payment: 0,
    paymentError: 0,
    lastUpdated: new Date().toISOString()
  };
  
  result.rows.forEach(row => {
    switch (row.metric_type) {
      case 'homepage':
        metrics.homepage = row.active_users_count;
        break;
      case 'category':
        metrics.categories[row.metric_identifier] = row.active_users_count;
        break;
      case 'offer':
        metrics.offers[row.metric_identifier] = row.active_users_count;
        break;
      case 'checkout':
        metrics.checkout = row.active_users_count;
        break;
      case 'payment':
        metrics.payment = row.active_users_count;
        break;
      case 'payment_error':
        metrics.paymentError = row.active_users_count;
        break;
    }
  });
  
  return metrics;
}

// Helper function to get payment error details
async function getPaymentErrorDetails() {
  const query = `
    SELECT 
      cs.id,
      cs.session_id,
      cs.email,
      cs.phone,
      cs.checkout_items,
      cs.total_amount,
      cs.payment_method,
      cs.payment_error_at,
      cs.error_details,
      us.ip_address,
      us.user_agent
    FROM checkout_sessions cs
    LEFT JOIN user_sessions us ON cs.session_id = us.session_id
    WHERE cs.status = 'failed' 
    AND cs.payment_error_at > NOW() - INTERVAL '1 hour'
    ORDER BY cs.payment_error_at DESC
    LIMIT 50
  `;
  
  const result = await db.query(query);
  return result.rows;
}

// Cleanup endpoint for maintenance
router.post('/cleanup-sessions', async (req, res) => {
  try {
    await db.query('SELECT cleanup_inactive_sessions()');
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

module.exports = router;
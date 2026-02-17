const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendNotification, sendMultipleNotifications, sendTopicNotification, isValidFCMToken } = require('../services/pushNotificationService');
const { authenticateToken, requireSeller } = require('../middleware/auth');

/**
 * Check if a token is valid FCM format (public endpoint for debugging)
 * GET /api/push-notifications/check-token?token=...
 */
router.get('/check-token', (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ 
        error: 'token query parameter is required',
        example: '/api/push-notifications/check-token?token=your_fcm_token_here'
      });
    }

    const isValid = isValidFCMToken(token);
    const tokenLength = token.length;
    const testTokenIndicators = ['exampleToken123', 'test', 'demo', 'example'];
    const isTestToken = testTokenIndicators.some(t => token.toLowerCase().includes(t.toLowerCase()));

    res.json({
      token: token.substring(0, 50) + (token.length > 50 ? '...' : ''),
      tokenLength,
      isValid,
      isTestToken,
      validation: {
        lengthOk: tokenLength > 100,
        expectedLength: '150+ characters',
        notTestToken: !isTestToken
      },
      details: isValid 
        ? '✅ This looks like a valid FCM token'
        : isTestToken 
          ? '🚫 THIS IS A TEST TOKEN - WILL NOT WORK! Use real FCM token from Firebase SDK'
          : `⚠️ Token too short (${tokenLength} chars). Real FCM tokens should be 150+ chars.`,
      recommendation: !isValid
        ? 'iOS app must register real device token from Firebase Cloud Messaging SDK'
        : 'Token looks good for push notifications'
    });
  } catch (error) {
    console.error('Error checking token:', error);
    res.status(500).json({ error: 'Failed to check token' });
  }
});

/**
 * Register device token for a user
 * POST /api/push-notifications/register-token
 */
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user.id;

    if (!deviceToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Device token is required' 
      });
    }

    // Check if token is valid before saving
    if (!isValidFCMToken(deviceToken)) {
      console.warn(`⚠️  User ${userId} attempted to register invalid FCM token: ${deviceToken.substring(0, 50)}...`);
      
      // Check if it's a test/placeholder token
      const testTokenIndicators = ['exampleToken123', 'test', 'demo', 'example', 'placeholder'];
      const isTestToken = testTokenIndicators.some(t => deviceToken.toLowerCase().includes(t.toLowerCase()));
      
      return res.status(400).json({
        success: false,
        error: isTestToken 
          ? 'Invalid device token: This appears to be a test/placeholder token. Please ensure the iOS app has GoogleService-Info.plist configured for Firebase.'
          : `Invalid device token format. FCM tokens must be 150+ characters. Got ${deviceToken.length} chars.`,
        tokenLength: deviceToken.length,
        isTestToken,
        recommendation: 'Ensure iOS app is properly registered with Firebase Cloud Messaging and GoogleService-Info.plist is in the project'
      });
    }

    // Get current device tokens
    const userQuery = 'SELECT device_tokens FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    let deviceTokens = userResult.rows[0].device_tokens || [];
    
    // Remove old invalid tokens automatically (cleanup)
    const oldInvalidCount = deviceTokens.length;
    deviceTokens = deviceTokens.filter(token => isValidFCMToken(token));
    const cleanedCount = oldInvalidCount - deviceTokens.length;
    
    if (cleanedCount > 0) {
      console.log(`🧹 Auto-cleanup: Removed ${cleanedCount} invalid token(s) for user ${userId}`);
    }
    
    // Add token if not already present
    if (!deviceTokens.includes(deviceToken)) {
      deviceTokens.push(deviceToken);
      console.log(`✅ Registered valid FCM token for user ${userId}. Total tokens: ${deviceTokens.length}`);
    }

    // Update user with new device token
    const updateQuery = 'UPDATE users SET device_tokens = $1, fcm_token = $2, updated_at = NOW() WHERE id = $3 RETURNING id';
    await db.query(updateQuery, [JSON.stringify(deviceTokens), deviceToken, userId]);

    res.status(200).json({
      success: true,
      message: 'Device token registered successfully',
      deviceTokensCount: deviceTokens.length,
      tokenPreview: deviceToken.substring(0, 50) + '...',
      cleaned: cleanedCount > 0 ? `Removed ${cleanedCount} invalid token(s)` : undefined
    });
  } catch (error) {
    console.error('Error registering device token:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register device token' 
    });
  }
});

/**
 * Send push notification to a specific user
 * POST /api/push-notifications/send
 * Only sellers can send notifications
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipientUserId, heading, message, actionType = 'home', actionData = {} } = req.body;
    const sellerId = req.user.id;

    // Verify sender is authenticated and has seller access
    // Check both user_type and if they're accessing from seller routes
    if (!req.user || !req.user.id) {
      console.warn('⚠️ Push notification send: No authenticated user');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Log user info for debugging
    console.log(`📢 Push notification send requested by user ${sellerId}, user_type: ${req.user.user_type}, email: ${req.user.email}`);

    // Check if user is seller (case-insensitive)
    if (!req.user.user_type || req.user.user_type.toLowerCase() !== 'seller') {
      console.warn(`⚠️ Non-seller user ${sellerId} attempted to send push notification. User type: ${req.user.user_type}`);
      return res.status(403).json({ error: 'Seller access required to send notifications' });
    }

    // Validate required fields
    if (!recipientUserId || !heading || !message) {
      return res.status(400).json({ 
        error: 'recipientUserId, heading, and message are required' 
      });
    }

    // Get recipient's device tokens
    const recipientQuery = 'SELECT device_tokens FROM users WHERE id = $1';
    const recipientResult = await db.query(recipientQuery, [recipientUserId]);

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    const deviceTokens = recipientResult.rows[0].device_tokens || [];

    if (deviceTokens.length === 0) {
      return res.status(400).json({ error: 'Recipient has no registered devices' });
    }

    // Send notifications
    const notificationResult = await sendMultipleNotifications(
      deviceTokens,
      heading,
      message,
      { actionType, actionData }
    );

    // Store notification in database
    const storeQuery = `
      INSERT INTO push_notifications 
      (seller_id, recipient_user_id, heading, message, action_type, action_data, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `;

    const storeResult = await db.query(storeQuery, [
      sellerId,
      recipientUserId,
      heading,
      message,
      actionType,
      JSON.stringify(actionData),
      notificationResult.success ? 'sent' : 'failed'
    ]);

    // Check if tokens are valid - if all are invalid, it's a configuration issue
    const invalidTokens = deviceTokens.filter(t => !isValidFCMToken(t));
    const hasOnlyInvalidTokens = invalidTokens.length === deviceTokens.length && deviceTokens.length > 0;
    
    // Auto-clean invalid tokens from database
    if (invalidTokens.length > 0) {
      const validTokens = deviceTokens.filter(t => isValidFCMToken(t));
      if (validTokens.length > 0) {
        console.log(`🧹 Auto-cleaning ${invalidTokens.length} invalid token(s) for user ${recipientUserId}`);
        try {
          await db.query(
            'UPDATE users SET device_tokens = $1 WHERE id = $2',
            [validTokens, recipientUserId]
          );
          console.log(`✅ Removed ${invalidTokens.length} invalid token(s). ${validTokens.length} valid token(s) remain.`);
        } catch (cleanupErr) {
          console.warn(`⚠️ Failed to auto-clean invalid tokens: ${cleanupErr.message}`);
        }
      } else {
        console.log(`🔴 All tokens are invalid for user ${recipientUserId}. Need real FCM token from app.`);
      }
    }
    
    res.status(200).json({
      success: notificationResult.success,
      notificationsSent: notificationResult.successfulSends > 0,
      message: notificationResult.successfulSends > 0 
        ? `Notification sent successfully to ${notificationResult.successfulSends} device(s)`
        : hasOnlyInvalidTokens
          ? `Failed to send notification: All ${invalidTokens.length} device token(s) are invalid/short. iOS app must retrieve real FCM token from Firebase SDK.`
          : `Failed to send notification: ${notificationResult.failedSends} device(s) failed`,
      notificationId: storeResult.rows[0].id,
      devicesSent: notificationResult.successfulSends,
      devicesFailed: notificationResult.failedSends,
      totalDevices: notificationResult.totalTokens,
      details: notificationResult.success 
        ? { messageId: notificationResult.results?.[0]?.messageId }
        : { 
            errors: notificationResult.results?.map(r => ({
              token: r.token?.substring(0, 20) + '...',
              tokenLength: r.token?.length,
              error: r.error,
              isProbablyInvalidToken: (r.token?.length || 0) < 100 ? '⚠️ Token too short' : undefined,
              fcmError: r.details
            })),
            invalidTokenCount: invalidTokens.length,
            tokenValidationIssue: hasOnlyInvalidTokens ? '🔴 CRITICAL: All tokens are invalid. iOS app must send real FCM token.' : undefined
          },
      debugInfo: {
        recipientId: recipientUserId,
        deviceTokensRegistered: deviceTokens.length,
        deviceTokensSample: deviceTokens.length > 0 ? deviceTokens[0].substring(0, 30) + '...' : 'none',
        tokenLengths: deviceTokens.map(t => ({ length: t.length, isValid: isValidFCMToken(t) })),
        allTokensInvalid: hasOnlyInvalidTokens,
        recommendation: hasOnlyInvalidTokens ? 'Verify iOS app has: 1) GoogleService-Info.plist, 2) Firebase initialized properly, 3) User granted notification permissions' : undefined
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Send notification to multiple recipients (bulk)
 * POST /api/push-notifications/send-bulk
 * Only sellers can send notifications
 */
router.post('/send-bulk', authenticateToken, async (req, res) => {
  try {
    const { recipientUserIds, heading, message, actionType = 'home', actionData = {} } = req.body;
    const sellerId = req.user.id;

    // Verify sender is authenticated and has seller access
    if (!req.user || !req.user.id) {
      console.warn('⚠️ Push notification send-bulk: No authenticated user');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Log user info for debugging
    console.log(`📢 Bulk push notification send requested by user ${sellerId}, user_type: ${req.user.user_type}`);

    // Check if user is seller (case-insensitive)
    if (!req.user.user_type || req.user.user_type.toLowerCase() !== 'seller') {
      console.warn(`⚠️ Non-seller user ${sellerId} attempted bulk push notification. User type: ${req.user.user_type}`);
      return res.status(403).json({ error: 'Seller access required to send notifications' });
    }

    // Validate required fields
    if (!recipientUserIds || !Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
      return res.status(400).json({ 
        error: 'recipientUserIds (array) is required' 
      });
    }

    if (!heading || !message) {
      return res.status(400).json({ 
        error: 'heading and message are required' 
      });
    }

    // Get all device tokens for recipients
    const recipientsQuery = 'SELECT id, device_tokens FROM users WHERE id = ANY($1)';
    const recipientsResult = await db.query(recipientsQuery, [recipientUserIds]);

    const allDeviceTokens = [];
    const recipientMap = {};

    recipientsResult.rows.forEach(user => {
      const tokens = user.device_tokens || [];
      allDeviceTokens.push(...tokens);
      recipientMap[user.id] = tokens;
    });

    if (allDeviceTokens.length === 0) {
      return res.status(400).json({ error: 'No recipients have registered devices' });
    }

    // Send notifications
    const notificationResult = await sendMultipleNotifications(
      allDeviceTokens,
      heading,
      message,
      { actionType, actionData }
    );

    // Store notifications in database
    const insertPromises = recipientUserIds.map(userId => {
      const storeQuery = `
        INSERT INTO push_notifications 
        (seller_id, recipient_user_id, heading, message, action_type, action_data, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      return db.query(storeQuery, [
        sellerId,
        userId,
        heading,
        message,
        actionType,
        JSON.stringify(actionData),
        'sent'
      ]);
    });

    await Promise.all(insertPromises);

    const allNotificationsSent = notificationResult.successfulSends > 0 && notificationResult.failedSends === 0;
    const hasFailures = notificationResult.failedSends > 0;
    
    // Analyze if failures are due to invalid tokens
    const invalidTokensCount = allDeviceTokens.filter(t => !isValidFCMToken(t)).length;
    const hasOnlyInvalidTokens = invalidTokensCount === allDeviceTokens.length && allDeviceTokens.length > 0;

    // Auto-cleanup: Remove invalid tokens from all recipient accounts
    if (invalidTokensCount > 0) {
      for (const userId of recipientUserIds) {
        const userTokens = recipientMap[userId] || [];
        const validTokens = userTokens.filter(t => isValidFCMToken(t));
        if (validTokens.length < userTokens.length) {
          const invalidCount = userTokens.length - validTokens.length;
          console.log(`🧹 Auto-cleanup: Removing ${invalidCount} invalid token(s) from user ${userId}`);
          if (validTokens.length > 0) {
            await db.query('UPDATE users SET device_tokens = $1 WHERE id = $2', [validTokens, userId]);
          } else {
            await db.query('UPDATE users SET device_tokens = NULL WHERE id = $1', [userId]);
          }
        }
      }
    }

    res.status(200).json({
      success: notificationResult.success,
      notificationsSent: allNotificationsSent,
      message: hasFailures 
        ? hasOnlyInvalidTokens
          ? `Notification sending failed: All ${invalidTokensCount} device token(s) are invalid/short. iOS app must retrieve real FCM token from Firebase SDK. Invalid tokens have been removed from the system.`
          : `Notification sending partially failed: ${notificationResult.successfulSends} sent, ${notificationResult.failedSends} failed. Check errors below.`
        : `Successfully sent notifications to ${notificationResult.successfulSends} device(s)`,
      recipientsCount: recipientUserIds.length,
      totalDevices: allDeviceTokens.length,
      devicesSent: notificationResult.successfulSends,
      devicesFailed: notificationResult.failedSends,
      details: notificationResult,
      warning: notificationResult.failedSends > 0 ? 'Some notifications failed. Check error details.' : undefined,
      failureAnalysis: notificationResult.failedSends > 0 ? {
        totalFailed: notificationResult.failedSends,
        invalidTokensDetected: invalidTokensCount,
        allTokensInvalid: hasOnlyInvalidTokens,
        errors: notificationResult.results?.filter(r => !r.success).map(r => ({
          tokenPreview: r.token?.substring(0, 50) + '...',
          tokenLength: r.token?.length,
          error: r.error,
          fcmStatus: r.details?.error?.status,
          fcmMessage: r.details?.error?.message,
          isProbablyInvalidToken: (r.token?.length || 0) < 100 ? '⚠️ Token too short - likely not a real FCM token' : undefined
        })),
        recommendation: hasOnlyInvalidTokens 
          ? 'CRITICAL: All device tokens are invalid (test/placeholder tokens). Verify iOS app has: 1) GoogleService-Info.plist present, 2) Firebase properly initialized, 3) User granted notification permissions'
          : 'Some tokens are invalid. Ensure iOS app generates real FCM tokens (150+ characters) from Firebase SDK'
      } : undefined
    });
  } catch (error) {
    console.error('Error sending bulk notification:', error.message);
    res.status(500).json({ error: 'Failed to send bulk notification' });
  }
});

/**
 * Get notification history for current user
 * GET /api/push-notifications/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;

    const query = `
      SELECT 
        id,
        seller_id,
        heading,
        message,
        action_type,
        action_data,
        sent_at,
        read_at,
        status,
        created_at
      FROM push_notifications
      WHERE recipient_user_id = $1 OR seller_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);

    res.status(200).json({
      success: true,
      notifications: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching notification history:', error.message);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

/**
 * Mark notification as read
 * PUT /api/push-notifications/:notificationId/read
 */
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user.id;

    // Verify user owns this notification
    const verifyQuery = `
      SELECT id FROM push_notifications 
      WHERE id = $1 AND (recipient_user_id = $2 OR seller_id = $2)
    `;
    const verifyResult = await db.query(verifyQuery, [notificationId, userId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as read
    const updateQuery = `
      UPDATE push_notifications 
      SET read_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id, read_at
    `;
    const updateResult = await db.query(updateQuery, [notificationId]);

    res.status(200).json({
      success: true,
      notification: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Get unread notification count
 * GET /api/push-notifications/unread/count
 */
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT COUNT(*) as unread_count
      FROM push_notifications
      WHERE recipient_user_id = $1 AND read_at IS NULL
    `;

    const result = await db.query(query, [userId]);

    res.status(200).json({
      success: true,
      unreadCount: parseInt(result.rows[0].unread_count)
    });
  } catch (error) {
    console.error('Error fetching unread count:', error.message);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * Diagnostic endpoint - Check device tokens and Firebase status
 * GET /api/push-notifications/diagnostic
 */
router.get('/diagnostic', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's device tokens
    const userQuery = 'SELECT id, email, device_tokens FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const deviceTokens = user.device_tokens || [];

    // Check Firebase config
    const firebaseOk = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'via env var' : 'via file';
    const firebaseConfigured = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || require('fs').existsSync(require('path').join(__dirname, '../../firebase-service-account-key.json'));

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      deviceTokens: {
        count: deviceTokens.length,
        tokens: deviceTokens.map((token, idx) => ({
          index: idx + 1,
          token: token?.substring(0, 50) + '...',
          length: token?.length,
          isValid: token && token.length > 100 ? '✅ Likely valid (150+ chars)' : '⚠️ Invalid - too short or test token',
          isTestToken: token === 'exampleToken123' ? '🚫 THIS IS A TEST TOKEN - WILL NOT WORK!' : undefined
        }))
      },
      firebase: {
        configured: firebaseConfigured ? 'Yes' : 'No',
        loadMethod: firebaseConfigured ? firebaseOk : 'Not configured',
        status: firebaseConfigured ? '✅ Ready' : '❌ NOT CONFIGURED - Notifications will fail!'
      },
      troubleshooting: {
        noDevices: deviceTokens.length === 0 ? '❌ User has no registered devices. App needs to register device token.' : '✅ Devices registered',
        invalidTokens: deviceTokens.some(t => !t || t.length < 100) ? '⚠️ Some tokens appear invalid' : '✅ All tokens look valid',
        firebaseKey: !firebaseConfigured ? '❌ Firebase service account key missing' : '✅ Firebase configured'
      }
    });
  } catch (error) {
    console.error('Diagnostic error:', error.message);
    res.status(500).json({ error: 'Diagnostic check failed', details: error.message });
  }
});

/**
 * Clean invalid tokens from database (for this user only)
 * DELETE /api/push-notifications/clean-tokens
 */
router.delete('/clean-tokens', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current tokens
    const userQuery = 'SELECT device_tokens FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allTokens = userResult.rows[0].device_tokens || [];
    const validTokens = allTokens.filter(token => isValidFCMToken(token));
    const invalidTokens = allTokens.filter(token => !isValidFCMToken(token));

    // Update user with only valid tokens
    if (invalidTokens.length > 0) {
      const updateQuery = 'UPDATE users SET device_tokens = $1, updated_at = NOW() WHERE id = $2 RETURNING id';
      await db.query(updateQuery, [JSON.stringify(validTokens), userId]);

      console.log(`🧹 Cleaned ${invalidTokens.length} invalid tokens for user ${userId}`);
      console.log(`   Invalid tokens: ${invalidTokens.map(t => `${t.substring(0, 20)}...`).join(', ')}`);
      console.log(`   Remaining valid tokens: ${validTokens.length}`);

      res.status(200).json({
        success: true,
        message: `Removed ${invalidTokens.length} invalid token(s)`,
        invalidTokensRemoved: invalidTokens.length,
        validTokensRemaining: validTokens.length,
        removedTokens: invalidTokens.map(t => ({
          token: t.substring(0, 30) + '...',
          reason: t.length < 100 ? 'Too short (test/placeholder token)' : 'Invalid format'
        }))
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'No invalid tokens to clean',
        invalidTokensRemoved: 0,
        validTokensRemaining: validTokens.length
      });
    }
  } catch (error) {
    console.error('Error cleaning tokens:', error.message);
    res.status(500).json({ error: 'Failed to clean tokens' });
  }
});

module.exports = router;

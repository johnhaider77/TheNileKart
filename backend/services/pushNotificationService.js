const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Firebase Cloud Messaging Configuration
const FCM_API_URL = 'https://fcm.googleapis.com/v1/projects';

// Lazy load SERVICE_ACCOUNT_KEY to avoid startup errors if file is missing
let SERVICE_ACCOUNT_KEY = null;

function getServiceAccountKey() {
  if (SERVICE_ACCOUNT_KEY) {
    return SERVICE_ACCOUNT_KEY;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    SERVICE_ACCOUNT_KEY = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    const keyPath = path.join(__dirname, '../../firebase-service-account-key.json');
    if (fs.existsSync(keyPath)) {
      SERVICE_ACCOUNT_KEY = require(keyPath);
    } else {
      console.warn('⚠️  Firebase service account key not found. Push notifications will not work.');
      console.warn('📝 Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable or add firebase-service-account-key.json');
      SERVICE_ACCOUNT_KEY = null;
    }
  }

  return SERVICE_ACCOUNT_KEY;
}

let accessToken = null;
let tokenExpiry = null;

/**
 * Get Firebase access token using service account
 */
async function getAccessToken() {
  try {
    const key = getServiceAccountKey();
    
    if (!key) {
      console.error('❌ Firebase service account key not configured');
      console.error('📋 Required: FIREBASE_SERVICE_ACCOUNT_KEY env var or firebase-service-account-key.json file');
      throw new Error('Firebase service account key not configured');
    }

    // Check if token is still valid
    if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
      return accessToken;
    }

    const jwt = require('jsonwebtoken');
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600; // 1 hour

    const payload = {
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiresAt,
      iat: now
    };

    const token = jwt.sign(payload, key.private_key, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT'
      }
    });

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    });

    accessToken = response.data.access_token;
    tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000); // Refresh 60 seconds before expiry

    console.log('✅ Firebase access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting Firebase access token:', error.message);
    if (error.response?.data) {
      console.error('Firebase error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error('Failed to authenticate with Firebase Cloud Messaging: ' + error.message);
  }
}

/**
 * Validate if a token appears to be a real FCM token
 * Real FCM tokens are typically 150+ characters and alphanumeric with special chars
 */
function isValidFCMToken(token) {
  if (!token) return false;
  
  // Test tokens or obviously fake tokens
  const testTokens = ['exampleToken123', 'test', 'demo', 'example'];
  if (testTokens.some(t => token.toLowerCase().includes(t.toLowerCase()))) {
    return false;
  }
  
  // Real FCM tokens are usually 150+ characters
  return token.length > 100;
}

/**
 * Send push notification to a single device token
 * @param {string} deviceToken - The FCM device token
 * @param {string} heading - Notification heading
 * @param {string} message - Notification message
 * @param {object} data - Additional data to include in notification
 */
async function sendNotification(deviceToken, heading, message, data = {}) {
  try {
    if (!deviceToken) {
      throw new Error('Device token is required');
    }

    // Validate token
    const isValidToken = isValidFCMToken(deviceToken);
    if (!isValidToken) {
      console.error('❌ INVALID DEVICE TOKEN DETECTED');
      console.error('Token:', deviceToken);
      console.error('Length:', deviceToken.length);
      console.error('Real FCM tokens are ~150+ characters, alphanumeric.');
      console.error('This appears to be a test/example token that will NOT receive notifications.');
      throw new Error(`Invalid device token format. Expected real FCM token (150+ chars), got: ${deviceToken.substring(0, 50)}...`);
    }

    const accessToken = await getAccessToken();
    const key = getServiceAccountKey();
    const projectId = key.project_id;

    console.log(`📤 Sending notification to device: ${deviceToken.substring(0, 20)}...`);

    const notificationPayload = {
      message: {
        token: deviceToken,
        notification: {
          title: heading,
          body: message
        },
        data: {
          actionType: data.actionType || 'home',
          actionData: JSON.stringify(data.actionData || {}),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...data
        },
        webpush: {
          fcmOptions: {
            link: '/'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: heading,
                body: message
              },
              sound: 'default',
              'content-available': 1,
              badge: 1
            }
          }
        },
        android: {
          priority: 'high',
          notification: {
            title: heading,
            body: message,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'default'
          }
        }
      }
    };

    const response = await axios.post(
      `${FCM_API_URL}/${projectId}/messages:send`,
      notificationPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Push notification sent successfully to FCM:', response.data.name);
    return {
      success: true,
      messageId: response.data.name,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
    if (error.response?.data) {
      console.error('❌ FCM Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status === 400) {
      console.error('⚠️  Invalid device token or malformed request. Please check:');
      console.error('   1. Device token is valid (150+ characters)');
      console.error('   2. Device has registered for notifications');
      console.error('   3. Firebase project ID is correct');
    }
    return {
      success: false,
      error: error.message,
      details: error.response?.data,
      timestamp: new Date()
    };
  }
}

/**
 * Send push notification to multiple device tokens
 * @param {array} deviceTokens - Array of FCM device tokens
 * @param {string} heading - Notification heading
 * @param {string} message - Notification message
 * @param {object} data - Additional data to include in notification
 */
async function sendMultipleNotifications(deviceTokens, heading, message, data = {}) {
  try {
    const results = [];

    for (const token of deviceTokens) {
      const result = await sendNotification(token, heading, message, data);
      results.push({
        token,
        ...result
      });
    }

    return {
      success: true,
      totalTokens: deviceTokens.length,
      successfulSends: results.filter(r => r.success).length,
      failedSends: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Error sending multiple notifications:', error.message);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}

/**
 * Subscribe a user to a topic
 * @param {string} deviceToken - The FCM device token
 * @param {string} topic - Topic name (e.g., 'seller-maryam', 'all-users')
 */
async function subscribeToTopic(deviceToken, topic) {
  try {
    if (!deviceToken || !topic) {
      throw new Error('Device token and topic are required');
    }

    const accessToken = await getAccessToken();
    const projectId = SERVICE_ACCOUNT_KEY.project_id;

    const response = await axios.post(
      `${FCM_API_URL}/${projectId}/messages:send`,
      {
        message: {
          token: deviceToken,
          webpush: {
            fcmOptions: {
              analyticsLabel: `subscribe_${topic}`
            }
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Device subscribed to topic '${topic}':`, response.data.name);
    return {
      success: true,
      topic,
      messageId: response.data.name
    };
  } catch (error) {
    console.error(`Error subscribing to topic '${topic}':`, error.message);
    return {
      success: false,
      topic,
      error: error.message
    };
  }
}

/**
 * Send notification to all subscribers of a topic
 * @param {string} topic - Topic name
 * @param {string} heading - Notification heading
 * @param {string} message - Notification message
 * @param {object} data - Additional data
 */
async function sendTopicNotification(topic, heading, message, data = {}) {
  try {
    if (!topic) {
      throw new Error('Topic is required');
    }

    const accessToken = await getAccessToken();
    const projectId = SERVICE_ACCOUNT_KEY.project_id;

    const notificationPayload = {
      message: {
        topic,
        notification: {
          title: heading,
          body: message
        },
        data: {
          actionType: data.actionType || 'home',
          actionData: JSON.stringify(data.actionData || {}),
          ...data
        },
        webpush: {
          fcmOptions: {
            link: '/'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: heading,
                body: message
              },
              sound: 'default'
            }
          }
        },
        android: {
          priority: 'high',
          notification: {
            title: heading,
            body: message,
            sound: 'default'
          }
        }
      }
    };

    const response = await axios.post(
      `${FCM_API_URL}/${projectId}/messages:send`,
      notificationPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Topic notification sent to '${topic}':`, response.data.name);
    return {
      success: true,
      topic,
      messageId: response.data.name,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`Error sending topic notification to '${topic}':`, error.message);
    return {
      success: false,
      topic,
      error: error.message,
      timestamp: new Date()
    };
  }
}

module.exports = {
  sendNotification,
  sendMultipleNotifications,
  subscribeToTopic,
  sendTopicNotification,
  getAccessToken
};

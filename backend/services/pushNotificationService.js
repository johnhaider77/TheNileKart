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

    return accessToken;
  } catch (error) {
    console.error('Error getting Firebase access token:', error.message);
    throw new Error('Failed to authenticate with Firebase Cloud Messaging');
  }
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

    const accessToken = await getAccessToken();
    const projectId = SERVICE_ACCOUNT_KEY.project_id;

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
              'content-available': 1
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
        }
      }
    );

    console.log('✅ Push notification sent successfully:', response.data.name);
    return {
      success: true,
      messageId: response.data.name,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
    return {
      success: false,
      error: error.message,
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

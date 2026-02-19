import axios from 'axios';
import { requestNotificationPermissionSync, getTokenAfterPermissionGranted, isNotificationPermissionGranted, setupMessageListener } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Register device token with the server
 */
export const registerDeviceToken = async (deviceToken: string, token: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/push-notifications/register-token`,
      { deviceToken },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
};

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async () => {
  try {
    // Check if browser supports Service Workers and notifications
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return null;
    }

    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return null;
    }

    // Request notification permission
    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Send a push notification to a recipient
 */
export const sendPushNotification = async (recipientUserId: number, heading: string, message: string, actionType: string = 'home', actionData: any = {}, token: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/push-notifications/send`,
      {
        recipientUserId,
        heading,
        message,
        actionType,
        actionData
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send bulk push notifications
 */
export const sendBulkPushNotifications = async (recipientUserIds: number[], heading: string, message: string, actionType: string = 'home', actionData: any = {}, token: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/push-notifications/send-bulk`,
      {
        recipientUserIds,
        heading,
        message,
        actionType,
        actionData
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    throw error;
  }
};

/**
 * Get notification history
 */
export const getNotificationHistory = async (limit: number = 20, offset: number = 0, token: string) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/push-notifications/history?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching notification history:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: number, token: string) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/push-notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (token: string) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/push-notifications/unread/count`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    throw error;
  }
};

/**
 * Request notification permission immediately (must be called from user event - form submit button)
 * This is separated from setupPushNotifications to ensure it's called in user event context
 */
export const requestNotificationPermissionImmediately = async () => {
  try {
    console.log('🔔 Requesting notification permission...');
    await requestNotificationPermissionSync();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
};

/**
 * Setup push notification handling
 * This should be called when user logs in
 * Gets FCM token and registers it with backend after permission is granted
 */
export const setupPushNotifications = async (token: string) => {
  try {
    console.log('🔔 Setting up push notifications...');

    // Only attempt to get FCM token if permission is already granted
    // Permission can only be requested in user event context (during login form submission)
    if (!isNotificationPermissionGranted()) {
      console.log('⏳ Notification permission not yet granted. It will be requested on next login.');
      return false;
    }

    // Get FCM token after permission is granted (async)
    // Wait to ensure permission state is fully updated
    try {
      const fcmToken = await getTokenAfterPermissionGranted();
      
      if (fcmToken) {
        // Register the FCM token with backend
        await registerDeviceToken(fcmToken, token);
        localStorage.setItem('fcm_token', fcmToken);

        // Set up listener for incoming messages (foreground)
        setupMessageListener((payload) => {
          console.log('📬 Incoming notification:', payload);
          // You can handle notification here - show toast, update UI, etc.
        });

        console.log('✅ Push notifications setup complete');
      } else {
        console.log('⚠️ Could not get FCM token');
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
    }

    return true;
  } catch (error) {
    console.error('❌ Error setting up push notifications:', error);
    return false;
  }
};

/**
 * Handle incoming push notification
 * This should be called when a notification is received
 */
export const handlePushNotificationClick = (actionType: string, actionData: any) => {
  console.log('Notification clicked:', { actionType, actionData });
  
  switch (actionType) {
    case 'home':
      window.location.href = '/';
      break;
    case 'product':
      if (actionData?.productId) {
        window.location.href = `/product/${actionData.productId}`;
      } else {
        window.location.href = '/';
      }
      break;
    case 'order':
      if (actionData?.orderId) {
        window.location.href = `/orders/${actionData.orderId}`;
      } else {
        window.location.href = '/orders';
      }
      break;
    case 'seller':
      window.location.href = '/seller/dashboard';
      break;
    default:
      window.location.href = '/';
      break;
  }
};

export default {
  registerDeviceToken,
  requestNotificationPermission,
  sendPushNotification,
  sendBulkPushNotifications,
  getNotificationHistory,
  markNotificationAsRead,
  getUnreadNotificationCount,
  setupPushNotifications,
  handlePushNotificationClick
};

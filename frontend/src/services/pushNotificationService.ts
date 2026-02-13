import axios from 'axios';

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
 * Setup push notification handling
 * This should be called when user logs in
 */
export const setupPushNotifications = async (token: string) => {
  try {
    // Check if already registered
    const storedToken = localStorage.getItem('fcm_token');
    
    // Request permission (if not already given)
    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission) {
      // In a real app with Firebase, you would get the FCM token here
      // For now, we'll generate a device ID
      let deviceToken = localStorage.getItem('device_token');
      
      if (!deviceToken) {
        // Generate a unique device token
        deviceToken = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('device_token', deviceToken);
      }
      
      // Register the token
      await registerDeviceToken(deviceToken, token);
      localStorage.setItem('fcm_token', deviceToken);
      
      console.log('✅ Push notifications setup complete');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
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

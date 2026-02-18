import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration from the console
const firebaseConfig = {
  apiKey: 'AIzaSyDTpmbqzFCA2C_BHXtq7jjmW7i_-LZ16c',
  authDomain: 'thenilekart-4e16d.firebaseapp.com',
  projectId: 'thenilekart-4e16d',
  storageBucket: 'thenilekart-4e1d.firebasestorage.app',
  messagingSenderId: '239492826254',
  appId: '1:23494928626254:web:2a8a968ec5e1f7d287f5df',
  measurementId: 'G-SC5493G7QT'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

/**
 * Get the FCM token for this device
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'BDHe-ZfXaPsVn9P7s1Q_pR8Zt9K2M3L4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I'
    });
    
    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

/**
 * Request notification permission SYNCHRONOUSLY (must be called from user event handler)
 */
export const requestNotificationPermissionSync = (): boolean => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('⚠️ This browser does not support notifications');
      return false;
    }

    // Check if Service Workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers are not supported');
      return false;
    }

    // Request permission synchronously (must be called in user event handler)
    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      // Call requestPermission synchronously - this will show the popup
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Notification permission granted by user');
        } else {
          console.log('❌ Notification permission denied by user');
        }
      }).catch(error => {
        console.error('Error requesting notification permission:', error);
      });
      return true; // Permission popup was shown
    }

    console.log('⚠️ Notification permission was previously denied');
    return false;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token asynchronously (only call after permission is granted)
 */
export const getTokenAfterPermissionGranted = async (): Promise<string | null> => {
  try {
    // Wait a bit for permission to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (Notification.permission === 'granted') {
      const token = await getFCMToken();
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting token after permission:', error);
    return null;
  }
};

/**
 * Set up listener for incoming messages
 */
export const setupMessageListener = (callback: (payload: any) => void) => {
  try {
    onMessage(messaging, (payload) => {
      console.log('📨 Message received in foreground:', payload);
      
      // Handle notification data
      if (payload.notification) {
        callback({
          title: payload.notification.title,
          body: payload.notification.body,
          icon: payload.notification.icon,
          data: payload.data
        });
      }

      // Also display browser notification if in foreground
      if (payload.notification) {
        new Notification(payload.notification.title || 'Notification', {
          body: payload.notification.body,
          icon: payload.notification.icon || '/logo192.png',
          tag: 'push-notification',
          requireInteraction: false
        });
      }
    });
  } catch (error) {
    console.error('❌ Error setting up message listener:', error);
  }
};

export { messaging };
export default app;

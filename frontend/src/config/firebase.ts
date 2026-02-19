import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration from the console
const firebaseConfig = {
  apiKey: 'AIzaSyDTpmbpaZrcA2C_BHXtq7jJWN7I_-LZiGc',
  authDomain: 'thenilekart-4e16d.firebaseapp.com',
  projectId: 'thenilekart-4e16d',
  storageBucket: 'thenilekart-4e16d.firebasestorage.app',
  messagingSenderId: '239492826254',
  appId: '1:239492826254:web:2a8a968ec5e1f7d287f5df',
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
    // Try to get FCM token with VAPID key
    const token = await getToken(messaging, {
      vapidKey: 'BJBZcbtUIYtfF0kW5mgktIHilKxuuRx_FPDoGaE_ndytmBC3DTbFFzUp4ovTx30DOlAKb3C0fvlwj7XquNpPkKk'
    });
    
    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error: any) {
    // Check if it's a VAPID key error
    if (error?.message?.includes('ECDSA') || error?.message?.includes('vapid')) {
      console.warn('⚠️ VAPID key not configured. Please add your Firebase VAPID key to firebase.ts');
      console.log('📝 To get your VAPID key: Firebase Console → Cloud Messaging → Web Push certificates');
      return null;
    }
    
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};;

/**
 * Request notification permission SYNCHRONOUSLY (must be called from user event handler)
 * Returns a promise that resolves when permission is granted or denied
 */
export const requestNotificationPermissionSync = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('⚠️ This browser does not support notifications');
        resolve(false);
        return;
      }

      // Check if Service Workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Workers are not supported');
        resolve(false);
        return;
      }

      // Check if permission already granted
      if (Notification.permission === 'granted') {
        console.log('✅ Notification permission already granted');
        resolve(true);
        return;
      }

      // If permission was already denied, don't ask again
      if (Notification.permission === 'denied') {
        console.log('⚠️ Notification permission was previously denied');
        resolve(false);
        return;
      }

      // Request permission - show the popup
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Notification permission granted by user');
          resolve(true);
        } else {
          console.log('❌ Notification permission denied by user');
          resolve(false);
        }
      }).catch(error => {
        console.error('Error requesting notification permission:', error);
        resolve(false);
      });
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      resolve(false);
    }
  });
};

/**
 * Check if notification permission is already granted (without requesting)
 */
export const isNotificationPermissionGranted = (): boolean => {
  try {
    if (!('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token asynchronously (only call after permission is granted)
 */
export const getTokenAfterPermissionGranted = async (): Promise<string | null> => {
  try {
    // Check permission is granted
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return null;
    }

    // Wait for permission state to fully update
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Try to get FCM token
    const token = await getFCMToken();
    return token;
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

      // Display browser notification if in foreground
      if (payload.notification) {
        try {
          // Check if notification permission is granted
          if (Notification.permission === 'granted') {
            const notificationTitle = payload.notification.title || 'TheNileKart Notification';
            const notificationOptions = {
              body: payload.notification.body || '',
              icon: payload.notification.icon || '/logo192.png',
              badge: '/logo192.png',
              tag: 'push-notification-' + Date.now(),
              requireInteraction: false,
              data: payload.data || {}
            };

            // Show notification via Notification API
            const notification = new Notification(notificationTitle, notificationOptions);
            console.log('✅ Foreground notification displayed:', notificationTitle);

            // Handle notification click
            notification.onclick = () => {
              console.log('🔔 User clicked notification');
              window.focus();
              notification.close();
            };
          } else {
            console.warn('⚠️ Notification permission not granted, cannot display foreground notification');
          }
        } catch (notificationError) {
          console.error('❌ Error displaying foreground notification:', notificationError);
        }
      }
    });
    console.log('✅ Message listener setup complete');
  } catch (error) {
    console.error('❌ Error setting up message listener:', error);
  }
};

export { messaging };
export default app;

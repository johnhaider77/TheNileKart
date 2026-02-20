// Firebase Cloud Messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: 'AIzaSyDTpmbpaZrcA2C_BHXtq7jJWN7I_-LZiGc',
  authDomain: 'thenilekart-4e16d.firebaseapp.com',
  projectId: 'thenilekart-4e16d',
  storageBucket: 'thenilekart-4e16d.firebasestorage.app',
  messagingSenderId: '239492826254',
  appId: '1:239492826254:web:2a8a968ec5e1f7d287f5df',
  measurementId: 'G-SC5493G7QT'
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages - these are shown when app is not in focus
messaging.onBackgroundMessage(function(payload) {
  console.log('📨 Background message received (tab inactive/closed):', payload);
  console.log('📬 This notification will be shown as push notification in system tray');

  try {
    const notificationTitle = payload.notification?.title || 'TheNileKart Notification';
    const notificationBody = payload.notification?.body || 'You have a new notification from TheNileKart';
    const notificationIcon = payload.notification?.icon || '/logo192.png';

    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,
      badge: '/logo192.png',
      tag: 'thenilekart-' + Date.now(), // Unique tag for each notification
      requireInteraction: true, // Keep notification visible until user acts
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      data: {
        actionUrl: payload.data?.actionUrl || '/',
        timestamp: new Date().toISOString(),
        ...payload.data
      }
    };

    console.log('✅ Showing background notification:', { title: notificationTitle, options: notificationOptions });

    // Show notification - this appears in system tray even when tab is closed
    return self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error('❌ Error showing background notification:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('🔔 Notification clicked:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.actionUrl || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Firebase Cloud Messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: 'AIzaSyDTpmbqzFCA2C_BHXtq7jjmW7i_-LZ16c',
  authDomain: 'thenilekart-4e16d.firebaseapp.com',
  projectId: 'thenilekart-4e16d',
  storageBucket: 'thenilekart-4e1d.firebasestorage.app',
  messagingSenderId: '239492826254',
  appId: '1:23494928626254:web:2a8a968ec5e1f7d287f5df',
  measurementId: 'G-SC5493G7QT'
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('📨 Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'TheNileKart';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: 'push-notification',
    requireInteraction: false,
    data: payload.data || {}
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
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

// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCshE8btNDsMW4LHCQ2Owup5YC8BszJPfg",
  authDomain: "viaggiostyle-5977a.firebaseapp.com",
  projectId: "viaggiostyle-5977a",
  storageBucket: "viaggiostyle-5977a.firebasestorage.app",
  messagingSenderId: "96185700264",
  appId: "1:96185700264:web:afba72e65d5884f711579d"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const data = payload.data || {};
  const notificationTitle = payload.notification?.title || 'ViaggioStyle';
  
  // Build body with formatted data if available
  let body = payload.notification?.body || '';
  
  const notificationOptions = {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    data: {
      url: data.url || '/control',
      ...data
    },
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click - redirect to admin panel
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  event.notification.close();
  
  // Always redirect to /control (admin panel)
  const urlToOpen = event.notification.data?.url || '/control';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open with the target URL
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

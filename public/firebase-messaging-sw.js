// Firebase Cloud Messaging Service Worker - ViaggioStyle
// Reset: 2026-01-25

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCshE8btNDsMW4LHCQ2Owup5YC8BszJPfg",
  authDomain: "viaggiostyle-5977a.firebaseapp.com",
  projectId: "viaggiostyle-5977a",
  storageBucket: "viaggiostyle-5977a.firebasestorage.app",
  messagingSenderId: "96185700264",
  appId: "1:96185700264:web:afba72e65d5884f711579d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages - show as system notification
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  // Get notification data from either notification object or data object
  const notification = payload.notification || {};
  const data = payload.data || {};
  
  const title = notification.title || data.title || 'ViaggioStyle';
  const body = notification.body || data.body || 'Nueva notificación';
  
  const options = {
    body: body,
    icon: 'https://vsbarber.lovable.app/vs-icon-192.png',
    badge: 'https://vsbarber.lovable.app/vs-badge-96.png',
    tag: data.tag || 'vs-notification',
    data: { url: data.url || '/control' },
    // Vibration pattern for system alert feel
    vibrate: [300, 100, 300, 100, 300],
    // Keep notification visible until user interacts
    requireInteraction: true,
    // Sound and visual settings
    silent: false,
    renotify: true,
    // Timestamp for ordering
    timestamp: Date.now()
  };
  
  console.log('[SW] Showing notification:', title, options);
  
  return self.registration.showNotification(title, options);
});

// Push event handler removed - onBackgroundMessage handles everything
// This prevents duplicate notifications

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const url = event.notification.data?.url || '/control';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Service worker lifecycle
self.addEventListener('install', () => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const data = payload.data || {};
  const notification = payload.notification || {};
  
  const title = data.title || notification.title || 'ViaggioStyle';
  const body = data.body || notification.body || 'Nueva notificación';
  
  const options = {
    body: body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'vs-notification',
    data: { url: data.url || '/control' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true
  };
  
  return self.registration.showNotification(title, options);
});

// Handle push events directly (fallback)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }
  
  event.waitUntil(
    (async () => {
      try {
        const payload = event.data.json();
        console.log('[SW] Push payload:', payload);
        
        const data = payload.data || {};
        const notification = payload.notification || {};
        
        const title = data.title || notification.title || 'ViaggioStyle';
        const body = data.body || notification.body || 'Nueva notificación';
        
        await self.registration.showNotification(title, {
          body: body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: data.tag || 'vs-notification',
          data: { url: data.url || '/control' },
          vibrate: [200, 100, 200],
          requireInteraction: true,
          renotify: true
        });
      } catch (error) {
        console.error('[SW] Error handling push:', error);
        // Fallback notification
        await self.registration.showNotification('ViaggioStyle', {
          body: 'Nueva notificación',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'vs-fallback'
        });
      }
    })()
  );
});

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

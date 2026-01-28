// Firebase Cloud Messaging Service Worker - ViaggioStyle
// Optimized for Android 13+ (Motorola G32)
// Updated: 2026-01-28

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

// Handle background messages - optimized for Android 13
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', JSON.stringify(payload));
  
  // Extract notification data
  const notification = payload.notification || {};
  const data = payload.data || {};
  
  const title = notification.title || data.title || 'ViaggioStyle';
  const body = notification.body || data.body || 'Nueva notificación';
  
  // Android 13+ optimized notification options
  const options = {
    body: body,
    icon: '/vs-icon-192.png',
    badge: '/vs-badge-96.png',
    tag: data.tag || `vs-${Date.now()}`, // Unique tag to prevent grouping issues
    data: { 
      url: data.url || '/control',
      timestamp: Date.now()
    },
    // Critical for Android 13
    vibrate: [100, 50, 100, 50, 100, 50, 200],
    requireInteraction: true,
    renotify: true,
    silent: false,
    // Actions for quick response
    actions: [
      {
        action: 'open',
        title: 'Ver'
      }
    ]
  };
  
  console.log('[SW] Showing notification:', title);
  
  return self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  const url = event.notification.data?.url || '/control';
  const fullUrl = self.location.origin + url;
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Try to focus existing window
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // Open new window if none exists
      return clients.openWindow(fullUrl);
    })
  );
});

// Handle push event directly for maximum compatibility
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }
  
  try {
    const payload = event.data.json();
    console.log('[SW] Push payload:', JSON.stringify(payload));
    
    // Only show notification if onBackgroundMessage didn't handle it
    // This is a fallback for edge cases
    if (!payload.notification && payload.data) {
      const title = payload.data.title || 'ViaggioStyle';
      const body = payload.data.body || 'Nueva notificación';
      
      event.waitUntil(
        self.registration.showNotification(title, {
          body: body,
          icon: '/vs-icon-192.png',
          badge: '/vs-badge-96.png',
          tag: `vs-push-${Date.now()}`,
          data: { url: payload.data.url || '/control' },
          vibrate: [100, 50, 100, 50, 100],
          requireInteraction: true,
          renotify: true
        })
      );
    }
  } catch (e) {
    console.error('[SW] Error processing push:', e);
  }
});

// Service worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches if any
      caches.keys().then(keys => 
        Promise.all(keys.map(key => caches.delete(key)))
      )
    ])
  );
});

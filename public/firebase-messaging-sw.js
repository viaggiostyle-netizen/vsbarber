// Firebase Messaging Service Worker
// Keep firebase SDK version aligned with app dependency to avoid background delivery issues.
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

let firebaseReady = false;

try {
  firebase.initializeApp({
    apiKey: "AIzaSyCshE8btNDsMW4LHCQ2Owup5YC8BszJPfg",
    authDomain: "viaggiostyle-5977a.firebaseapp.com",
    projectId: "viaggiostyle-5977a",
    storageBucket: "viaggiostyle-5977a.firebasestorage.app",
    messagingSenderId: "96185700264",
    appId: "1:96185700264:web:afba72e65d5884f711579d"
  });

  firebaseReady = true;
} catch (e) {
  console.error('[firebase-messaging-sw.js] Firebase init failed:', e);
}

const messaging = firebaseReady ? firebase.messaging() : null;

// CRITICAL: Handle ALL push events with event.waitUntil() to prevent Android 13 
// from showing "Este sitio se actualizó en segundo plano" message.
// This MUST resolve a showNotification() promise before the event terminates.
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');
  
  // Always wrap in waitUntil to keep SW alive until notification is shown
  event.waitUntil(
    (async () => {
      try {
        let payload = null;
        try {
          payload = event.data?.json?.() ?? null;
        } catch (e) {
          console.log('[firebase-messaging-sw.js] Could not parse payload as JSON');
        }
        
        console.log('[firebase-messaging-sw.js] Payload:', JSON.stringify(payload));
        
        // Extract data from either data-only or notification payload
        const data = payload?.data || {};
        const notification = payload?.notification || {};
        
        // Build notification content with fallbacks
        const title = data.title || notification.title || 'ViaggioStyle';
        const body = data.body || notification.body || 'Nueva notificación';
        
        console.log('[firebase-messaging-sw.js] Showing notification:', title, body);
        
        // Always show notification - this is critical for Android 13
        return self.registration.showNotification(title, {
          body: body,
          icon: '/vs-logo.png',
          badge: '/vs-logo.png',
          tag: data.tag || 'vs-notification',
          data: { 
            url: data.url || '/control',
            ...data 
          },
          requireInteraction: true,
          vibrate: [200, 100, 200],
          renotify: true
        });
      } catch (e) {
        console.error('[firebase-messaging-sw.js] Push handler error:', e);
        // Even on error, show a fallback notification to prevent generic message
        return self.registration.showNotification('ViaggioStyle', {
          body: 'Nueva notificación',
          icon: '/vs-logo.png',
          badge: '/vs-logo.png',
          tag: 'vs-fallback',
          data: { url: '/control' },
          requireInteraction: true
        });
      }
    })()
  );
});

// Handle Firebase background messages (backup handler)
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] onBackgroundMessage received:', payload);
    
    const data = payload.data || {};
    const title = data.title || 'ViaggioStyle';
    const body = data.body || 'Nueva notificación';
    
    // Show notification from background message
    return self.registration.showNotification(title, {
      body: body,
      icon: '/vs-logo.png',
      badge: '/vs-logo.png',
      tag: data.tag || 'vs-background',
      data: {
        url: data.url || '/control',
        ...data
      },
      requireInteraction: true,
      vibrate: [200, 100, 200],
      renotify: true
    });
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase messaging not available');
}

// Handle notification click - redirect to admin panel
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  event.notification.close();
  
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

// Log service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});

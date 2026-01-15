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

// Always try to display a notification from any push payload.
// Using event.waitUntil() helps prevent Android/Chrome from showing the generic
// "Este sitio se actualizó en segundo plano" message when no notification is displayed.
self.addEventListener('push', (event) => {
  try {
    const payload = event.data?.json?.() ?? null;
    const title = payload?.notification?.title || payload?.data?.title || 'ViaggioStyle';
    const body = payload?.notification?.body || payload?.data?.body || '';

    // If there's nothing meaningful to show, do nothing.
    if (!title && !body) return;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: payload?.data?.icon || '/vs-logo.png',
        badge: payload?.data?.badge || '/vs-logo.png',
        tag: payload?.data?.tag || 'vs-notification',
        data: { url: payload?.data?.url || '/control', ...(payload?.data || {}) },
        requireInteraction: true,
        vibrate: [200, 100, 200],
        renotify: true
      })
    );
  } catch (e) {
    console.error('[firebase-messaging-sw.js] push handler failed:', e);
  }
});

// Handle background messages ONLY (foreground is handled by the app)
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const data = payload.data || {};
    const notificationTitle = data.title || 'ViaggioStyle';
    const body = data.body || '';

    console.log('[firebase-messaging-sw.js] Displaying notification:', notificationTitle, body);

    const notificationOptions = {
      body: body,
      icon: data.icon || '/vs-logo.png',
      badge: data.badge || '/vs-logo.png',
      tag: data.tag || 'vs-notification',
      data: {
        url: data.url || '/control',
        ...data
      },
      requireInteraction: true,
      vibrate: [200, 100, 200],
      renotify: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase messaging not available; using push fallback only');
}

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

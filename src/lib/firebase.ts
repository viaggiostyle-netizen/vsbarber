import { initializeApp } from "firebase/app";
import { getMessaging, getToken, deleteToken, onMessage, Messaging } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCshE8btNDsMW4LHCQ2Owup5YC8BszJPfg",
  authDomain: "viaggiostyle-5977a.firebaseapp.com",
  projectId: "viaggiostyle-5977a",
  storageBucket: "viaggiostyle-5977a.firebasestorage.app",
  messagingSenderId: "96185700264",
  appId: "1:96185700264:web:afba72e65d5884f711579d"
};

// VAPID key from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = "BP-KxciWQ2dXoHqsdsQ4k3VtcQcyo62cHY_AiM1RyUE3LI7cKWZUqztjqsYWxHcbQdwqYXid9R3axgUZAJXSd2I";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Get messaging instance
export const getMessagingInstance = (): Messaging | null => {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return null;
  }
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error("Error initializing messaging:", error);
      return null;
    }
  }
  return messaging;
};

// Register service worker and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    console.log("📱 Solicitando permiso de notificaciones...");
    
    // Request permission
    const permission = await Notification.requestPermission();
    console.log("📱 Permiso de notificaciones:", permission);
    
    if (permission !== "granted") {
      console.log("❌ Permiso denegado");
      return null;
    }

    // Unregister old service workers first to ensure clean state
    const existingRegs = await navigator.serviceWorker.getRegistrations();
    for (const reg of existingRegs) {
      if (reg.active?.scriptURL.includes("firebase-messaging-sw.js")) {
        console.log("🔄 Actualizando Service Worker existente...");
        await reg.update();
      }
    }

    // Register service worker
    console.log("📱 Registrando Service Worker...");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/"
    });
    console.log("✅ Service Worker registrado:", registration.scope);

    // Wait for service worker to be active
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', function() {
          if (this.state === 'activated') resolve();
        });
      });
    }

    await navigator.serviceWorker.ready;
    console.log("✅ Service Worker listo");

    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      console.error("❌ Messaging no disponible");
      return null;
    }

    // Get FCM token with retry
    let token: string | null = null;
    let attempts = 0;
    
    while (!token && attempts < 3) {
      try {
        attempts++;
        console.log(`📱 Obteniendo token FCM (intento ${attempts})...`);
        token = await getToken(messagingInstance, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
      } catch (err) {
        console.error(`❌ Error en intento ${attempts}:`, err);
        if (attempts < 3) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    if (token) {
      console.log("✅ Token FCM obtenido:", token.substring(0, 30) + "...");
    } else {
      console.error("❌ No se pudo obtener token FCM después de 3 intentos");
    }
    
    return token;
  } catch (error) {
    console.error("❌ Error en requestNotificationPermission:", error);
    return null;
  }
};

// Get existing token without prompting
export const getExistingFcmToken = async (): Promise<string | null> => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return null;
    if (Notification.permission !== "granted") return null;

    const registrations = await navigator.serviceWorker.getRegistrations();
    const swRegistration = registrations.find(r => r.active?.scriptURL.includes("firebase-messaging-sw.js"));
    
    if (!swRegistration) {
      // Register if not found
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      
      const messagingInstance = getMessagingInstance();
      if (!messagingInstance) return null;
      
      return await getToken(messagingInstance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    }

    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) return null;

    return await getToken(messagingInstance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });
  } catch (error) {
    console.error("Error getting existing token:", error);
    return null;
  }
};

// Delete FCM token
export const deleteCurrentFcmToken = async (): Promise<boolean> => {
  try {
    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) return false;
    return await deleteToken(messagingInstance);
  } catch (error) {
    console.error("Error deleting token:", error);
    return false;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = getMessagingInstance();
  if (messagingInstance) {
    return onMessage(messagingInstance, callback);
  }
  return () => {};
};

export { app };

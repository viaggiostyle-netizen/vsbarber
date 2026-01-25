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
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/"
    });
    console.log("Service worker registered:", registration.scope);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) {
      console.error("Messaging not available");
      return null;
    }

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    console.log("FCM Token obtained:", token ? token.substring(0, 20) + "..." : "none");
    return token || null;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
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

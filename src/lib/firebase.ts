import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCshE8btNDsMW4LHCQ2Owup5YC8BszJPfg",
  authDomain: "viaggiostyle-5977a.firebaseapp.com",
  projectId: "viaggiostyle-5977a",
  storageBucket: "viaggiostyle-5977a.firebasestorage.app",
  messagingSenderId: "96185700264",
  appId: "1:96185700264:web:afba72e65d5884f711579d"
};

const VAPID_KEY = "BP-KxciWQ2dXoHqsdsQ4k3VtcQcyo62cHY_AiM1RyUE3LI7cKWZUqztjqsYWxHcbQdwqYXid9R3axgUZAJXSd2I";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Get messaging instance (only in browser with service worker support)
export const getMessagingInstance = (): Messaging | null => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    if (!messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  }
  return null;
};

// Internal helper to register SW and fetch a token (assumes permission is already granted)
const fetchFcmToken = async (): Promise<string | null> => {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) {
    console.log("Messaging not supported");
    return null;
  }

  // Register service worker (idempotent)
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  const token = await getToken(messagingInstance, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  console.log("FCM Token:", token);
  return token || null;
};

// Request permission (if needed) and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    return await fetchFcmToken();
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Get token without prompting (only works if permission is already granted)
export const getExistingFcmToken = async (): Promise<string | null> => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return null;
    if (Notification.permission !== "granted") return null;

    return await fetchFcmToken();
  } catch (error) {
    console.error("Error getting existing FCM token:", error);
    return null;
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

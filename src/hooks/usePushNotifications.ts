import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Check if already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if ("Notification" in window) {
        setIsSubscribed(Notification.permission === "granted");
      }
    };
    checkSubscription();
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground message received:", payload);
      toast(payload.notification?.title || "Nueva notificación", {
        description: payload.notification?.body,
      });
    });
    return unsubscribe;
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      
      if (!fcmToken) {
        toast.error("No se pudo obtener el permiso de notificaciones");
        return false;
      }

      // Save token to database
      const { error } = await supabase
        .from("fcm_tokens")
        .upsert(
          { 
            token: fcmToken, 
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          },
          { onConflict: "token" }
        );

      if (error) {
        console.error("Error saving FCM token:", error);
        toast.error("Error al guardar el token de notificaciones");
        return false;
      }

      setToken(fcmToken);
      setIsSubscribed(true);
      toast.success("¡Notificaciones activadas!");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Error al activar notificaciones");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSubscribed,
    isLoading,
    token,
    subscribe,
  };
};

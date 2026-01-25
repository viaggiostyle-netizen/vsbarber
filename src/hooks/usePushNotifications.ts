import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  requestNotificationPermission,
  onForegroundMessage,
  getExistingFcmToken,
  deleteCurrentFcmToken,
} from "@/lib/firebase";
import { toast } from "sonner";

const STORAGE_KEY = "vs_push_token";

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Save token to database
  const saveToken = async (fcmToken: string) => {
    const { error } = await supabase
      .from("fcm_tokens")
      .upsert(
        {
          token: fcmToken,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      );
    if (error) throw error;
  };

  // Remove token from database
  const removeToken = async (fcmToken: string) => {
    const { error } = await supabase.from("fcm_tokens").delete().eq("token", fcmToken);
    if (error) throw error;
  };

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined" || !("Notification" in window)) return;

      // Check localStorage first
      const storedToken = localStorage.getItem(STORAGE_KEY);
      if (storedToken) {
        setToken(storedToken);
        setIsSubscribed(true);
        // Refresh token in background
        saveToken(storedToken).catch(console.error);
        return;
      }

      // Try to get existing token if permission already granted
      if (Notification.permission === "granted") {
        try {
          const existingToken = await getExistingFcmToken();
          if (existingToken) {
            await saveToken(existingToken);
            localStorage.setItem(STORAGE_KEY, existingToken);
            setToken(existingToken);
            setIsSubscribed(true);
          }
        } catch (error) {
          console.error("Error getting existing token:", error);
        }
      }
    };

    init();
  }, []);

  // Handle foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground message:", payload);
      const title = payload.data?.title || payload.notification?.title || "Notificación";
      const body = payload.data?.body || payload.notification?.body;
      toast(`✂️ ${title}`, { description: body });
    });
    return unsubscribe;
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      
      if (!fcmToken) {
        toast.error("No se pudo activar. Verifica los permisos de notificación.");
        return false;
      }

      await saveToken(fcmToken);
      localStorage.setItem(STORAGE_KEY, fcmToken);
      setToken(fcmToken);
      setIsSubscribed(true);
      toast.success("¡Notificaciones activadas!");
      return true;
    } catch (error) {
      console.error("Subscribe error:", error);
      toast.error("Error al activar notificaciones");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentToken = token || localStorage.getItem(STORAGE_KEY);
      
      if (currentToken) {
        await deleteCurrentFcmToken();
        await removeToken(currentToken);
        localStorage.removeItem(STORAGE_KEY);
      }
      
      setToken(null);
      setIsSubscribed(false);
      toast.success("Notificaciones desactivadas");
      return true;
    } catch (error) {
      console.error("Unsubscribe error:", error);
      toast.error("Error al desactivar notificaciones");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  return {
    isSubscribed,
    isLoading,
    token,
    subscribe,
    unsubscribe,
  };
};

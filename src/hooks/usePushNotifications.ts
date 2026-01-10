import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  requestNotificationPermission,
  onForegroundMessage,
  getExistingFcmToken,
  deleteCurrentFcmToken,
} from "@/lib/firebase";
import { toast } from "sonner";

const STORAGE_KEY = "vs_fcm_token";

const upsertToken = async (fcmToken: string) => {
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

const deleteTokenRow = async (fcmToken: string) => {
  const { error } = await supabase.from("fcm_tokens").delete().eq("token", fcmToken);
  if (error) throw error;
};

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Hydrate subscription state more accurately than just Notification.permission
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined" || !("Notification" in window)) return;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setToken(stored);
        setIsSubscribed(true);
        // Best-effort: ensure backend has it (don’t block UI)
        upsertToken(stored).catch((e) =>
          console.warn("FCM token upsert (stored) failed:", e)
        );
        return;
      }

      // If permission is already granted (common on mobile), try to fetch/register token silently.
      if (Notification.permission === "granted") {
        const existing = await getExistingFcmToken();
        if (existing) {
          try {
            await upsertToken(existing);
            localStorage.setItem(STORAGE_KEY, existing);
            setToken(existing);
            setIsSubscribed(true);
          } catch (e) {
            console.error("Error saving existing FCM token:", e);
            setIsSubscribed(false);
          }
        } else {
          // Permission granted but no token: show as NOT subscribed so user can retry.
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    };

    init();
  }, []);

  // Listen for foreground messages (data-only messages)
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground message received:", payload);
      // Data-only messages have title/body in data, not notification
      const title =
        payload.data?.title || payload.notification?.title || "Nueva notificación";
      const body = payload.data?.body || payload.notification?.body;
      toast(`✂️ ${title}`, {
        description: body,
      });
    });
    return unsubscribe;
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();

      if (!fcmToken) {
        toast.error(
          "No se pudo activar: revisá permisos de notificación y volvé a intentar"
        );
        return false;
      }

      await upsertToken(fcmToken);

      localStorage.setItem(STORAGE_KEY, fcmToken);
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

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = token ?? localStorage.getItem(STORAGE_KEY);
      if (!current) {
        setIsSubscribed(false);
        return true;
      }

      // Best-effort: remove from device/browser first, then backend
      await deleteCurrentFcmToken();
      await deleteTokenRow(current);

      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setIsSubscribed(false);
      toast.success("Notificaciones desactivadas");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
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

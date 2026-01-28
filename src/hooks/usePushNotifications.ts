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

// Parse user agent to get device name - improved for Motorola
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Motorola devices - improved detection
  const motoMatch = ua.match(/moto\s*([^\s;)]+)/i) || ua.match(/XT\d{4}/i);
  if (motoMatch) return `Motorola ${motoMatch[0].replace(/moto\s*/i, '')}`;
  
  // Samsung devices
  const samsungMatch = ua.match(/SM-([A-Z0-9]+)/i);
  if (samsungMatch) return `Samsung ${samsungMatch[1]}`;
  
  // Xiaomi/Redmi/POCO
  const xiaomiMatch = ua.match(/(Redmi|Mi|POCO)[^;)]*/i);
  if (xiaomiMatch) return xiaomiMatch[0].trim();
  
  // Google Pixel
  const pixelMatch = ua.match(/Pixel\s*\d*/i);
  if (pixelMatch) return `Google ${pixelMatch[0]}`;
  
  // Apple devices
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  
  // Generic Android - try to extract model from Build info
  if (/Android/i.test(ua)) {
    // Try to get model from "Build/" pattern
    const buildMatch = ua.match(/;\s*([^;)]+)\s*Build/i);
    if (buildMatch) {
      const model = buildMatch[1].trim();
      // Check if it's a Motorola model code
      if (model.toLowerCase().startsWith('moto')) {
        return `Motorola ${model.replace(/moto\s*/i, '')}`;
      }
      return model;
    }
    return 'Android';
  }
  
  // Desktop browsers
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux PC';
  
  return 'Dispositivo';
}

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');

  // Save token to database with device identification
  const saveToken = async (fcmToken: string): Promise<boolean> => {
    const device = getDeviceName();
    const userAgentWithDevice = `${device} | ${navigator.userAgent}`;
    
    const { error } = await supabase
      .from("fcm_tokens")
      .upsert(
        {
          token: fcmToken,
          user_agent: userAgentWithDevice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      );
    
    if (error) {
      console.error("Error saving token:", error);
      throw error;
    }
    
    setDeviceName(device);
    console.log(`✅ Token guardado para: ${device}`);
    return true;
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
      // Check if notifications are supported
      if (!("Notification" in window)) {
        toast.error("Tu navegador no soporta notificaciones");
        return false;
      }

      // Check current permission status
      const currentPermission = Notification.permission;
      console.log("📱 Estado actual de permisos:", currentPermission);
      
      if (currentPermission === "denied") {
        toast.error("Notificaciones bloqueadas", {
          description: "Activa las notificaciones en Configuración > Apps > Chrome > Notificaciones",
          duration: 8000
        });
        return false;
      }

      console.log("🔔 Iniciando registro de notificaciones...");
      const fcmToken = await requestNotificationPermission();
      
      if (!fcmToken) {
        toast.error("No se pudo activar", {
          description: "Verifica los permisos de notificación en tu dispositivo"
        });
        return false;
      }

      console.log("🔑 Token FCM obtenido, guardando...");
      await saveToken(fcmToken);
      localStorage.setItem(STORAGE_KEY, fcmToken);
      setToken(fcmToken);
      setIsSubscribed(true);
      
      const device = getDeviceName();
      toast.success(`✅ Notificaciones activadas`, {
        description: `Registrado en: ${device}`,
        duration: 5000
      });
      
      return true;
    } catch (error) {
      console.error("Subscribe error:", error);
      toast.error("Error al activar notificaciones", {
        description: error instanceof Error ? error.message : "Intenta de nuevo"
      });
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
    deviceName,
    subscribe,
    unsubscribe,
  };
};

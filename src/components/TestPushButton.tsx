import { useState } from "react";
import { Bell, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TestPushButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<"success" | "error" | null>(null);

  const sendTestNotification = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          title: "🔔 Prueba de notificación",
          body: "Si ves esto, las notificaciones funcionan correctamente!",
          data: { tag: "test", url: "/control" },
          mobileOnly: false // Send to all devices for testing
        }
      });

      if (error) {
        console.error("Error sending test notification:", error);
        toast.error("Error al enviar notificación de prueba");
        setLastResult("error");
        return;
      }

      console.log("Test notification result:", data);
      
      if (data.sent > 0) {
        toast.success(`Notificación enviada a ${data.sent} dispositivo(s)`);
        setLastResult("success");
      } else {
        toast.warning("No hay dispositivos registrados para recibir notificaciones");
        setLastResult("error");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al enviar notificación de prueba");
      setLastResult("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sendTestNotification}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : lastResult === "success" ? (
        <CheckCircle className="h-4 w-4 text-primary" />
      ) : lastResult === "error" ? (
        <XCircle className="h-4 w-4 text-destructive" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      Probar Push
    </Button>
  );
};

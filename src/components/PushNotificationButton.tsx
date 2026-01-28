import { forwardRef } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const { isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  // Don't render if notifications not supported
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (isSubscribed) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={unsubscribe}
        disabled={isLoading}
        title="Desactivar notificaciones"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={subscribe}
      disabled={isLoading}
      title="Activar notificaciones"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <BellOff className="h-5 w-5" />
      )}
    </Button>
  );
});

PushNotificationButton.displayName = "PushNotificationButton";

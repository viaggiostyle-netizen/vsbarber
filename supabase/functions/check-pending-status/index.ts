import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking for pending appointments...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current time in Argentina (UTC-3)
    const now = new Date();
    const argentinaOffset = -3 * 60; // -3 hours in minutes
    const argentinaTime = new Date(now.getTime() + (argentinaOffset - now.getTimezoneOffset()) * 60000);

    // Calculate 1 hour ago
    const oneHourAgo = new Date(argentinaTime.getTime() - 60 * 60 * 1000);

    const today = argentinaTime.toISOString().split("T")[0];
    const currentHour = argentinaTime.getHours();
    const currentMinute = argentinaTime.getMinutes();

    // Format the time 1 hour ago (appointments that should be done by now)
    const checkHour = oneHourAgo.getHours();
    const checkMinuteStart = `${String(checkHour).padStart(2, "0")}:00:00`;
    const checkMinuteEnd = `${String(checkHour).padStart(2, "0")}:59:59`;

    console.log(`Argentina time: ${argentinaTime.toISOString()}`);
    console.log(`Checking for appointments on ${today} between ${checkMinuteStart} and ${checkMinuteEnd}`);

    // Find appointments that:
    // 1. Are from today
    // 2. Their scheduled time was ~1 hour ago
    // 3. Are still in "pendiente" status
    const { data: pendingAppointments, error } = await supabase
      .from("reservas")
      .select("*")
      .eq("fecha", today)
      .eq("estado", "pendiente")
      .gte("hora", checkMinuteStart)
      .lte("hora", checkMinuteEnd);

    if (error) {
      console.error("Error fetching appointments:", error);
      throw error;
    }

    console.log(`Found ${pendingAppointments?.length || 0} pending appointments to remind`);

    if (pendingAppointments && pendingAppointments.length > 0) {
      // Send push notification for each pending appointment
      for (const appointment of pendingAppointments) {
        const horaFormateada = appointment.hora.substring(0, 5);

        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              title: "⏰ Recordatorio de cierre",
              body: `${appointment.nombre} (${horaFormateada}) sigue pendiente. ¿Cómo terminó el corte?`,
              mobileOnly: true,
              data: { url: "/control", tag: "pending-reminder" },
            }),
          });

          console.log(`Reminder sent for appointment: ${appointment.nombre} at ${horaFormateada}`);
        } catch (pushError) {
          console.error(`Error sending push for ${appointment.nombre}:`, pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: pendingAppointments?.length || 0,
        timestamp: argentinaTime.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-pending-status:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

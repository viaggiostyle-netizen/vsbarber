import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModifyRequest {
  reserva_id: string;
  email: string;
  new_fecha: string;
  new_hora: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reserva_id, email, new_fecha, new_hora }: ModifyRequest = await req.json();

    // Validate input
    if (!reserva_id || !email || !new_fecha || !new_hora) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the reservation exists and belongs to this email
    const { data: reserva, error: fetchError } = await supabase
      .from("reservas")
      .select("*")
      .eq("id", reserva_id)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching reservation:", fetchError);
      return new Response(
        JSON.stringify({ error: "Error al buscar la reserva" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!reserva) {
      return new Response(
        JSON.stringify({ error: "No se encontró la reserva o el email no coincide" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if the new slot is already booked
    const { data: existingReserva, error: checkReservaError } = await supabase
      .from("reservas")
      .select("id")
      .eq("fecha", new_fecha)
      .eq("hora", new_hora)
      .neq("id", reserva_id) // Exclude current reservation
      .maybeSingle();

    if (checkReservaError) {
      console.error("Error checking reservation availability:", checkReservaError);
      return new Response(
        JSON.stringify({ error: "Error al verificar disponibilidad" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (existingReserva) {
      return new Response(
        JSON.stringify({ error: "Este horario ya está reservado. Por favor, elige otro." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if the new slot is blocked
    const { data: blockedHour, error: checkBlockedError } = await supabase
      .from("blocked_hours")
      .select("id")
      .eq("fecha", new_fecha)
      .eq("hora", new_hora)
      .maybeSingle();

    if (checkBlockedError) {
      console.error("Error checking blocked hours:", checkBlockedError);
      return new Response(
        JSON.stringify({ error: "Error al verificar disponibilidad" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (blockedHour) {
      return new Response(
        JSON.stringify({ error: "Este horario no está disponible. Por favor, elige otro." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Store old date/time for notification
    const oldFecha = reserva.fecha;
    const oldHora = reserva.hora;

    // Update the reservation with new date/time
    const { error: updateError } = await supabase
      .from("reservas")
      .update({
        fecha: new_fecha,
        hora: new_hora,
      })
      .eq("id", reserva_id);

    if (updateError) {
      console.error("Error updating reservation:", updateError);
      return new Response(
        JSON.stringify({ error: "Error al modificar la reserva" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Reservation ${reserva_id} modified: ${oldFecha} ${oldHora} -> ${new_fecha} ${new_hora}`);

    // Format dates for notifications
    const oldFechaObj = new Date(oldFecha);
    const newFechaObj = new Date(new_fecha);
    
    const formatDate = (d: Date) => {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      return `${dia}/${mes}`;
    };
    
    const oldFechaCorta = formatDate(oldFechaObj);
    const newFechaCorta = formatDate(newFechaObj);

    // Send push notification to admin (mobile only)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          title: "¡Cita modificada!",
          body: `${reserva.nombre} ha modificado su cita`,
          mobileOnly: true,
          data: { 
            url: "/control", 
            tag: "modification",
            oldFecha: oldFechaCorta,
            oldHora: oldHora.substring(0, 5),
            newFecha: newFechaCorta,
            newHora: new_hora.substring(0, 5)
          }
        }),
      });
      console.log("Push notification sent to mobile");
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
    }

    // Send email notification to admin
    if (RESEND_API_KEY) {
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const oldFechaFormateada = oldFechaObj.toLocaleDateString('es-ES', options);
      const newFechaFormateada = newFechaObj.toLocaleDateString('es-ES', options);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ViaggioStyle <onboarding@resend.dev>",
          to: ["viaggiostyle@gmail.com"],
          subject: `Reserva Modificada - ${reserva.nombre}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">📝 Reserva Modificada</h1>
              
              <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h2 style="margin-top: 0; color: #555;">Detalles del Cliente</h2>
                <p><strong>Nombre:</strong> ${reserva.nombre}</p>
                <p><strong>Email:</strong> ${reserva.email}</p>
                <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
                <p><strong>Servicio:</strong> ${reserva.servicio}</p>
              </div>
              
              <div style="display: flex; gap: 20px;">
                <div style="background: #fee2e2; padding: 15px; border-radius: 8px; flex: 1;">
                  <h3 style="margin-top: 0; color: #dc2626;">❌ Antes</h3>
                  <p><strong>Fecha:</strong> ${oldFechaFormateada}</p>
                  <p><strong>Hora:</strong> ${oldHora.substring(0, 5)}</p>
                </div>
                <div style="background: #dcfce7; padding: 15px; border-radius: 8px; flex: 1;">
                  <h3 style="margin-top: 0; color: #16a34a;">✅ Ahora</h3>
                  <p><strong>Fecha:</strong> ${newFechaFormateada}</p>
                  <p><strong>Hora:</strong> ${new_hora.substring(0, 5)}</p>
                </div>
              </div>
              
              <p style="color: #888; font-size: 12px; margin-top: 30px;">
                Este es un mensaje automático de ViaggioStyle.
              </p>
            </div>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        modified: true,
        new_fecha,
        new_hora: new_hora.substring(0, 5)
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in modify-reservation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

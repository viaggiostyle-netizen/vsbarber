import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReservationRequest {
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  precio: number;
  fecha: string;
  hora: string;
}

// Input validation
function validateInput(data: ReservationRequest): string | null {
  if (!data.nombre || data.nombre.trim().length < 2 || data.nombre.length > 100) {
    return "Nombre inválido";
  }
  if (!data.telefono || data.telefono.length < 8 || data.telefono.length > 20) {
    return "Teléfono inválido";
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 255) {
    return "Email inválido";
  }
  if (!data.servicio || data.servicio.length > 100) {
    return "Servicio inválido";
  }
  if (!data.precio || data.precio < 0 || data.precio > 10000000) {
    return "Precio inválido";
  }
  if (!data.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
    return "Fecha inválida";
  }
  if (!data.hora || !/^\d{2}:\d{2}(:\d{2})?$/.test(data.hora)) {
    return "Hora inválida";
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ReservationRequest = await req.json();

    // Validate input
    const validationError = validateInput(data);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if slot is already taken
    const { data: existing, error: checkError } = await supabase
      .from("reservas")
      .select("id")
      .eq("fecha", data.fecha)
      .eq("hora", data.hora)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking availability:", checkError);
      return new Response(
        JSON.stringify({ error: "Error al verificar disponibilidad" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Este horario ya está reservado. Por favor, elige otro." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert reservation
    const { data: reserva, error: insertError } = await supabase
      .from("reservas")
      .insert({
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
        email: data.email.toLowerCase().trim(),
        servicio: data.servicio,
        precio: data.precio,
        fecha: data.fecha,
        hora: data.hora,
      })
      .select("id, fecha, hora, servicio")
      .single();

    if (insertError) {
      console.error("Error creating reservation:", insertError);
      return new Response(
        JSON.stringify({ error: "Error al crear la reserva" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Reservation created:", reserva.id);

    // Format date for notifications (dd/mm format)
    const fechaObj = new Date(data.fecha);
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const fechaCorta = `${dia}/${mes}`;

    // Send push notification to admin (mobile only)
    try {
      const notificationBody = `${data.nombre}, ${fechaCorta}, ${data.hora.substring(0, 5)}`;
      
      await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
         body: JSON.stringify({
           title: "¡Nueva cita reservada!",
           body: notificationBody,
           mobileOnly: true,
           data: { 
             url: "/control", 
             tag: "new-reservation",
             nombre: data.nombre,
             servicio: data.servicio,
             fecha: fechaCorta,
             hora: data.hora.substring(0, 5)
           }
         }),
      });
      console.log("Push notification sent to mobile");
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
    }

    // Add to Google Calendar and save event ID
    let calendarEventId: string | null = null;
    try {
      // Assume appointment duration of 30 minutes
      const [hour, minute] = data.hora.split(":").map(Number);
      const startDate = new Date(`${data.fecha}T${data.hora}`);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

      const startISO = `${data.fecha}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
      const endISO = `${data.fecha}T${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}:00`;

      const calendarRes = await fetch(`${SUPABASE_URL}/functions/v1/add-to-calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          summary: `✂️ ${data.nombre} - ${data.servicio}`,
          description: `Cliente: ${data.nombre}\nTeléfono: ${data.telefono}\nEmail: ${data.email}\nServicio: ${data.servicio}\nPrecio: $${data.precio.toLocaleString()}`,
          start: startISO,
          end: endISO,
        }),
      });
      
      const calendarData = await calendarRes.json();
      if (calendarData.success && calendarData.eventId) {
        calendarEventId = calendarData.eventId;
        // Save the calendar event ID to the reservation
        await supabase
          .from("reservas")
          .update({ calendar_event_id: calendarEventId })
          .eq("id", reserva.id);
        console.log("Calendar event created and ID saved:", calendarEventId);
      }
    } catch (calendarError) {
      console.error("Error adding to calendar:", calendarError);
    }

    // Format date for email (full format)
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', options);

    // Send notification email to admin
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ViaggioStyle <onboarding@resend.dev>",
          to: ["viaggiostyle@gmail.com"],
          subject: `Nueva Reserva - ${data.nombre}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">✂️ Nueva Reserva</h1>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #555;">Detalles del Cliente</h2>
                <p><strong>Nombre:</strong> ${data.nombre}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Teléfono:</strong> ${data.telefono}</p>
              </div>
              
              <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #555;">Detalles de la Cita</h2>
                <p><strong>Servicio:</strong> ${data.servicio}</p>
                <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                <p><strong>Hora:</strong> ${data.hora.substring(0, 5)}</p>
                <p><strong>Precio:</strong> $${data.precio.toLocaleString()}</p>
              </div>
            </div>
          `,
        }),
      });
    }

    // Return only non-sensitive confirmation data
    return new Response(
      JSON.stringify({ 
        success: true, 
        reservation: {
          id: reserva.id,
          fecha: reserva.fecha,
          hora: reserva.hora,
          servicio: reserva.servicio
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-reservation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting reminder check...");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current time in Argentina timezone (UTC-3)
    const now = new Date();
    const argentinaOffset = -3 * 60; // Argentina is UTC-3
    const localOffset = now.getTimezoneOffset();
    const argentinaTime = new Date(now.getTime() + (localOffset + argentinaOffset) * 60 * 1000);
    
    // Calculate time window: appointments 2 hours from now (with 5 min tolerance)
    const twoHoursFromNow = new Date(argentinaTime.getTime() + 2 * 60 * 60 * 1000);
    const windowStart = new Date(twoHoursFromNow.getTime() - 5 * 60 * 1000); // -5 min
    const windowEnd = new Date(twoHoursFromNow.getTime() + 5 * 60 * 1000);   // +5 min
    
    const todayDate = argentinaTime.toISOString().split('T')[0];
    const windowStartTime = windowStart.toTimeString().substring(0, 5);
    const windowEndTime = windowEnd.toTimeString().substring(0, 5);
    
    console.log(`Argentina time: ${argentinaTime.toISOString()}`);
    console.log(`Looking for appointments on ${todayDate} between ${windowStartTime} and ${windowEndTime}`);
    
    // Find appointments within the 2-hour window
    const { data: appointments, error } = await supabase
      .from("reservas")
      .select("*")
      .eq("fecha", todayDate)
      .gte("hora", windowStartTime)
      .lte("hora", windowEndTime);

    if (error) {
      console.error("Error fetching appointments:", error);
      return new Response(
        JSON.stringify({ error: "Error fetching appointments" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${appointments?.length || 0} appointments to remind`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0, message: "No appointments to remind" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let remindersSent = 0;

    for (const appointment of appointments) {
      try {
        console.log(`Sending reminder to ${appointment.email} for appointment at ${appointment.hora}`);
        
        // Format price
        const precioFormateado = `$${appointment.precio.toLocaleString('es-AR')}`;
        
        // Send email reminder
        if (RESEND_API_KEY) {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "ViaggioStyle <onboarding@resend.dev>",
              to: [appointment.email],
              subject: `Recordatorio: Tu cita en ViaggioStyle es en 2 horas`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">✂️ Recordatorio de Cita</h1>
                  
                  <p style="font-size: 18px;">¡Hola ${appointment.nombre}!</p>
                  
                  <p>Te recordamos que tienes una cita en <strong>2 horas</strong>.</p>
                  
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>📋 Servicio:</strong> ${appointment.servicio}</p>
                    <p><strong>🕐 Hora:</strong> ${appointment.hora.substring(0, 5)}</p>
                    <p><strong>💰 Precio:</strong> ${precioFormateado}</p>
                  </div>
                  
                  <p style="color: #666;">
                    Si no vas a poder asistir o necesitas modificar tu cita, por favor ingresa a 
                    <a href="https://vsbarber.lovable.app" style="color: #333; font-weight: bold;">vsbarber.lovable.app</a> 
                    y cancélala o modifícala.
                  </p>
                  
                  <p style="font-size: 18px; margin-top: 30px;">¡Te esperamos! 💈</p>
                  
                  <p style="color: #888; font-size: 12px; margin-top: 30px;">
                    Este es un mensaje automático de ViaggioStyle.
                  </p>
                </div>
              `,
            }),
          });
          
          const emailResult = await emailRes.json();
          console.log(`Email reminder sent to ${appointment.email}:`, emailResult);
        }
        
        remindersSent++;
      } catch (appointmentError) {
        console.error(`Error sending reminder for appointment ${appointment.id}:`, appointmentError);
      }
    }

    console.log(`Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-reminder-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancellationRequest {
  reserva_id: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reserva_id, email }: CancellationRequest = await req.json();

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, verify the reservation exists and belongs to this email
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

    console.log("Cancelling reservation for:", { nombre: reserva.nombre, servicio: reserva.servicio });

    // Delete the reservation using service role
    const { error: deleteError } = await supabase
      .from("reservas")
      .delete()
      .eq("id", reserva_id);

    if (deleteError) {
      console.error("Error deleting reservation:", deleteError);
      return new Response(
        JSON.stringify({ error: "Error al eliminar la reserva" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format date for email
    const fechaObj = new Date(reserva.fecha);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', options);

    // Send notification to admin
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ViaggioStyle <onboarding@resend.dev>",
        to: ["viaggiostyle@gmail.com"],
        subject: `Reserva Cancelada - ${reserva.nombre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">⚠️ Reserva Cancelada</h1>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h2 style="margin-top: 0; color: #555;">Detalles del Cliente</h2>
              <p><strong>Nombre:</strong> ${reserva.nombre}</p>
              <p><strong>Email:</strong> ${reserva.email}</p>
              <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
            </div>
            
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #555;">Detalles de la Reserva Cancelada</h2>
              <p><strong>Servicio:</strong> ${reserva.servicio}</p>
              <p><strong>Fecha:</strong> ${fechaFormateada}</p>
              <p><strong>Hora:</strong> ${reserva.hora.substring(0, 5)}</p>
              <p><strong>Precio:</strong> $${reserva.precio.toLocaleString()}</p>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              Este es un mensaje automático de ViaggioStyle.
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await adminEmailRes.json();
    console.log("Admin cancellation notification sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, deleted: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in cancellation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancellationNotificationRequest {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  fecha: string;
  hora: string;
  precio: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nombre, email, telefono, servicio, fecha, hora, precio }: CancellationNotificationRequest = await req.json();

    console.log("Sending cancellation notification for:", { nombre, servicio, fecha, hora });

    // Send notification to admin (only to verified Resend email)
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ViaggioStyle <onboarding@resend.dev>",
        to: ["viaggiostyle@gmail.com"],
        subject: `Reserva Cancelada - ${nombre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">⚠️ Reserva Cancelada</h1>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h2 style="margin-top: 0; color: #555;">Detalles del Cliente</h2>
              <p><strong>Nombre:</strong> ${nombre}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Teléfono:</strong> ${telefono}</p>
            </div>
            
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #555;">Detalles de la Reserva Cancelada</h2>
              <p><strong>Servicio:</strong> ${servicio}</p>
              <p><strong>Fecha:</strong> ${fecha}</p>
              <p><strong>Hora:</strong> ${hora}</p>
              <p><strong>Precio:</strong> $${precio.toLocaleString()}</p>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              Este es un mensaje automático de ViaggioStyle.
            </p>
          </div>
        `,
      }),
    });

    const adminEmail = await adminEmailRes.json();
    console.log("Admin cancellation notification sent:", adminEmail);

    return new Response(
      JSON.stringify({ success: true, adminEmail }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending cancellation notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

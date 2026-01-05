import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
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
    const { nombre, email, telefono, servicio, fecha, hora, precio }: BookingNotificationRequest = await req.json();

    console.log("Sending booking notification for:", { nombre, servicio, fecha, hora });

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
        subject: `Nueva Reserva - ${nombre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">Nueva Reserva</h1>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #555;">Detalles del Cliente</h2>
              <p><strong>Nombre:</strong> ${nombre}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Teléfono:</strong> ${telefono}</p>
            </div>
            
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #555;">Detalles de la Reserva</h2>
              <p><strong>Servicio:</strong> ${servicio}</p>
              <p><strong>Fecha:</strong> ${fecha}</p>
              <p><strong>Hora:</strong> ${hora}</p>
              <p><strong>Precio Total:</strong> $${precio.toLocaleString()}</p>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              Este es un mensaje automático de ViaggioStyle.
            </p>
          </div>
        `,
      }),
    });

    const adminEmail = await adminEmailRes.json();
    console.log("Admin notification sent:", adminEmail);

    // Send confirmation to client
    const clientEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ViaggioStyle <onboarding@resend.dev>",
        to: [email],
        subject: "Confirmación de Reserva - ViaggioStyle",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">¡Reserva Confirmada!</h1>
            
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>Tu reserva ha sido confirmada exitosamente.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #555;">Detalles de tu Cita</h2>
              <p><strong>Servicio:</strong> ${servicio}</p>
              <p><strong>Fecha:</strong> ${fecha}</p>
              <p><strong>Hora:</strong> ${hora}</p>
              <p><strong>Precio Total:</strong> $${precio.toLocaleString()}</p>
            </div>
            
            <p>Si necesitas cancelar o modificar tu cita, por favor contáctanos.</p>
            
            <p style="margin-top: 30px;">¡Te esperamos!</p>
            <p><strong>ViaggioStyle</strong><br>Eleva tu imagen.</p>
          </div>
        `,
      }),
    });

    const clientEmail = await clientEmailRes.json();
    console.log("Client confirmation sent:", clientEmail);

    return new Response(
      JSON.stringify({ success: true, adminEmail, clientEmail }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
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

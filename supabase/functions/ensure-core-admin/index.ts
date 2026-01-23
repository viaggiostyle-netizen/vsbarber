import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const CORE_ADMIN_EMAILS = new Set([
  "camiloviaggio01@gmail.com",
  "viaggiostyle@gmail.com",
]);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("No auth header or invalid format");
      return json({ success: false, error: "No autenticado" }, 401);
    }

    // Create client with anon key to validate the user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log("Claims error:", claimsError);
      return json({ success: false, error: "No autenticado" }, 401);
    }

    const userId = claimsData.claims.sub;
    const email = (claimsData.claims.email as string ?? "").toLowerCase();

    if (!email || !CORE_ADMIN_EMAILS.has(email)) {
      return json({ success: false, error: "No autorizado" }, 403);
    }

    // Use service role client for the admin insert operation
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Idempotent: insert admin role if missing.
    const { error: insertErr } = await serviceClient
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (insertErr) {
      // Unique violation => already admin
      if ((insertErr as any).code !== "23505") {
        console.log("Insert role error:", insertErr);
        return json({ success: false, error: "No se pudo asegurar el rol" }, 500);
      }
    }

    return json({ success: true });
  } catch (e: any) {
    console.error("ensure-core-admin error:", e);
    return json({ success: false, error: e?.message ?? "Error inesperado" }, 500);
  }
});

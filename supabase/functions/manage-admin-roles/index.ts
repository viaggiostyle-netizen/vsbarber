import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody =
  | { action: "list" }
  | { action: "add"; email: string }
  | { action: "remove"; user_id: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

type SupabaseAny = any;

async function getAuthedUserId(supabase: SupabaseAny, req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id as string;
}

async function isAdmin(supabase: SupabaseAny, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return !error && data !== null;
}

async function findUserIdByEmail(
  supabase: SupabaseAny,
  email: string,
): Promise<string | null> {
  // We page through users until we find the email. For this app's scale it's fine.
  const target = email.trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((u: any) => (u.email ?? "").toLowerCase() === target);
    if (match?.id) return match.id;

    if (users.length < perPage) break;
    page++;
  }

  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const requesterId = await getAuthedUserId(supabase, req);
    if (!requesterId) {
      return json({ success: false, error: "No autenticado" }, 401);
    }

    const requesterIsAdmin = await isAdmin(supabase, requesterId);
    if (!requesterIsAdmin) {
      return json({ success: false, error: "No autorizado" }, 403);
    }

    const body: RequestBody = await req.json();

    if (body.action === "list") {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (error) return json({ success: false, error: "Error al leer roles" }, 500);

      const adminIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      const admins: Array<{ user_id: string; email: string }> = [];

      for (const id of adminIds) {
        const { data, error: userErr } = await supabase.auth.admin.getUserById(id);
        if (userErr) continue;
        const email = (data?.user?.email ?? "").toLowerCase();
        if (email) admins.push({ user_id: id, email });
      }

      return json({ success: true, admins });
    }

    if (body.action === "add") {
      const email = body.email?.trim().toLowerCase();
      if (!email || email.length > 255) return json({ success: false, error: "Email inválido" }, 400);

      const userId = await findUserIdByEmail(supabase, email);
      if (!userId) return json({ success: false, error: "Ese usuario todavía no existe" }, 404);

      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) {
        // Unique violation => already admin
        if ((error as any).code === "23505") {
          return json({ success: true });
        }
        return json({ success: false, error: "No se pudo asignar admin" }, 500);
      }

      return json({ success: true });
    }

    if (body.action === "remove") {
      const targetId = body.user_id;
      if (!targetId) return json({ success: false, error: "user_id requerido" }, 400);

      // Prevent removing the last admin
      const { data: existingAdmins, error: listErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (listErr) return json({ success: false, error: "Error al validar admins" }, 500);

      const uniqueAdmins = Array.from(new Set((existingAdmins ?? []).map((r) => r.user_id)));
      if (uniqueAdmins.length <= 1 && uniqueAdmins[0] === targetId) {
        return json({ success: false, error: "No podés eliminar el último admin" }, 400);
      }

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetId)
        .eq("role", "admin");

      if (error) return json({ success: false, error: "No se pudo eliminar admin" }, 500);
      return json({ success: true });
    }

    return json({ success: false, error: "Acción inválida" }, 400);
  } catch (e: any) {
    console.error("manage-admin-roles error:", e);
    return json({ success: false, error: e?.message ?? "Error inesperado" }, 500);
  }
};

serve(handler);

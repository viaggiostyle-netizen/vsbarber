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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Client with user's JWT for authentication check
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    // Client with service role for admin operations (listUsers, getUserById, etc.)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "No autenticado" }, 401);
    }

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.log("Auth error:", userError);
      return json({ success: false, error: "No autenticado" }, 401);
    }

    const requesterId = userData.user.id;

    // Check if requester is admin using service role client (bypasses RLS)
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.log("Role check:", { roleError, roleData, requesterId });
      return json({ success: false, error: "No autorizado" }, 403);
    }

    const body: RequestBody = await req.json();

    if (body.action === "list") {
      const { data: roles, error } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (error) {
        console.log("List roles error:", error);
        return json({ success: false, error: "Error al leer roles" }, 500);
      }

      const adminIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      const admins: Array<{ user_id: string; email: string }> = [];

      for (const id of adminIds) {
        const { data, error: userErr } = await adminClient.auth.admin.getUserById(id);
        if (userErr) {
          console.log("Get user error:", userErr);
          continue;
        }
        const email = (data?.user?.email ?? "").toLowerCase();
        if (email) admins.push({ user_id: id, email });
      }

      return json({ success: true, admins });
    }

    if (body.action === "add") {
      const email = body.email?.trim().toLowerCase();
      if (!email || email.length > 255) return json({ success: false, error: "Email inválido" });

      // Find user by email using admin API
      let targetUserId: string | null = null;
      let page = 1;
      const perPage = 200;

      try {
        while (page <= 20) {
          const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
          if (error) {
            console.log("List users error:", error);
            return json({ success: false, error: "Error al buscar usuarios" });
          }

          const users = data?.users ?? [];
          const match = users.find((u: any) => (u.email ?? "").toLowerCase() === email);
          if (match?.id) {
            targetUserId = match.id;
            break;
          }

          if (users.length < perPage) break;
          page++;
        }
      } catch (listError: any) {
        console.error("List users exception:", listError);
        return json({ success: false, error: "Error al buscar usuarios" });
      }

      if (!targetUserId) {
        // Return 200 with success: false so the frontend can read the error message
        return json({ success: false, error: "El usuario debe registrarse primero" });
      }

      const { error } = await adminClient.from("user_roles").insert({ user_id: targetUserId, role: "admin" });
      if (error) {
        // Unique violation => already admin
        if ((error as any).code === "23505") {
          return json({ success: true });
        }
        console.log("Insert role error:", error);
        return json({ success: false, error: "No se pudo asignar admin" });
      }

      return json({ success: true });
    }

    if (body.action === "remove") {
      const targetId = body.user_id;
      if (!targetId) return json({ success: false, error: "user_id requerido" }, 400);

      // Protect core admins from accidental lockout
      const { data: targetUser, error: targetUserErr } = await adminClient.auth.admin.getUserById(targetId);
      if (targetUserErr) {
        console.log("Get target user error:", targetUserErr);
        return json({ success: false, error: "No se pudo validar el usuario" }, 500);
      }

      const targetEmail = (targetUser?.user?.email ?? "").toLowerCase();
      const protectedEmails = new Set(["camiloviaggio01@gmail.com", "viaggiostyle@gmail.com"]);
      if (targetEmail && protectedEmails.has(targetEmail)) {
        return json({ success: false, error: "Este admin está protegido y no puede ser removido" }, 400);
      }

      // Prevent removing the last admin
      const { data: existingAdmins, error: listErr } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (listErr) {
        console.log("List admins error:", listErr);
        return json({ success: false, error: "Error al validar admins" }, 500);
      }

      const uniqueAdmins = Array.from(new Set((existingAdmins ?? []).map((r: any) => r.user_id)));
      if (uniqueAdmins.length <= 1 && uniqueAdmins[0] === targetId) {
        return json({ success: false, error: "No podés eliminar el último admin" }, 400);
      }

      const { error } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetId)
        .eq("role", "admin");

      if (error) {
        console.log("Delete role error:", error);
        return json({ success: false, error: "No se pudo eliminar admin" }, 500);
      }

      return json({ success: true });
    }

    return json({ success: false, error: "Acción inválida" }, 400);
  } catch (e: any) {
    console.error("manage-admin-roles error:", e);
    return json({ success: false, error: e?.message ?? "Error inesperado" }, 500);
  }
};

serve(handler);

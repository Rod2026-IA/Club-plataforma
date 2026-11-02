import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isSuper = (roles || []).some((r: any) => r.role === "super_admin");
    if (!isSuper) return json({ error: "Solo super admin" }, 403);

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.targetUserId;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = admin.from("pin_records").select("user_id, pin");
    if (targetUserId) query = query.eq("user_id", targetUserId);
    const { data: pins, error: pinErr } = await query;
    if (pinErr) return json({ error: pinErr.message }, 500);

    const results = { synced: 0, failed: 0, errors: [] as { user_id: string; error: string }[] };
    for (const row of pins || []) {
      if (!row.pin || !/^[0-9]{4}$/.test(row.pin)) {
        results.failed++;
        results.errors.push({ user_id: row.user_id, error: "PIN inválido" });
        continue;
      }
      const { error } = await admin.auth.admin.updateUserById(row.user_id, {
        password: `CC${row.pin}`,
      });
      if (error) {
        results.failed++;
        results.errors.push({ user_id: row.user_id, error: error.message });
      } else {
        results.synced++;
      }
    }

    return json({ ok: true, ...results });
  } catch (e: any) {
    return json({ error: e.message || "Error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

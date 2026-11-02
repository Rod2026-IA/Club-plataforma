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

    const { targetUserId, newPin, action } = await req.json();
    if (!targetUserId) return json({ error: "Falta usuario" }, 400);

    // Check role: super_admin can do everything; director/subdirector can only delete users
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const myRoles = (roles || []).map((r: any) => r.role);
    const isSuper = myRoles.includes("super_admin");
    const isDirector = myRoles.includes("director") || myRoles.includes("subdirector");

    if (action === "delete") {
      if (!isSuper && !isDirector) return json({ error: "No autorizado" }, 403);
    } else {
      if (!isSuper) return json({ error: "Solo super admin" }, 403);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "delete") {
      // Wipe all user-related data first
      const tables = [
        "bible_readings",
        "class_card_photos",
        "class_card_progress",
        "conqui_kash_transactions",
        "evaluations",
        "guia_mayor_photos",
        "guia_mayor_progress",
        "messages",
        "pin_records",
        "unit_members",
        "user_roles",
        "profiles",
      ];
      for (const t of tables) {
        await admin.from(t).delete().eq("user_id", targetUserId);
      }
      // Messages where user is receiver
      await admin.from("messages").delete().eq("receiver_id", targetUserId);
      // Conversations referencing user
      await admin.from("conversations").delete().or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`);

      // Delete user storage files (best-effort)
      for (const bucket of ["avatars", "banners", "guia-mayor", "class-cards"]) {
        try {
          const { data: files } = await admin.storage.from(bucket).list(targetUserId, { limit: 1000 });
          if (files && files.length) {
            await admin.storage.from(bucket).remove(files.map((f) => `${targetUserId}/${f.name}`));
          }
        } catch (_) { /* ignore */ }
      }

      const { error } = await admin.auth.admin.deleteUser(targetUserId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // reset pin
    if (!/^[0-9]{4}$/.test(newPin || "")) return json({ error: "PIN inválido" }, 400);

    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: `CC${newPin}`,
    });
    if (updErr) return json({ error: updErr.message }, 500);

    const { error: pinErr } = await admin
      .from("pin_records")
      .upsert({
        user_id: targetUserId,
        pin: newPin,
        assigned_by: user.id,
        source: "admin_reset",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (pinErr) return json({ error: pinErr.message }, 500);

    return json({ ok: true });
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

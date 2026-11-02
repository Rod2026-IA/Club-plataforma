import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, action, securityAnswer, newPin } = await req.json();

    if (!phone || typeof phone !== "string") {
      return json({ error: "Teléfono requerido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up user by phone
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, security_question, security_answer")
      .eq("phone", phone)
      .maybeSingle();

    if (profileErr) return json({ error: profileErr.message }, 500);
    if (!profile) return json({ error: "No se encontró un usuario con ese teléfono" }, 404);

    if (action === "get_question") {
      if (!profile.security_question) {
        return json({ error: "Este usuario no tiene pregunta de seguridad. Pide a un administrador que resetee tu PIN." }, 400);
      }
      return json({ question: profile.security_question });
    }

    if (action === "reset") {
      if (!securityAnswer || !newPin) return json({ error: "Faltan datos" }, 400);
      if (!/^[0-9]{4}$/.test(newPin)) return json({ error: "El PIN debe ser de 4 dígitos" }, 400);

      const stored = (profile.security_answer || "").trim().toLowerCase();
      const provided = String(securityAnswer).trim().toLowerCase();
      if (!stored || stored !== provided) {
        return json({ error: "Respuesta incorrecta" }, 401);
      }

      // Update auth password
      const { error: updErr } = await supabase.auth.admin.updateUserById(profile.user_id, {
        password: `CC${newPin}`,
      });
      if (updErr) return json({ error: updErr.message }, 500);

      // Upsert pin_records
      const { error: pinErr } = await supabase
        .from("pin_records")
        .upsert({
          user_id: profile.user_id,
          pin: newPin,
          source: "self_recovery",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (pinErr) return json({ error: pinErr.message }, 500);

      return json({ ok: true });
    }

    return json({ error: "Acción inválida" }, 400);
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

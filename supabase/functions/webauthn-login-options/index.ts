import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@10.0.1";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone } = await req.json();
    // SECURITY: rpID must be server-controlled, not client-supplied.
    const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ALLOWED_ORIGINS") ||
      "https://conqui-pathfinder-hub.lovable.app,https://wwwguiago.infly.pro,https://id-preview--ad7b0527-d8d3-455e-9d3f-b6be899295aa.lovable.app")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const rpID = Deno.env.get("WEBAUTHN_RP_ID") || new URL(ALLOWED_ORIGINS[0]).hostname;
    if (!phone) {
      return new Response(JSON.stringify({ error: "phone requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, service);

    const digits = String(phone).replace(/\D/g, "");
    const variants = [digits];
    if (digits.startsWith("504") && digits.length > 8) variants.push(digits.slice(3));
    else if (!digits.startsWith("504") && digits.length === 8) variants.push("504" + digits);

    const { data: profile } = await admin.from("profiles")
      .select("user_id").in("phone", variants).limit(1).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: creds } = await admin.from("webauthn_credentials")
      .select("credential_id,transports").eq("user_id", profile.user_id);
    if (!creds || creds.length === 0) {
      return new Response(JSON.stringify({ error: "Este usuario no tiene huella registrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: creds.map((c: any) => ({ id: c.credential_id, transports: c.transports || [] })),
    });

    await admin.from("webauthn_challenges").insert({
      user_id: profile.user_id,
      phone: digits,
      challenge: options.challenge,
      kind: "authentication",
    });

    return new Response(JSON.stringify(options), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
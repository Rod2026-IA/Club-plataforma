import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@10.0.1";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function b64UrlToBuf(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const norm = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone, response } = await req.json();
    // SECURITY: Do not trust client-supplied rpID/origin. Derive from server config.
    const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ALLOWED_ORIGINS") ||
      "https://conqui-pathfinder-hub.lovable.app,https://wwwguiago.infly.pro,https://id-preview--ad7b0527-d8d3-455e-9d3f-b6be899295aa.lovable.app")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const rpID = Deno.env.get("WEBAUTHN_RP_ID") || new URL(ALLOWED_ORIGINS[0]).hostname;
    const origin = ALLOWED_ORIGINS;
    if (!phone || !response) {
      return new Response(JSON.stringify({ error: "phone y response requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, service);

    const digits = String(phone).replace(/\D/g, "");
    const { data: ch } = await admin.from("webauthn_challenges")
      .select("*").eq("phone", digits).eq("kind", "authentication")
      .order("created_at", { ascending: false }).limit(1).single();
    if (!ch) return new Response(JSON.stringify({ error: "Challenge no encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const credId: string = response.id;
    const { data: cred } = await admin.from("webauthn_credentials")
      .select("*").eq("credential_id", credId).single();
    if (!cred || cred.user_id !== ch.user_id) {
      return new Response(JSON.stringify({ error: "Credencial no encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: b64UrlToBuf(cred.public_key),
        counter: Number(cred.counter || 0),
        transports: cred.transports || [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return new Response(JSON.stringify({ error: "Verificación fallida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newCounter = verification.authenticationInfo?.newCounter ?? Number(cred.counter || 0);
    await admin.from("webauthn_credentials").update({
      counter: newCounter,
      last_used_at: new Date().toISOString(),
    }).eq("id", cred.id);
    await admin.from("webauthn_challenges").delete().eq("id", ch.id);

    // Generar magiclink y devolver tokens de sesión
    const { data: userData } = await admin.auth.admin.getUserById(ch.user_id);
    if (!userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Usuario sin email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: linkErr?.message || "No se pudo generar enlace" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      verified: true,
      email: userData.user.email,
      hashed_token: link.properties.hashed_token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
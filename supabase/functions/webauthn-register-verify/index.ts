import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@10.0.1";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bufToB64Url(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { response, deviceLabel } = await req.json();
    // SECURITY: rpID/origin must be server-controlled.
    const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ALLOWED_ORIGINS") ||
      "https://conqui-pathfinder-hub.lovable.app,https://wwwguiago.infly.pro,https://id-preview--ad7b0527-d8d3-455e-9d3f-b6be899295aa.lovable.app")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const rpID = Deno.env.get("WEBAUTHN_RP_ID") || new URL(ALLOWED_ORIGINS[0]).hostname;
    const origin = ALLOWED_ORIGINS;
    const admin = createClient(supabaseUrl, service);

    const { data: ch } = await admin.from("webauthn_challenges")
      .select("*").eq("user_id", userId).eq("kind", "registration")
      .order("created_at", { ascending: false }).limit(1).single();
    if (!ch) return new Response(JSON.stringify({ error: "Challenge no encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: "No verificado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const info: any = verification.registrationInfo;
    const credential = info.credential || info;
    const credentialID: string = typeof credential.id === "string" ? credential.id : bufToB64Url(credential.id);
    const publicKeyB64 = bufToB64Url(credential.publicKey);
    const counter = credential.counter || 0;
    const transports = response.response?.transports || [];

    await admin.from("webauthn_credentials").insert({
      user_id: userId,
      credential_id: credentialID,
      public_key: publicKeyB64,
      counter,
      transports,
      device_label: deviceLabel || "Dispositivo",
    });

    await admin.from("webauthn_challenges").delete().eq("id", ch.id);

    return new Response(JSON.stringify({ verified: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
import { generateRegistrationOptions } from "npm:@simplewebauthn/server@10.0.1";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RP_NAME = "GuíaGo";

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

    // SECURITY: rpID/origin are server-controlled (ignore any client-supplied values).
    await req.json().catch(() => ({}));
    const ALLOWED_ORIGINS = (Deno.env.get("WEBAUTHN_ALLOWED_ORIGINS") ||
      "https://conqui-pathfinder-hub.lovable.app,https://wwwguiago.infly.pro,https://id-preview--ad7b0527-d8d3-455e-9d3f-b6be899295aa.lovable.app")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const rpID = Deno.env.get("WEBAUTHN_RP_ID") || new URL(ALLOWED_ORIGINS[0]).hostname;

    const admin = createClient(supabaseUrl, service);
    const { data: profile } = await admin.from("profiles").select("first_name,first_last_name,phone").eq("user_id", userId).single();
    const { data: existing } = await admin.from("webauthn_credentials").select("credential_id,transports").eq("user_id", userId);

    const userName = (profile?.phone || userId).toString();
    const userDisplay = `${profile?.first_name || ""} ${profile?.first_last_name || ""}`.trim() || userName;

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: new TextEncoder().encode(userId),
      userName,
      userDisplayName: userDisplay,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
      excludeCredentials: (existing || []).map((c: any) => ({
        id: c.credential_id,
        transports: c.transports || [],
      })),
    });

    await admin.from("webauthn_challenges").insert({
      user_id: userId,
      challenge: options.challenge,
      kind: "registration",
    });

    return new Response(JSON.stringify(options), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
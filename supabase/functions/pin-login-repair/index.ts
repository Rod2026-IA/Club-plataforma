import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProfileRow = { user_id: string; phone: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone || "");
    const pin = String(body?.pin || "");
    const digits = onlyDigits(phone);

    if (!/^[0-9]{4}$/.test(pin) || digits.length < 8 || digits.length > 15) {
      return json({ error: "Credenciales incorrectas" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const phoneHash = await sha256(digits.slice(-8));
    const ipHash = await sha256(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown");
    const { data: attempt } = await admin
      .from("pin_login_attempts")
      .select("attempts, locked_until")
      .eq("phone_hash", phoneHash)
      .eq("ip_hash", ipHash)
      .maybeSingle();
    if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
      return json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, 429);
    }

    const inputVariants = phoneVariants(digits);
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("user_id, phone")
      .or(Array.from(inputVariants).map((value) => `phone.eq.${value}`).join(","))
      .limit(100);
    if (profilesError) return json({ error: "Credenciales incorrectas" }, 401);

    const profileMatches = ((profiles || []) as ProfileRow[]).map((profile) => profile.user_id);

    const emailMatches = await findUsersByEmailDigits(admin, inputVariants);
    const candidateIds = Array.from(new Set([...profileMatches, ...emailMatches]));

    for (const userId of candidateIds) {
      const { data: pinRow } = await admin
        .from("pin_records")
        .select("pin")
        .eq("user_id", userId)
        .maybeSingle();

      if (pinRow?.pin !== pin) continue;

      const { data: authData, error: userError } = await admin.auth.admin.getUserById(userId);
      if (userError || !authData?.user?.email) continue;

      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: `CC${pin}`,
      });
      if (updateError) continue;

      await admin.from("pin_login_attempts").delete().eq("phone_hash", phoneHash).eq("ip_hash", ipHash);
      return json({ ok: true, email: authData.user.email });
    }

    await recordFailedAttempt(admin, phoneHash, ipHash, attempt?.attempts || 0);
    return json({ error: "Credenciales incorrectas" }, 401);
  } catch (_) {
    return json({ error: "Credenciales incorrectas" }, 401);
  }
});

function onlyDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function phoneVariants(value: string) {
  const digits = onlyDigits(value);
  const variants = new Set<string>();
  if (!digits) return variants;
  variants.add(digits);
  const last8 = digits.length >= 8 ? digits.slice(-8) : digits;
  variants.add(last8);
  if (last8.length === 8) variants.add(`504${last8}`);
  return variants;
}

async function findUsersByEmailDigits(admin: ReturnType<typeof createClient>, variants: Set<string>) {
  const matches: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const user of data.users) {
      const emailDigits = onlyDigits((user.email || "").split("@")[0] || "");
      if (variants.has(emailDigits)) matches.push(user.id);
    }
    if (data.users.length < 1000) break;
  }
  return matches;
}

async function recordFailedAttempt(admin: ReturnType<typeof createClient>, phoneHash: string, ipHash: string, previousAttempts: number) {
  const attempts = previousAttempts + 1;
  const lockedUntil = attempts >= 6 ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;
  await admin.from("pin_login_attempts").upsert({
    phone_hash: phoneHash,
    ip_hash: ipHash,
    attempts,
    locked_until: lockedUntil,
    last_attempt_at: new Date().toISOString(),
  }, { onConflict: "phone_hash,ip_hash" });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
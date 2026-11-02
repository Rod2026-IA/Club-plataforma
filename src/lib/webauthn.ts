import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

export const webauthnSupported = () => browserSupportsWebAuthn();

function rpInfo() {
  return { rpID: window.location.hostname, origin: window.location.origin };
}

export async function registerFingerprint(deviceLabel?: string) {
  const { rpID, origin } = rpInfo();
  const { data: opts, error } = await supabase.functions.invoke("webauthn-register-options", { body: { rpID, origin } });
  if (error || !opts) throw new Error(error?.message || "No se pudo iniciar el registro");
  const attResp = await startRegistration({ optionsJSON: opts });
  const { data: ver, error: vErr } = await supabase.functions.invoke("webauthn-register-verify", {
    body: { response: attResp, rpID, origin, deviceLabel: deviceLabel || navigator.userAgent.slice(0, 60) },
  });
  if (vErr || !ver?.verified) throw new Error(vErr?.message || "No se pudo verificar el registro");
  return true;
}

export async function loginWithFingerprint(phone: string) {
  const { rpID, origin } = rpInfo();
  const { data: opts, error } = await supabase.functions.invoke("webauthn-login-options", { body: { phone, rpID } });
  if (error || !opts) throw new Error(error?.message || "No tienes huella registrada para este teléfono");
  const authResp = await startAuthentication({ optionsJSON: opts });
  const { data: ver, error: vErr } = await supabase.functions.invoke("webauthn-login-verify", {
    body: { phone, response: authResp, rpID, origin },
  });
  if (vErr || !ver?.verified) throw new Error(vErr?.message || "Verificación fallida");
  // Crear sesión usando OTP magiclink
  const { error: otpErr } = await supabase.auth.verifyOtp({
    email: ver.email,
    token_hash: ver.hashed_token,
    type: "magiclink",
  });
  if (otpErr) throw new Error(otpErr.message);
  return true;
}
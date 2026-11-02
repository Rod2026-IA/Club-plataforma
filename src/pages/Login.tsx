import { useNavigate } from "react-router-dom";
import { Phone, Lock, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuroraAuthLayout from "@/components/aurora/AuroraAuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { branding } = usePlatformBranding();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const buildLoginEmails = (phoneVal: string) => {
    const digits = phoneVal.replace(/[^0-9]/g, "");
    const last8 = digits.length >= 8 ? digits.slice(-8) : digits;
    return Array.from(new Set([
      digits,
      last8,
      last8.length === 8 ? `504${last8}` : "",
    ].filter(Boolean).map((d) => `${d}@conquicontrol.app`)));
  };

  const signInWithPin = async (phoneVal: string, pinVal: string) => {
    let lastError: any = null;
    for (const email of buildLoginEmails(phoneVal)) {
      const { error } = await signIn(email, `CC${pinVal}`);
      if (!error) return { ok: true as const };
      lastError = error;
    }

    const { data } = await supabase.functions.invoke("pin-login-repair", {
      body: { phone: phoneVal, pin: pinVal },
    });
    if (data?.ok && data?.email) {
      const { error } = await signIn(data.email, `CC${pinVal}`);
      if (!error) return { ok: true as const };
      lastError = error;
    }
    return { ok: false as const, error: lastError };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || pin.length !== 4) {
      toast.error("Ingresa tu número de teléfono y PIN de 4 dígitos");
      return;
    }
    setIsLoading(true);
    const res = await signInWithPin(phone, pin);
    setIsLoading(false);
    if (res.ok) {
      navigate("/dashboard");
    } else {
      toast.error("Credenciales incorrectas. Verifica tu teléfono y PIN.");
    }
  };

  return (
    <AuroraAuthLayout
      title={branding.name}
      subtitle={branding.description}
      brandIconUrl={branding.icon_url}
      brandFallbackIcon={<Shield className="w-9 h-9 text-white" />}
      footer={
        <div>
          ¿No tienes cuenta?{" "}
          <button onClick={() => navigate("/register")} className="text-white font-semibold underline-offset-2 hover:underline">
            Regístrate
          </button>
          <div className="mt-2">
            <button
              onClick={() => navigate("/recuperar-pin")}
              className="text-xs text-white/70 hover:text-white underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu PIN?
            </button>
          </div>
        </div>
      }
    >
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white/85 font-medium text-sm">Número de Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="+504 0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="text-white/85 font-medium text-sm">PIN (4 dígitos)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55" />
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="current-password"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 4) setPin(val);
                  }}
                  className="pl-10 pr-10 h-12 tracking-[0.5em] text-center text-lg bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-white/60 hover:text-white transition-colors p-1"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold border-0 text-white hover:opacity-95 transition-opacity aurora-tap"
              style={{ background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))" }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
            </Button>
          </form>
    </AuroraAuthLayout>
  );
};

export default Login;

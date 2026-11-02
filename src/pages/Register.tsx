import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AuroraAuthLayout from "@/components/aurora/AuroraAuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { branding } = usePlatformBranding();
  const [isLoading, setIsLoading] = useState(false);
  const [directorTaken, setDirectorTaken] = useState(false);
  const [subdirectorCount, setSubdirectorCount] = useState(0);
  const [form, setForm] = useState({
    firstName: "",
    secondName: "",
    firstLastName: "",
    secondLastName: "",
    birthday: "",
    phone: "",
    pin: "",
    confirmPin: "",
    securityQuestion: "",
    securityAnswer: "",
    role: "integrante" as "integrante" | "gm_investido" | "director" | "subdirector",
  });

  useEffect(() => {
    const loadCounts = async () => {
      const { data, error } = await supabase.rpc("get_admin_role_counts");
      if (error || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      const dir = Number(row?.director_count ?? 0);
      const sub = Number(row?.subdirector_count ?? 0);
      setDirectorTaken(dir >= 1);
      setSubdirectorCount(sub);
      setForm((prev) => {
        if (prev.role === "director" && dir >= 1) return { ...prev, role: "integrante" };
        if (prev.role === "subdirector" && sub >= 2) return { ...prev, role: "integrante" };
        return prev;
      });
    };
    loadCounts();
  }, []);

  const subdirectorTaken = subdirectorCount >= 2;

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pin.length !== 4) { toast.error("El PIN debe ser de 4 dígitos"); return; }
    if (form.pin !== form.confirmPin) { toast.error("Los PINs no coinciden"); return; }
    if (!form.securityQuestion.trim()) { toast.error("Crea tu pregunta de seguridad"); return; }
    if (!form.securityAnswer.trim()) { toast.error("Escribe la respuesta a tu pregunta"); return; }

    setIsLoading(true);
    const phoneClean = form.phone.replace(/[^0-9]/g, "");
    const fakeEmail = `${phoneClean}@conquicontrol.app`;
    const { error } = await signUp(fakeEmail, `CC${form.pin}`, {
      first_name: form.firstName,
      second_name: form.secondName,
      first_last_name: form.firstLastName,
      second_last_name: form.secondLastName,
      phone: form.phone,
      birthday: form.birthday,
      role: form.role,
    });

    if (error) {
      setIsLoading(false);
      toast.error(error.message || "Error al crear la cuenta");
      return;
    }

    // Wait briefly for trigger to create profile, then save PIN + security question
    await new Promise((r) => setTimeout(r, 800));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        security_question: form.securityQuestion.trim(),
        security_answer: form.securityAnswer.trim(),
      }).eq("user_id", user.id);

      await supabase.from("pin_records").insert({
        user_id: user.id,
        pin: form.pin,
        source: "registration",
      });
    }

    setIsLoading(false);
    toast.success("¡Cuenta creada exitosamente!");
    navigate("/dashboard");
  };

  return (
    <AuroraAuthLayout
      title="Crear Cuenta"
      subtitle={`${branding.name} · Completa tu información`}
      brandFallbackIcon={<Sparkles className="w-8 h-8 text-white" />}
      size="lg"
      footer={
        <div>
          ¿Ya tienes cuenta?{" "}
          <button onClick={() => navigate("/")} className="text-white font-semibold underline-offset-2 hover:underline">
            Inicia sesión
          </button>
          <div className="mt-2">
            <Link to="/recuperar-pin" className="text-xs text-white/70 hover:text-white underline-offset-2 hover:underline">
              ¿Olvidaste tu PIN?
            </Link>
          </div>
        </div>
      }
    >
      <div className="max-h-[68vh] overflow-y-auto pr-1">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Primer Nombre</Label>
              <Input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="Juan" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Segundo Nombre</Label>
              <Input required value={form.secondName} onChange={(e) => update("secondName", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="Carlos" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Primer Apellido</Label>
              <Input required value={form.firstLastName} onChange={(e) => update("firstLastName", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="Pérez" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Segundo Apellido</Label>
              <Input required value={form.secondLastName} onChange={(e) => update("secondLastName", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="Gómez" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Fecha de Cumpleaños</Label>
              <Input required type="date" value={form.birthday} onChange={(e) => update("birthday", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Número de Teléfono</Label>
              <Input required type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="+504 0000-0000" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Tipo de Usuario</Label>
              <Select value={form.role} onValueChange={(v) => update("role", v)}>
                <SelectTrigger className="h-10 text-sm bg-white/10 border-white/15 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integrante">Aspirante GM</SelectItem>
                  <SelectItem value="gm_investido">GM Investido</SelectItem>
                  {!directorTaken && <SelectItem value="director">Director</SelectItem>}
                  {!subdirectorTaken && <SelectItem value="subdirector">Subdirector</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/85">PIN (4 dígitos)</Label>
                <Input required type="password" inputMode="numeric" maxLength={4} value={form.pin} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); if (val.length <= 4) update("pin", val); }} className="h-10 text-sm tracking-[0.4em] text-center bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="••••" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/85">Confirmar PIN</Label>
                <Input required type="password" inputMode="numeric" maxLength={4} value={form.confirmPin} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); if (val.length <= 4) update("confirmPin", val); }} className="h-10 text-sm tracking-[0.4em] text-center bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="••••" />
              </div>
            </div>

            <div className="pt-2 border-t border-white/15">
              <p className="text-xs text-white/70 mb-3">Pregunta de seguridad para recuperar tu PIN</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/85">Tu pregunta secreta</Label>
                <Textarea required value={form.securityQuestion} onChange={(e) => update("securityQuestion", e.target.value)} className="text-sm min-h-[60px] bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="Ej: ¿Cuál es el nombre de mi primera mascota?" />
              </div>
              <div className="space-y-1.5 mt-3">
                <Label className="text-xs font-medium text-white/85">Tu respuesta</Label>
                <Input required value={form.securityAnswer} onChange={(e) => update("securityAnswer", e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="Tu respuesta secreta" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold border-0 text-white hover:opacity-95 transition-opacity aurora-tap mt-2"
              style={{ background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))" }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> Crear Cuenta</>}
            </Button>
          </form>
      </div>
    </AuroraAuthLayout>
  );
};

export default Register;

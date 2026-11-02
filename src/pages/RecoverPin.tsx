import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuroraAuthLayout from "@/components/aurora/AuroraAuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RecoverPin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const fetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("recover-pin", {
      body: { phone, action: "get_question" },
    });
    setLoading(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Error"); return; }
    setQuestion(data.question);
    setStep(2);
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) { toast.error("PIN debe ser de 4 dígitos"); return; }
    if (newPin !== confirmPin) { toast.error("Los PINs no coinciden"); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("recover-pin", {
      body: { phone, action: "reset", securityAnswer: answer, newPin },
    });
    setLoading(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Error"); return; }
    toast.success("¡PIN actualizado! Inicia sesión con tu nuevo PIN.");
    navigate("/");
  };

  return (
    <AuroraAuthLayout
      title="Recuperar PIN"
      subtitle="Responde tu pregunta de seguridad"
      brandFallbackIcon={<KeyRound className="w-8 h-8 text-white" />}
      footer={
        <button onClick={() => navigate("/")} className="text-white/80 hover:text-white underline-offset-2 hover:underline">
          ← Volver a iniciar sesión
        </button>
      }
    >
          {step === 1 && (
            <form onSubmit={fetchQuestion} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/85">Tu número de teléfono</Label>
                <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="+504 0000-0000" />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white border-0 aurora-tap"
                style={{ background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuar"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitReset} className="space-y-4">
              <div className="p-3 rounded-lg bg-white/10 border border-white/15">
                <p className="text-xs text-white/65 mb-1">Tu pregunta de seguridad:</p>
                <p className="text-sm font-medium text-white">{question}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/85">Tu respuesta</Label>
                <Input required value={answer} onChange={(e) => setAnswer(e.target.value)} className="h-10 text-sm bg-white/10 border-white/15 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-white/85">Nuevo PIN</Label>
                  <Input required type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-10 text-center tracking-[0.4em] bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="••••" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-white/85">Confirmar PIN</Label>
                  <Input required type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-10 text-center tracking-[0.4em] bg-white/10 border-white/15 text-white placeholder:text-white/40" placeholder="••••" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white border-0 aurora-tap"
                style={{ background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" /> Cambiar PIN</>}
              </Button>
            </form>
          )}
    </AuroraAuthLayout>
  );
};

export default RecoverPin;

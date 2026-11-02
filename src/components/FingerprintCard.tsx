import { useEffect, useState } from "react";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { registerFingerprint, webauthnSupported } from "@/lib/webauthn";
import { toast } from "sonner";

interface Cred {
  id: string;
  device_label: string;
  created_at: string;
  last_used_at: string | null;
}

const FingerprintCard = () => {
  const { user } = useAuth();
  const [creds, setCreds] = useState<Cred[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("webauthn_credentials")
      .select("id,device_label,created_at,last_used_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCreds((data || []) as Cred[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const enroll = async () => {
    if (!webauthnSupported()) {
      toast.error("Tu navegador no soporta huella dactilar");
      return;
    }
    setLoading(true);
    try {
      await registerFingerprint(label || `Dispositivo ${new Date().toLocaleDateString()}`);
      toast.success("Huella registrada en este dispositivo");
      setLabel("");
      load();
    } catch (e: any) {
      toast.error(e.message || "No se pudo registrar la huella");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("webauthn_credentials").delete().eq("id", id);
    load();
  };

  if (!webauthnSupported()) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Inicio de sesión con huella</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Registra este dispositivo para entrar con tu huella en lugar del PIN.
        La huella se guarda en el chip seguro del dispositivo; no se envía a la plataforma.
      </p>
      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nombre del dispositivo (opcional)"
          className="flex-1"
        />
        <Button onClick={enroll} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activar"}
        </Button>
      </div>
      {creds.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground">Dispositivos registrados</p>
          {creds.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{c.device_label}</p>
                <p className="text-[10px] text-muted-foreground">
                  Registrado {new Date(c.created_at).toLocaleDateString()}
                  {c.last_used_at && ` · Último uso ${new Date(c.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default FingerprintCard;
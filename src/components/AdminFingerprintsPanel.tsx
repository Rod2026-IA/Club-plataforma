import { useEffect, useState } from "react";
import { Fingerprint, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  user_id: string;
  device_label: string;
  created_at: string;
  last_used_at: string | null;
}

const AdminFingerprintsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; phone: string }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("webauthn_credentials")
        .select("id,user_id,device_label,created_at,last_used_at")
        .order("created_at", { ascending: false });
      const list = (data || []) as Row[];
      setRows(list);
      if (list.length) {
        const ids = Array.from(new Set(list.map((r) => r.user_id)));
        const { data: ps } = await supabase
          .from("profiles")
          .select("user_id,first_name,first_last_name,phone")
          .in("user_id", ids);
        const map: Record<string, { name: string; phone: string }> = {};
        (ps || []).forEach((p: any) => {
          map[p.user_id] = {
            name: `${p.first_name || ""} ${p.first_last_name || ""}`.trim(),
            phone: p.phone || "",
          };
        });
        setProfiles(map);
      }
    })();
  }, []);

  return (
    <Card className="p-4">
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Huellas registradas</h3>
            <span className="text-xs text-muted-foreground">({rows.length})</span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Por seguridad del sistema operativo, no es posible obtener una imagen real de la huella.
            Solo se almacena una credencial criptográfica del dispositivo.
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aún no hay usuarios con huella registrada.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {rows.map((r) => (
                <div key={r.id} className="text-sm bg-muted/30 rounded-lg p-2">
                  <p className="font-medium">{profiles[r.user_id]?.name || "—"} <span className="text-xs text-muted-foreground">({profiles[r.user_id]?.phone})</span></p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.device_label} · Registrado {new Date(r.created_at).toLocaleDateString()}
                    {r.last_used_at && ` · Último uso ${new Date(r.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdminFingerprintsPanel;
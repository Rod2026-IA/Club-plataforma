import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, User as UserIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface MemberRow {
  user_id: string;
  first_name: string;
  first_last_name: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  role: string;
  position?: string | null;
  unit_name?: string | null;
  unit_logo?: string | null;
}

const GROUPS: { key: string; title: string; color: string }[] = [
  { key: "director", title: "Directores", color: "var(--aurora-gold)" },
  { key: "subdirector", title: "Sub Directores", color: "var(--aurora-peach)" },
  { key: "gm_investido", title: "GM Investidos", color: "var(--aurora-cyan)" },
  { key: "integrante", title: "Aspirantes GM", color: "var(--aurora-violet)" },
];

const Comunidad = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) console.error("[Comunidad] roles", rolesErr);
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => {
        const priority: Record<string, number> = {
          director: 4, subdirector: 3, gm_investido: 2, integrante: 1,
        };
        const existing = roleMap.get(r.user_id);
        if (!existing || (priority[r.role] || 0) > (priority[existing] || 0)) {
          roleMap.set(r.user_id, r.role);
        }
      });
      const ids = Array.from(roleMap.keys());
      if (ids.length === 0) { setMembers([]); setLoading(false); return; }
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, first_name, first_last_name, avatar_url, last_seen_at")
        .in("user_id", ids)
        .order("first_name");
      if (profErr) console.error("[Comunidad] profiles", profErr);
      const { data: positions } = await supabase
        .from("unit_members")
        .select("user_id, position, unit_id")
        .in("user_id", ids);
      const posMap = new Map<string, string>();
      const unitIdMap = new Map<string, string>();
      (positions || []).forEach((p: any) => {
        posMap.set(p.user_id, p.position);
        if (p.unit_id) unitIdMap.set(p.user_id, p.unit_id);
      });
      const unitIds = Array.from(new Set(Array.from(unitIdMap.values())));
      const unitMap = new Map<string, { name: string; logo_url: string }>();
      if (unitIds.length > 0) {
        const { data: units } = await supabase
          .from("units")
          .select("id, name, logo_url")
          .in("id", unitIds);
        (units || []).forEach((u: any) => unitMap.set(u.id, { name: u.name, logo_url: u.logo_url || "" }));
      }
      const rows: MemberRow[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        first_name: p.first_name || "",
        first_last_name: p.first_last_name || "",
        avatar_url: p.avatar_url,
        last_seen_at: p.last_seen_at,
        role: roleMap.get(p.user_id) || "integrante",
        position: posMap.get(p.user_id) || null,
        unit_name: unitMap.get(unitIdMap.get(p.user_id) || "")?.name || null,
        unit_logo: unitMap.get(unitIdMap.get(p.user_id) || "")?.logo_url || null,
      }));
      setMembers(rows);
      setLoading(false);
    })();
  }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.first_last_name.toLowerCase().includes(q)
    );
  });

  const isOnline = (ts: string | null) =>
    !!ts && Date.now() - new Date(ts).getTime() < 5 * 60 * 1000;

  const cargoLabel = (m: MemberRow) => {
    if (m.role === "director") return "Director";
    if (m.role === "subdirector") return "Sub Director";
    if (m.position === "capitan") return "Capitán";
    if (m.position === "secretario") return "Secretario";
    return "Integrante";
  };

  return (
    <div
      className="aurora-screen-enter min-h-screen"
      style={{ background: "var(--aurora-bg)", paddingBottom: 96, color: "var(--aurora-text)" }}
    >
      <div style={{ padding: "18px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => navigate("/dashboard")}
          className="aurora-tap"
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
            color: "var(--aurora-text)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-grotesk" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Comunidad
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--aurora-text-mute)" }}>
            Directores · Sub Directores · GM Investidos · Aspirantes
          </p>
        </div>
      </div>

      <div style={{ padding: "16px 18px 0" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div style={{ padding: "18px" }}>
          {GROUPS.map((g) => {
            const list = filtered.filter((m) => m.role === g.key);
            if (list.length === 0) return null;
            return (
              <div key={g.key} style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: 999, background: g.color,
                      boxShadow: `0 0 10px ${g.color}`,
                    }}
                  />
                  <h2 className="font-grotesk" style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", color: "var(--aurora-text-mute)" }}>
                    {g.title}
                  </h2>
                  <span style={{ fontSize: 12, color: "var(--aurora-text-mute)" }}>· {list.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {list.map((m) => (
                    <Card
                      key={m.user_id}
                      onClick={() => navigate(`/comunidad/${m.user_id}`)}
                      className="glass-card p-3 cursor-pointer hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <span
                            title={isOnline(m.last_seen_at) ? "En línea" : "Desconectado"}
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
                            style={{ background: isOnline(m.last_seen_at) ? "#22c55e" : "#9ca3af" }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">
                            {m.first_name} {m.first_last_name}
                          </p>
                          {(m.role === "gm_investido" || m.role === "integrante") && (
                            <p className="text-xs truncate" style={{ color: "var(--aurora-text-mute)" }}>
                              {cargoLabel(m)}
                            </p>
                          )}
                          {m.unit_name && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {m.unit_logo ? (
                                <img
                                  src={m.unit_logo}
                                  alt=""
                                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0"
                                  style={{ background: "var(--aurora-line)" }}
                                />
                              )}
                              <span className="text-[11px] truncate" style={{ color: "var(--aurora-text-mute)" }}>
                                {m.unit_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Sin miembros</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Comunidad;
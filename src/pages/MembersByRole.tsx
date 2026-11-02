import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, User as UserIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MemberRow {
  user_id: string;
  first_name: string;
  first_last_name: string;
  avatar_url: string | null;
  cargo: string;
  last_seen_at: string | null;
}

const ROLE_META: Record<string, { dbRole: string; title: string; subtitle: string }> = {
  aspirantes: {
    dbRole: "integrante",
    title: "Aspirantes GM",
    subtitle: "Perfiles de los aspirantes a Guía Mayor",
  },
  investidos: {
    dbRole: "gm_investido",
    title: "GM Investidos",
    subtitle: "Perfiles de los Guías Mayores investidos",
  },
};

const MembersByRole = () => {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const meta = roleSlug ? ROLE_META[roleSlug] : null;

  useEffect(() => {
    if (authLoading) return;
    const allowed = ["super_admin", "director", "subdirector"];
    if (!allowed.includes(role || "")) {
      toast.error("Acceso denegado");
      navigate("/dashboard");
      return;
    }
    if (!meta) {
      navigate("/dashboard");
      return;
    }
    loadMembers();
  }, [role, authLoading, roleSlug]);

  const loadMembers = async () => {
    if (!meta) return;
    setLoading(true);
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", meta.dbRole as any);
    if (rolesErr) console.error("[MembersByRole] roles error", rolesErr);
    const ids = (roles || []).map((r) => r.user_id);
    console.log("[MembersByRole] role", meta.dbRole, "ids", ids.length);
    if (ids.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, first_name, first_last_name, avatar_url, last_seen_at")
      .in("user_id", ids)
      .order("first_name");
    if (profErr) console.error("[MembersByRole] profiles error", profErr);
    const { data: positions } = await supabase
      .from("unit_members")
      .select("user_id, position")
      .in("user_id", ids);
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    console.log("[MembersByRole] profiles", profiles?.length);
    const posMap = new Map<string, string>();
    (positions || []).forEach((p: any) => posMap.set(p.user_id, p.position));
    const roleMap = new Map<string, string>();
    (allRoles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    const roleLabel = (r?: string) =>
      r === "super_admin" ? "Super Admin"
      : r === "director" ? "Director"
      : r === "subdirector" ? "Sub Director"
      : "";
    const posLabel = (p?: string) =>
      p === "capitan" ? "Capitán"
      : p === "secretario" ? "Secretario"
      : p === "miembro" ? "Integrante"
      : "";
    const rows: MemberRow[] = (profiles || []).map((p: any) => {
      const adminLbl = roleLabel(roleMap.get(p.user_id));
      const posLbl = posLabel(posMap.get(p.user_id));
      const cargo = adminLbl || posLbl || "Integrante";
      return {
        user_id: p.user_id,
        first_name: p.first_name,
        first_last_name: p.first_last_name,
        avatar_url: p.avatar_url,
        last_seen_at: p.last_seen_at,
        cargo,
      };
    });
    setMembers(rows);
    setLoading(false);
  };

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.first_name.toLowerCase().includes(q) ||
      m.first_last_name.toLowerCase().includes(q) ||
      m.cargo.toLowerCase().includes(q)
    );
  });

  const isOnline = (ts: string | null) => {
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000;
  };

  const relativeTime = (ts: string | null) => {
    if (!ts) return "Sin conexión registrada";
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Activo ahora";
    if (m < 60) return `Activo hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Activo hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Activo hace ${d} d`;
    const w = Math.floor(d / 7);
    if (w < 5) return `Activo hace ${w} sem`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `Activo hace ${mo} mes${mo > 1 ? "es" : ""}`;
    const y = Math.floor(d / 365);
    return `Activo hace ${y} a`;
  };

  if (!meta) return null;

  return (
    <div className="min-h-screen gradient-navy p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold neon-text-cyan">{meta.title}</h1>
            <p className="text-muted-foreground font-body text-sm">{meta.subtitle}</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cargo…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((m) => (
              <Card
                key={m.user_id}
                onClick={() => navigate(`/guia-mayor?userId=${m.user_id}`)}
                className="glass-card p-4 cursor-pointer hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <span
                      title={isOnline(m.last_seen_at) ? "En línea" : "Desconectado"}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background"
                      style={{ background: isOnline(m.last_seen_at) ? "#22c55e" : "#9ca3af" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{m.first_name} {m.first_last_name}</p>
                    <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--primary))" }}>{m.cargo}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/perfil-miembro/${m.user_id}`); }}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-muted-foreground shrink-0"
                  >
                    Perfil
                  </button>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8 col-span-full">Sin miembros</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MembersByRole;

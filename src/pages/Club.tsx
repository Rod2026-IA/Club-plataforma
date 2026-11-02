import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, User as UserIcon, Search, Award, Star, BookOpen, Check, ClipboardList, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CLASSES, type ClassId } from "@/data/classCardsData";
import { toast } from "@/hooks/use-toast";
import { CategoryTile } from "@/components/aurora/CategoryCards";

type Track = "progresiva" | "avanzada" | "guia_mayor";

interface Member {
  user_id: string;
  first_name: string;
  first_last_name: string;
  avatar_url: string | null;
  role: string;
}

interface Enrollment {
  user_id: string;
  track: Track;
  class_id: string | null;
}

const TRACKS: { key: Track; title: string; icon: any; color: string }[] = [
  { key: "progresiva", title: "Progresivas", icon: Star, color: "var(--aurora-mint)" },
  { key: "avanzada", title: "Avanzadas", icon: BookOpen, color: "var(--aurora-cyan)" },
  { key: "guia_mayor", title: "Tarjeta de Guía Mayor", icon: Award, color: "var(--aurora-gold)" },
];

const TRACK_META: Record<Track, { sub: string; grad: string }> = {
  progresiva: {
    sub: "Amigo, Compañero, Explorador…",
    grad: "linear-gradient(135deg, var(--aurora-mint), var(--aurora-cyan))",
  },
  avanzada: {
    sub: "Clases avanzadas del conquistador",
    grad: "linear-gradient(135deg, var(--aurora-cyan), var(--aurora-violet))",
  },
  guia_mayor: {
    sub: "Aspirantes a Guía Mayor",
    grad: "linear-gradient(135deg, var(--aurora-gold), var(--aurora-peach))",
  },
};

export default function Club() {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  // key = `${userId}|${track}` → list of class_ids assigned in that track
  const [enrollments, setEnrollments] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Track | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canEdit = role === "director" || role === "subdirector" || role === "super_admin";

  useEffect(() => {
    if (authLoading) return;
    if (!canEdit) navigate("/dashboard");
  }, [role, authLoading, canEdit, navigate]);

  const reload = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["gm_investido", "integrante"]);
    const roleMap = new Map<string, string>();
    (roles || []).forEach((r: any) => {
      const ex = roleMap.get(r.user_id);
      if (!ex || (r.role === "gm_investido" && ex === "integrante")) {
        roleMap.set(r.user_id, r.role);
      }
    });
    const ids = Array.from(roleMap.keys());
    if (ids.length === 0) {
      setMembers([]); setEnrollments(new Map()); setLoading(false); return;
    }
    const [{ data: profiles }, { data: enrs }] = await Promise.all([
      supabase.from("profiles")
        .select("user_id, first_name, first_last_name, avatar_url")
        .in("user_id", ids).order("first_name"),
      supabase.from("user_class_enrollments")
        .select("user_id, track, class_id")
        .in("user_id", ids),
    ]);
    setMembers((profiles || []).map((p: any) => ({
      user_id: p.user_id,
      first_name: p.first_name || "",
      first_last_name: p.first_last_name || "",
      avatar_url: p.avatar_url,
      role: roleMap.get(p.user_id) || "integrante",
    })));
    const em = new Map<string, string[]>();
    (enrs || []).forEach((e: any) => {
      const k = `${e.user_id}|${e.track}`;
      const arr = em.get(k) || [];
      arr.push(e.class_id || "");
      em.set(k, arr);
    });
    setEnrollments(em);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = members;
    if (tab === "avanzada") list = list.filter((m) => m.role === "gm_investido");
    else if (tab === "guia_mayor") list = list.filter((m) => m.role === "integrante");
    if (q) list = list.filter((m) => `${m.first_name} ${m.first_last_name}`.toLowerCase().includes(q));
    return list;
  }, [members, search, tab]);

  const toggleClass = async (userId: string, track: Track, classId: string, checked: boolean) => {
    const key = `${userId}|${track}`;
    setSavingKey(key + "|" + classId);
    try {
      const current = enrollments.get(key) || [];
      if (checked) {
        if (current.includes(classId)) return;
        const assigner = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from("user_class_enrollments")
          .insert({ user_id: userId, track, class_id: classId, assigned_by: assigner });
        if (error) throw error;
        const m = new Map(enrollments); m.set(key, [...current, classId]); setEnrollments(m);
      } else {
        const { error } = await supabase.from("user_class_enrollments")
          .delete().eq("user_id", userId).eq("track", track).eq("class_id", classId);
        if (error) throw error;
        const next = current.filter((c) => c !== classId);
        const m = new Map(enrollments);
        if (next.length === 0) m.delete(key); else m.set(key, next);
        setEnrollments(m);
      }
      toast({ title: "Asignación guardada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div
      className="aurora-screen-enter min-h-screen"
      style={{ background: "var(--aurora-bg)", paddingBottom: 96, color: "var(--aurora-text)" }}
    >
      <div style={{ padding: "18px 18px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => (tab ? setTab(null) : navigate("/dashboard"))}
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
            {tab ? TRACKS.find((t) => t.key === tab)?.title : "Club"}
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--aurora-text-mute)" }}>
            {tab ? "Asigna la clase a cada miembro" : "Progresivas · Avanzadas · Guía Mayor"}
          </p>
        </div>
      </div>

      {!tab && (
        <div style={{ padding: "20px 18px 0" }}>
          <div className="grid grid-cols-2 gap-3">
            {TRACKS.map((t) => {
              const Icon = t.icon;
              const meta = TRACK_META[t.key];
              const count = Array.from(enrollments.entries())
                .filter(([k]) => k.endsWith(`|${t.key}`))
                .reduce((acc, [, arr]) => acc + arr.length, 0);
              return (
                <CategoryTile
                  key={t.key}
                  onClick={() => { setSearch(""); setTab(t.key); }}
                  grad={meta.grad}
                  icon={<Icon size={20} />}
                  title={t.title}
                  sub={meta.sub}
                  footer={loading ? "Cargando…" : `${count} inscritos`}
                />
              );
            })}
          </div>
        </div>
      )}

      {tab && (() => {
        const activeTab: Track = tab;
        return (
      <>
      <div style={{ padding: "14px 18px 0" }}>
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
        <div style={{ padding: 18 }}>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Sin miembros</p>
          )}
          <div className="space-y-2.5">
            {filtered.map((m) => {
              const key = `${m.user_id}|${activeTab}`;
              const assigned = enrollments.get(key) || [];
              const isGM = activeTab === "guia_mayor";
              const enrolled = isGM && assigned.length > 0;
              const cardPath = activeTab === "avanzada" ? "/clases-avanzadas" : "/clases-progresivas";
              return (
                <Card key={m.user_id} className="glass-card p-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <button
                      onClick={() => navigate(`/u/${m.user_id}`)}
                      className="w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 mt-0.5"
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {m.first_name} {m.first_last_name}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: "var(--aurora-text-mute)" }}>
                        {m.role === "gm_investido" ? "GM Investido" : "Aspirante"}
                      </p>
                      {!isGM && assigned.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {assigned.map((cid) => {
                            const label = CLASSES.find((c) => c.id === cid)?.label || cid;
                            return (
                              <button
                                key={cid}
                                onClick={() => navigate(`${cardPath}?userId=${m.user_id}&class=${cid}`)}
                                className="aurora-tap inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                                style={{
                                  background: "color-mix(in srgb, var(--aurora-cyan) 18%, transparent)",
                                  border: "1px solid var(--aurora-cyan)",
                                  color: "var(--aurora-cyan)",
                                }}
                              >
                                <ClipboardList className="w-3 h-3" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {isGM ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={enrolled ? "default" : "outline"}
                          disabled={!!savingKey && savingKey.startsWith(key)}
                          onClick={() => toggleClass(m.user_id, "guia_mayor", "inscrito", !enrolled)}
                        >
                          {savingKey?.startsWith(key) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : enrolled ? (
                            <><Check className="w-3.5 h-3.5 mr-1" />Inscrito</>
                          ) : (
                            "Asignar"
                          )}
                        </Button>
                        {enrolled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/guia-mayor?userId=${m.user_id}`)}
                          >
                            <ClipboardList className="w-3.5 h-3.5 mr-1" />
                            Tarjeta
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {assigned.length > 0 ? "Editar clases" : "Asignar clases"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-3">
                          <p className="text-xs font-semibold mb-2 text-muted-foreground">
                            Selecciona una o varias clases
                          </p>
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {CLASSES.map((c) => {
                              const checked = assigned.includes(c.id);
                              const saving = savingKey === `${key}|${c.id}`;
                              return (
                                <label
                                  key={c.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer py-1"
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={saving}
                                    onCheckedChange={(v) =>
                                      toggleClass(m.user_id, activeTab, c.id, !!v)
                                    }
                                  />
                                  <span className="flex-1">{c.label}</span>
                                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      </>
        );
      })()}
    </div>
  );
}
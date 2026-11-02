import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User as UserIcon, Loader2, Award, GraduationCap, Cake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initialSections, type Section } from "@/data/guiaMayorData";
import { CLASS_DATA, CLASSES, type ClassId, type CardType } from "@/data/classCardsData";

interface Profile {
  user_id: string;
  first_name: string;
  first_last_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  birthday?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  director: "Director",
  subdirector: "Sub Director",
  gm_investido: "GM Investido",
  integrante: "Aspirante GM",
};

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 5, director: 4, subdirector: 3, gm_investido: 2, integrante: 1,
};

const POSITION_LABELS: Record<string, string> = {
  capitan: "Capitán",
  secretario: "Secretario",
  miembro: "Integrante",
};

const sectionsTotal = (secs: Section[]) =>
  secs.reduce((acc, s) => acc + s.requirements.reduce((a, r) => a + 1 + (r.subitems?.length || 0), 0), 0);

interface ProgressEntry {
  section_id: string;
  req_id: string;
  sub_id: string;
  completed: boolean;
}

interface Enrollment {
  track: "progresiva" | "avanzada" | "guia_mayor";
  class_id: string | null;
}

const countCompleted = (entries: ProgressEntry[]) =>
  entries.filter((e) => e.completed).length;

function Ring({ value, color, size = 96, stroke = 9, label }: { value: number; color: string; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--aurora-line)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--aurora-text)" }}>{Math.round(value)}%</span>
        {label && <span style={{ fontSize: 9, color: "var(--aurora-text-mute)" }}>{label}</span>}
      </div>
    </div>
  );
}

const UserPublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [gmEntries, setGmEntries] = useState<ProgressEntry[]>([]);
  const [classEntries, setClassEntries] = useState<Array<ProgressEntry & { class_id: string; card_type: string }>>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [p, rs, um, gm, cc, en] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, first_last_name, avatar_url, banner_url, birthday").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("unit_members").select("position").eq("user_id", userId).maybeSingle(),
        supabase.from("guia_mayor_progress").select("section_id, req_id, sub_id, completed").eq("user_id", userId),
        supabase.from("class_card_progress").select("section_id, req_id, sub_id, completed, class_id, card_type").eq("user_id", userId),
        supabase.from("user_class_enrollments").select("track, class_id").eq("user_id", userId),
      ]);
      setProfile((p.data as Profile) || null);
      const roles = ((rs.data || []) as { role: string }[]).map((r) => r.role);
      const best = roles.sort((a, b) => (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0))[0] || null;
      setRole(best);
      setPosition(((um.data as any)?.position as string) || null);
      setGmEntries((gm.data || []) as ProgressEntry[]);
      setClassEntries((cc.data || []) as any);
      setEnrollments((en.data || []) as Enrollment[]);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--aurora-bg)" }}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-screen p-4" style={{ background: "var(--aurora-bg)", color: "var(--aurora-text)" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-center mt-10" style={{ color: "var(--aurora-text-mute)" }}>Perfil no encontrado</p>
      </div>
    );
  }

  // GM card progress
  const gmTotal = sectionsTotal(initialSections);
  const gmDone = countCompleted(gmEntries);
  const gmPct = gmTotal > 0 ? Math.min(100, (gmDone / gmTotal) * 100) : 0;

  // Class progress grouped by class+cardType (only those with any activity)
  const classGroups = new Map<string, { class_id: ClassId; card_type: CardType; done: number; total: number }>();
  for (const e of classEntries) {
    const key = `${e.class_id}|${e.card_type}`;
    if (!classGroups.has(key)) {
      const secs = (CLASS_DATA as any)[e.class_id]?.[e.card_type] as Section[] | undefined;
      classGroups.set(key, {
        class_id: e.class_id as ClassId,
        card_type: e.card_type as CardType,
        done: 0,
        total: secs ? sectionsTotal(secs) : 0,
      });
    }
    if (e.completed) classGroups.get(key)!.done += 1;
  }
  const classCards = Array.from(classGroups.values()).filter((c) => c.total > 0);

  const isGM = role === "gm_investido";
  const isAspirante = role === "integrante";
  const cargo = position ? POSITION_LABELS[position] : null;

  const accent = isGM ? "var(--aurora-gold)" : isAspirante ? "var(--aurora-violet)" : "var(--aurora-cyan)";

  return (
    <div
      className="aurora-screen-enter min-h-screen"
      style={{ background: "var(--aurora-bg)", paddingBottom: 96, color: "var(--aurora-text)" }}
    >
      {/* Banner / header */}
      <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
        {profile.banner_url ? (
          <img src={profile.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${accent}, var(--aurora-violet-deep))` }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), var(--aurora-bg) 95%)" }} />
        <button
          onClick={() => navigate(-1)}
          className="aurora-tap"
          style={{
            position: "absolute", top: 14, left: 14,
            width: 38, height: 38, borderRadius: 12,
            background: "rgba(0,0,0,0.35)", border: "1px solid var(--aurora-line)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center text-center px-5" style={{ marginTop: "clamp(-48px, -10vw, -64px)" }}>
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-full"
          style={{
            width: "clamp(88px, 28vw, 132px)",
            height: "clamp(88px, 28vw, 132px)",
            aspectRatio: "1 / 1",
            background: "var(--aurora-surface)",
            border: "4px solid var(--aurora-bg)",
            boxShadow: `0 0 0 2px ${accent}, 0 14px 30px rgba(0,0,0,0.4)`,
          }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 15%" }}
            />
          ) : (
            <UserIcon className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: "var(--aurora-text-mute)" }} />
          )}
        </div>
        <h1 className="font-grotesk" style={{ margin: "14px 0 4px", fontSize: 22, fontWeight: 800 }}>
          {profile.first_name} {profile.first_last_name}
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {role && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
              background: `${accent}22`, color: accent, border: `1px solid ${accent}55`,
            }}>
              {ROLE_LABELS[role] || role}
            </span>
          )}
          {cargo && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
              background: "var(--aurora-surface)", color: "var(--aurora-text)",
              border: "1px solid var(--aurora-line)",
            }}>
              {cargo}
            </span>
          )}
        </div>
        {profile.birthday && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 10, padding: "6px 12px", borderRadius: 999,
              background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
              fontSize: 12, color: "var(--aurora-text)",
            }}
          >
            <Cake size={14} style={{ color: "var(--aurora-peach)" }} />
            <span>
              {new Date(profile.birthday + "T00:00:00").toLocaleDateString("es-ES", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Progress section */}
      <div style={{ padding: "24px 18px 0" }}>
        {enrollments.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 className="font-grotesk" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--aurora-text-mute)", marginBottom: 10 }}>
              Clases inscritas
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {enrollments.map((e) => {
                const isGM = e.track === "guia_mayor";
                const label = isGM
                  ? "Tarjeta de Guía Mayor"
                  : `${CLASSES.find((c) => c.id === e.class_id)?.label || e.class_id || "Sin asignar"} · ${e.track === "avanzada" ? "Avanzada" : "Progresiva"}`;
                const color = isGM ? "var(--aurora-gold)" : e.track === "avanzada" ? "var(--aurora-cyan)" : "var(--aurora-mint)";
                const Icon = isGM ? Award : GraduationCap;
                const href = isGM
                  ? `/guia-mayor?userId=${userId}`
                  : `${e.track === "avanzada" ? "/clases-avanzadas" : "/clases-progresivas"}?userId=${userId}${e.class_id ? `&class=${e.class_id}` : ""}`;
                return (
                  <button
                    key={e.track + (e.class_id || "")}
                    onClick={() => navigate(href)}
                    className="aurora-tap"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 999,
                      background: `${color}18`, border: `1px solid ${color}55`,
                      color, fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <h2 className="font-grotesk" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--aurora-text-mute)", marginBottom: 12 }}>
          Avance general
        </h2>

        {/* GM card (always shown for GM Investido, or if has any GM progress) */}
        {(isGM || gmDone > 0) && (
          <div
            style={{
              padding: 16, borderRadius: 18, marginBottom: 12,
              background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <Ring value={gmPct} color="var(--aurora-gold)" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Award size={16} style={{ color: "var(--aurora-gold)" }} />
                <p className="font-grotesk" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  Tarjeta Guía Mayor
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--aurora-text-mute)" }}>
                {gmDone} de {gmTotal} requisitos completados
              </p>
            </div>
          </div>
        )}

        {classCards.length > 0 && classCards.map((c) => {
          const pct = c.total > 0 ? Math.min(100, (c.done / c.total) * 100) : 0;
          const className = CLASSES.find((cl) => cl.id === c.class_id)?.label || c.class_id;
          const isAvanzada = c.card_type === "avanzada";
          const color = isAvanzada ? "var(--aurora-cyan)" : "var(--aurora-mint)";
          return (
            <div
              key={`${c.class_id}-${c.card_type}`}
              style={{
                padding: 16, borderRadius: 18, marginBottom: 12,
                background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <Ring value={pct} color={color} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <GraduationCap size={16} style={{ color }} />
                  <p className="font-grotesk" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    {className} · {isAvanzada ? "Avanzada" : "Progresiva"}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--aurora-text-mute)" }}>
                  {c.done} de {c.total} requisitos completados
                </p>
              </div>
            </div>
          );
        })}

        {!isGM && gmDone === 0 && classCards.length === 0 && (
          <p style={{ textAlign: "center", padding: "30px 10px", color: "var(--aurora-text-mute)", fontSize: 13 }}>
            Aún no hay avances registrados.
          </p>
        )}
      </div>
    </div>
  );
};

export default UserPublicProfile;
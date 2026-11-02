import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BookOpen, Award, Star, Calendar, Users, Heart, Coins, LogOut, ShieldCheck,
  Eye, EyeOff,
  QrCode, ScanLine, FileBarChart, Megaphone, ClipboardList, GraduationCap, UserCog,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AdminDashboardSettings from "@/components/AdminDashboardSettings";
import WelcomeEnvelope from "@/components/WelcomeEnvelope";
import AnnouncementsBell from "@/components/AnnouncementsBell";
import AuroraHero from "@/components/aurora/AuroraHero";
import { CategoryHero, CategoryTile } from "@/components/aurora/CategoryCards";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
import { toast } from "@/hooks/use-toast";

const defaultIcons: Record<string, any> = {
  "guia-mayor": Award,
  "clases-progresivas": Star,
  "clases-avanzadas": BookOpen,
  "ano-biblico": Calendar,
  "mi-unidad": Users,
  "ideales": Heart,
  "conqui-kash": Coins,
};

const sectionsMeta: Record<string, { title: string; description: string; path: string; grad: string }> = {
  "guia-mayor": { title: "Tarjeta de Guía Mayor", description: "Tu progreso como Guía Mayor", path: "/guia-mayor", grad: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-lavender))" },
  "clases-progresivas": { title: "Clases Progresivas", description: "Amigo, Compañero, Explorador…", path: "/clases-progresivas", grad: "linear-gradient(135deg, var(--aurora-cyan), var(--aurora-mint))" },
  "clases-avanzadas": { title: "Clases Avanzadas", description: "Clases avanzadas de Conquistadores", path: "/clases-avanzadas", grad: "linear-gradient(135deg, var(--aurora-peach), var(--aurora-gold))" },
  "ano-biblico": { title: "Año Bíblico", description: "Lectura diaria con progreso", path: "/ano-biblico", grad: "linear-gradient(135deg, var(--aurora-violet-deep), var(--aurora-violet))" },
};

interface DashboardSetting {
  id: string;
  section_key: string;
  enabled: boolean;
  custom_icon_url: string;
  audience: "aspirante" | "investido";
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, role, signOut, loading } = useAuth();
  const { branding, refresh: refreshBranding } = usePlatformBranding();
  const [settings, setSettings] = useState<DashboardSetting[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [unreadStreak, setUnreadStreak] = useState(0);
  const [kashBalance, setKashBalance] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [currentClass, setCurrentClass] = useState<string>("Sin clase");
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [previewAudience, setPreviewAudience] = useState<"aspirante" | "investido" | null>(() => {
    const v = sessionStorage.getItem("preview_audience");
    return v === "aspirante" || v === "investido" ? v : null;
  });

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  // Mostrar el sobre de bienvenida una vez al día por usuario
  useEffect(() => {
    if (!user) return;
    if (!branding.welcome_enabled) {
      setShowWelcome(false);
      return;
    }
    const key = `welcome_shown_${user.id}_${todayKey}`;
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
      localStorage.setItem(key, "1");
    }
  }, [user?.id, todayKey, branding.welcome_enabled]);

  const fetchSettings = async () => {
    const { data } = await supabase.from("dashboard_settings").select("*");
    if (data) setSettings(data as DashboardSetting[]);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Cargar stats del banner: ConquiKash, Racha y Clase actual
  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      // ConquiKash balance
      const { data: txs } = await supabase
        .from("conqui_kash_transactions")
        .select("amount, tx_type")
        .eq("user_id", user.id);
      const balance = (txs || []).reduce(
        (s, t: any) => s + (t.tx_type === "ingreso" ? Number(t.amount) : -Number(t.amount)),
        0
      );
      setKashBalance(balance);

      // Racha: máximo streak_count entre conversaciones del usuario
      const { data: streaks } = await supabase.rpc("get_my_streaks");
      const maxStreak = ((streaks || []) as Array<{ streak_count: number }>).reduce(
        (m, s) => Math.max(m, s.streak_count || 0),
        0
      );
      setStreakDays(maxStreak);

      // Clase actual: clase progresiva con más requisitos completados
      const { data: progress } = await supabase
        .from("class_card_progress")
        .select("class_id, completed, card_type")
        .eq("user_id", user.id)
        .eq("card_type", "progresiva")
        .eq("completed", true);
      const counts: Record<string, number> = {};
      (progress || []).forEach((p: any) => {
        counts[p.class_id] = (counts[p.class_id] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const labelMap: Record<string, string> = {
          amigo: "Amigo",
          companero: "Compañero",
          explorador: "Explorador",
          pionero: "Pionero",
          excursionista: "Excursionista",
          guia: "Guía",
        };
        setCurrentClass(labelMap[top[0]] || top[0]);
      } else {
        setCurrentClass("Sin clase");
      }
    };
    loadStats();
  }, [user?.id]);

  // Notificación de mensajes de racha sin leer
  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      // Solo contar mensajes sin leer de parejas de racha actuales
      const { data: streaks } = await supabase.rpc("get_my_streaks");
      const partnerIds = ((streaks || []) as Array<{ other_user_id: string }>)
        .map((s) => s.other_user_id);
      if (partnerIds.length === 0) {
        setUnreadStreak(0);
        return;
      }
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false)
        .in("sender_id", partnerIds);
      setUnreadStreak(count || 0);
    };
    loadUnread();
    const channel = supabase
      .channel(`dash-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => loadUnread()
      )
      .subscribe();
    const onFocus = () => loadUnread();
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadUnread();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const toggleWelcome = async () => {
    const next = !branding.welcome_enabled;
    if (branding.id) {
      await supabase.from("platform_branding").update({ welcome_enabled: next }).eq("id", branding.id);
    } else {
      await supabase.from("platform_branding").insert({ welcome_enabled: next });
    }
    await refreshBranding();
    toast({ title: next ? "Mensaje diario activado" : "Mensaje diario oculto" });
  };

  // Determine which audience this user belongs to
  const userAudience: "aspirante" | "investido" =
    role === "gm_investido" ? "investido" : "aspirante";

  // Admins (super_admin/director/subdirector) see the aspirante panel by default
  const isAdminRole = ["super_admin", "director", "subdirector"].includes(role || "");
  const audienceForView: "aspirante" | "investido" =
    isAdminRole
      ? (previewAudience ?? "aspirante")
      : userAudience;

  const cyclePreview = () => {
    const next: "aspirante" | "investido" | null =
      previewAudience === null ? "aspirante"
      : previewAudience === "aspirante" ? "investido"
      : null;
    setPreviewAudience(next);
    if (next) sessionStorage.setItem("preview_audience", next);
    else sessionStorage.removeItem("preview_audience");
    toast({
      title: next
        ? `Vista previa: ${next === "aspirante" ? "Aspirantes" : "GM Investidos"}`
        : "Vista previa desactivada",
    });
  };

  const formatKash = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  const visibleSections = settings.length > 0
    ? settings.filter((s) => s.audience === audienceForView && s.enabled)
    : Object.keys(sectionsMeta).map((key) => ({
        section_key: key, enabled: true, custom_icon_url: "", id: key, audience: "aspirante" as const,
      }));

  const roleLabel =
    role === "super_admin" ? "Super Admin"
    : role === "director" ? "Director"
    : role === "subdirector" ? "Sub Director"
    : role === "gm_investido" ? "GM Investido"
    : "Aspirante GM";

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.first_last_name || ""}`.trim() || "Conquistador"
    : "Conquistador";

  const initials = (
    (profile?.first_name?.[0] || "") + (profile?.first_last_name?.[0] || "")
  ).toUpperCase() || "CG";

  const isAdmin = ["super_admin", "director", "subdirector"].includes(role || "");

  const headerActions = (
    <>
      <AnnouncementsBell />
      <ThemeToggle />
      <button
        onClick={handleLogout}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="aurora-tap relative"
        style={{
          width: 38, height: 38, borderRadius: 12,
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)",
        }}
      >
        <LogOut className="w-4 h-4" />
      </button>
    </>
  );

  return (
    <div
      className="aurora-screen-enter min-h-screen"
      style={{ background: "var(--aurora-bg)", paddingBottom: 96, color: "var(--aurora-text)" }}
    >
      {showWelcome && (
        <WelcomeEnvelope
          name={displayName}
          seed={`${user?.id || "anon"}_${todayKey}`}
          onClose={() => setShowWelcome(false)}
        />
      )}

      <AuroraHero
        role={roleLabel}
        name={displayName}
        initials={initials}
        avatarUrl={profile?.avatar_url}
        actions={headerActions}
        stats={[
          { value: formatKash(kashBalance), label: "ConquiKash", color: "var(--aurora-peach)" },
          { value: `${streakDays}d`, label: "Racha", color: "var(--aurora-lavender)" },
          { value: currentClass, label: "Clase actual", color: "var(--aurora-cyan)" },
        ]}
      />

      {/* Categorías */}
      <div style={{ padding: "22px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h3 className="font-grotesk" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--aurora-text)" }}>
            Categorías
          </h3>
          {isAdmin && (
            <div style={{ display: "flex", gap: 6 }}>
              <AdminDashboardSettings settings={settings} onSettingsUpdated={fetchSettings} />
              {role === "super_admin" && (
                <>
                  <button
                    onClick={toggleWelcome}
                    title={branding.welcome_enabled ? "Ocultar mensaje diario" : "Mostrar mensaje diario"}
                    className="aurora-tap"
                    style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)", color: "var(--aurora-text-mute)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {branding.welcome_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => navigate("/admin/usuarios")}
                    title="Gestión de usuarios"
                    className="aurora-tap"
                    style={{ width: 34, height: 34, borderRadius: 10, background: "var(--aurora-surface)", border: "1px solid var(--aurora-line)", color: "var(--aurora-text-mute)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Comunidad: caja compacta primero */}
        <CategoryHero
          onClick={() => navigate("/comunidad")}
          accentA="var(--aurora-mint)"
          accentB="var(--aurora-cyan)"
          icon={<Users size={20} />}
          title="Comunidad"
          sub={isAdmin ? "Aspirantes · GM Investidos · Racha" : "Racha del Guía"}
          chips={isAdmin ? ["Aspirantes", "Investidos", "Racha"] : ["Racha del Guía"]}
          stat="En vivo"
          compact
        />

        {/* Registros: caja larga */}
        <div style={{ marginTop: 12 }}>
          <CategoryHero
            onClick={() => navigate("/hub/registros")}
            accentA="var(--aurora-cyan)"
            accentB="var(--aurora-violet)"
            icon={<ClipboardList size={22} />}
            title="Registros"
            sub="ConquiKash · Mi Unidad"
            chips={["ConquiKash", "Mi Unidad"]}
            stat="Abrir"
          />
        </div>

        {/* Eventos: caja larga */}
        <div style={{ marginTop: 12 }}>
          <CategoryHero
            onClick={() => navigate("/hub/eventos")}
            accentA="var(--aurora-rose)"
            accentB="var(--aurora-peach)"
            icon={<Calendar size={22} />}
            title="Eventos"
            sub="Racha del Guía · Año Bíblico"
            chips={["Racha", "Año Bíblico"]}
            stat="Abrir"
          />
        </div>

        {(role === "director" || role === "subdirector") && (
          <div style={{ marginTop: 12 }}>
            <CategoryHero
              onClick={() => navigate("/club")}
              accentA="var(--aurora-gold)"
              accentB="var(--aurora-peach)"
              icon={<GraduationCap size={22} />}
              title="Club"
              sub="GM Investidos · Aspirantes a Guías"
              chips={["Investidos", "Aspirantes", "Avances"]}
              stat="Abrir"
            />
          </div>
        )}
      </div>

      {/* Herramientas personales (todos los usuarios) */}
      <div style={{ padding: "24px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h3 className="font-grotesk" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--aurora-text)" }}>
            Mis herramientas
          </h3>
          {isAdmin && (
            <span style={{ fontSize: 11, color: "var(--aurora-text-mute)", fontWeight: 600 }}>
              {roleLabel}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {!isAdmin && (
            <CategoryTile
              onClick={() => navigate("/mi-qr")}
              grad="linear-gradient(135deg, var(--aurora-cyan), var(--aurora-violet))"
              icon={<QrCode size={20} />}
              title="Mi QR"
              sub="Tu código para evaluaciones"
            />
          )}
          {isAdmin && (
            <>
              <CategoryTile
                onClick={() => navigate("/escanear")}
                grad="linear-gradient(135deg, var(--aurora-mint), var(--aurora-cyan))"
                icon={<ScanLine size={20} />}
                title="Escanear QR"
                sub="Registrar evaluaciones"
              />
              <CategoryTile
                onClick={cyclePreview}
                grad="linear-gradient(135deg, var(--aurora-violet-deep), var(--aurora-violet))"
                icon={<UserCog size={20} />}
                title="Preview GM / Aspirantes"
                sub={
                  previewAudience === "aspirante"
                    ? "Viendo como Aspirante · tocar para GM"
                    : previewAudience === "investido"
                    ? "Viendo como GM Investido · tocar para apagar"
                    : "Verificar cambios desde otra vista"
                }
              />
            </>
          )}
          {role === "super_admin" && (
            <>
              <CategoryTile
                onClick={() => navigate("/admin/usuarios")}
                grad="linear-gradient(135deg, var(--aurora-rose), var(--aurora-peach))"
                icon={<ShieldCheck size={20} />}
                title="Gestión usuarios"
                sub="PINs, roles y soporte"
              />
              <CategoryTile
                onClick={toggleWelcome}
                grad="linear-gradient(135deg, var(--aurora-peach), var(--aurora-gold))"
                icon={<Megaphone size={20} />}
                title="Mensaje diario"
                sub={branding.welcome_enabled ? "Activado · tocar para ocultar" : "Oculto · tocar para activar"}
              />
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;

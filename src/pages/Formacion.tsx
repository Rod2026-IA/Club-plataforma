import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BookOpen, Star, Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CategoryTile } from "@/components/aurora/CategoryCards";

type Audience = "aspirante" | "investido";

interface DSetting {
  section_key: string;
  enabled: boolean;
  audience: Audience;
}

const META: Record<string, { title: string; sub: string; path: string; grad: string; Icon: any }> = {
  "guia-mayor": {
    title: "Tarjeta de Guía Mayor",
    sub: "Tu progreso como Guía Mayor",
    path: "/guia-mayor",
    grad: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-lavender))",
    Icon: Award,
  },
  "clases-progresivas": {
    title: "Clases Progresivas",
    sub: "Amigo, Compañero, Explorador…",
    path: "/clases-progresivas",
    grad: "linear-gradient(135deg, var(--aurora-cyan), var(--aurora-mint))",
    Icon: Star,
  },
  "clases-avanzadas": {
    title: "Clases Avanzadas",
    sub: "Clases avanzadas de Conquistadores",
    path: "/clases-avanzadas",
    grad: "linear-gradient(135deg, var(--aurora-peach), var(--aurora-gold))",
    Icon: BookOpen,
  },
  ideales: {
    title: "Ideales",
    sub: "Voto, Ley, Himno y Lema",
    path: "/ideales",
    grad: "linear-gradient(135deg, var(--aurora-rose), var(--aurora-violet))",
    Icon: Heart,
  },
};

const Formacion = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [settings, setSettings] = useState<DSetting[]>([]);

  const isAdmin = ["super_admin", "director", "subdirector"].includes(role || "");
  const audience: Audience = role === "gm_investido" ? "investido" : "aspirante";

  useEffect(() => {
    supabase
      .from("dashboard_settings")
      .select("section_key,enabled,audience")
      .then(({ data }) => setSettings((data || []) as DSetting[]));
  }, []);

  // Keys allowed per audience by domain rule
  const allowedForAudience = (aud: Audience): string[] =>
    aud === "aspirante" ? ["guia-mayor"] : ["clases-progresivas", "clases-avanzadas"];

  const enabledKeys = (aud: Audience): string[] => {
    const allowed = allowedForAudience(aud);
    if (settings.length === 0) return allowed;
    return allowed.filter((k) =>
      settings.some((s) => s.audience === aud && s.section_key === k && s.enabled)
    );
  };

  // For admins, show both audiences so they can preview/manage
  const sections: { key: string; audience?: Audience }[] = isAdmin
    ? [
        ...enabledKeys("aspirante").map((k) => ({ key: k, audience: "aspirante" as Audience })),
        ...enabledKeys("investido").map((k) => ({ key: k, audience: "investido" as Audience })),
      ]
    : enabledKeys(audience).map((k) => ({ key: k }));

  // Ideales is shared and always visible inside Formación
  const allTiles = [...sections, { key: "ideales" as const }];

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
            Formación
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--aurora-text-mute)" }}>
            {isAdmin
              ? "Vista de administración · Tarjetas e Ideales"
              : audience === "investido"
              ? "Tus clases avanzadas y progresivas, e Ideales"
              : "Tu tarjeta de Guía Mayor e Ideales"}
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 18px 0" }}>
        <div className="grid grid-cols-2 gap-3">
          {allTiles.map(({ key }) => {
            const meta = META[key];
            if (!meta) return null;
            const Icon = meta.Icon;
            return (
              <CategoryTile
                key={key}
                onClick={() => navigate(meta.path)}
                grad={meta.grad}
                icon={<Icon size={20} />}
                title={meta.title}
                sub={meta.sub}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Formacion;
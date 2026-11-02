import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Coins, Shield, Heart, Flame, GraduationCap, UserCheck, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryTile } from "@/components/aurora/CategoryCards";

type Tile = {
  title: string;
  sub: string;
  path: string;
  grad: string;
  Icon: any;
  roles?: string[]; // if set, only visible for these roles
};

type HubConfig = {
  title: string;
  subtitle: string;
  tiles: (role: string | null) => Tile[];
};

const HUBS: Record<string, HubConfig> = {
  unidad: {
    title: "Unidad",
    subtitle: "Mi Unidad · ConquiKash · Ideales",
    tiles: () => [
      { title: "Mi Unidad", sub: "Asistencia y evaluaciones", path: "/mi-unidad", grad: "linear-gradient(135deg, var(--aurora-cyan), var(--aurora-mint))", Icon: Shield },
      { title: "ConquiKash", sub: "Puntos y recompensas", path: "/conqui-kash", grad: "linear-gradient(135deg, var(--aurora-peach), var(--aurora-gold))", Icon: Coins },
      { title: "Ideales", sub: "Voto, Ley, Himno y Lema", path: "/ideales", grad: "linear-gradient(135deg, var(--aurora-rose), var(--aurora-violet))", Icon: Heart },
    ],
  },
  comunidad: {
    title: "Comunidad",
    subtitle: "Aspirantes · GM Investidos · Racha",
    tiles: (role) => {
      const isAdmin = ["super_admin", "director", "subdirector"].includes(role || "");
      const tiles: Tile[] = [
        { title: "Racha del Guía", sub: "Mensajes y racha diaria", path: "/racha", grad: "linear-gradient(135deg, var(--aurora-peach), var(--aurora-rose))", Icon: Flame },
      ];
      if (isAdmin) {
        tiles.push(
          { title: "Aspirantes GM", sub: "Perfiles y avances", path: "/miembros/aspirantes", grad: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-lavender))", Icon: GraduationCap },
          { title: "GM Investidos", sub: "Guías Mayores investidos", path: "/miembros/investidos", grad: "linear-gradient(135deg, var(--aurora-gold), var(--aurora-peach))", Icon: UserCheck },
        );
      }
      return tiles;
    },
  },
  registros: {
    title: "Registros",
    subtitle: "ConquiKash · Mi Unidad",
    tiles: () => [
      { title: "ConquiKash", sub: "Puntos y recompensas", path: "/conqui-kash", grad: "linear-gradient(135deg, var(--aurora-peach), var(--aurora-gold))", Icon: Coins },
      { title: "Mi Unidad", sub: "Asistencia y evaluaciones", path: "/mi-unidad", grad: "linear-gradient(135deg, var(--aurora-cyan), var(--aurora-mint))", Icon: ClipboardList },
    ],
  },
  eventos: {
    title: "Eventos",
    subtitle: "Racha del Guía",
    tiles: () => [
      { title: "Racha del Guía", sub: "Mantén tu racha diaria", path: "/racha", grad: "linear-gradient(135deg, var(--aurora-peach), var(--aurora-rose))", Icon: Flame },
    ],
  },
};

const CategoryHub = () => {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const config = HUBS[(key || "").toLowerCase()];

  if (!config) {
    return (
      <div className="aurora-screen-enter min-h-screen" style={{ background: "var(--aurora-bg)", color: "var(--aurora-text)", padding: 24 }}>
        <button onClick={() => navigate("/dashboard")} className="aurora-tap" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--aurora-text-mute)" }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <p style={{ marginTop: 24 }}>Categoría no encontrada.</p>
      </div>
    );
  }

  const tiles = config.tiles(role);

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
            {config.title}
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--aurora-text-mute)" }}>
            {config.subtitle}
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 18px 0" }}>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => {
            const Icon = t.Icon;
            return (
              <CategoryTile
                key={t.path + t.title}
                onClick={() => navigate(t.path)}
                grad={t.grad}
                icon={<Icon size={20} />}
                title={t.title}
                sub={t.sub}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryHub;
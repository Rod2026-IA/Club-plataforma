import { ReactNode } from "react";
import AuroraAvatar from "./AuroraAvatar";

interface Props {
  role?: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  actions?: ReactNode;
  stats?: { value: string; label: string; color: string }[];
}

export default function AuroraHero({ role, name, initials, avatarUrl, actions, stats }: Props) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "32px 20px 26px",
        background: "var(--aurora-hero-ink)",
        color: "#fff",
        borderRadius: "0 0 34px 34px",
      }}
    >
      <div
        className="aurora-blob"
        style={{
          position: "absolute",
          top: -70,
          right: -50,
          width: 230,
          height: 230,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--aurora-violet) 0%, transparent 65%)",
          opacity: 0.7,
        }}
      />
      <div
        className="aurora-blob"
        style={{
          position: "absolute",
          top: 30,
          right: 90,
          width: 170,
          height: 170,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--aurora-cyan) 0%, transparent 65%)",
          opacity: 0.5,
          animationDelay: "1.5s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          position: "absolute",
          top: 70,
          left: -50,
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--aurora-peach) 0%, transparent 65%)",
          opacity: 0.45,
          animationDelay: "3s",
        }}
      />

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <AuroraAvatar
              size={44}
              color="var(--aurora-violet)"
              initials={initials}
              imageUrl={avatarUrl}
              ring="var(--aurora-hero-ink)"
              online
            />
            <div style={{ minWidth: 0 }}>
              {role && (
                <div
                  className="font-mono-tag"
                  style={{
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  {role}
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {name}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>
        </div>

        <div
          className="font-serif-display"
          style={{ fontSize: 36, lineHeight: 1.04, letterSpacing: "-0.02em" }}
        >
          Panel de <i style={{ color: "var(--aurora-lavender)" }}>Actividades</i>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.62)" }}>
          Selecciona una sección para continuar
        </div>

        {stats && stats.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  padding: "11px 12px",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  minWidth: 0,
                }}
              >
                <div
                  className="font-grotesk"
                  style={{
                    fontWeight: 700,
                    fontSize: s.value.length > 5 ? 14 : 18,
                    color: s.color,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="font-mono-tag"
                  style={{
                    fontSize: 9.5,
                    color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: 3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
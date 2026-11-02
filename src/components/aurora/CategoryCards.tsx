import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function CategoryHero({
  onClick,
  accentA,
  accentB,
  icon,
  title,
  sub,
  chips,
  stat,
  compact,
}: {
  onClick: () => void;
  accentA: string;
  accentB: string;
  icon: ReactNode;
  title: string;
  sub: string;
  chips: string[];
  stat: string;
  compact?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="aurora-tap"
      style={{
        padding: compact ? 14 : 18,
        borderRadius: 22,
        background: `linear-gradient(135deg, ${accentA} 0%, ${accentB} 100%)`,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {!compact && (
        <>
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 26,
              right: 26,
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
            }}
          />
        </>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div
            style={{
              width: compact ? 38 : 46,
              height: compact ? 38 : 46,
              borderRadius: 13,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 11px",
              background: "rgba(255,255,255,0.18)",
              borderRadius: 999,
              backdropFilter: "blur(8px)",
            }}
          >
            {stat}
          </span>
        </div>
        <div className="font-grotesk" style={{ marginTop: compact ? 12 : 28, fontWeight: 700, fontSize: compact ? 20 : 24 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>{sub}</div>
        <div style={{ display: "flex", gap: 6, marginTop: compact ? 8 : 14, flexWrap: "wrap" }}>
          {chips.map((c) => (
            <span
              key={c}
              style={{
                padding: "5px 11px",
                background: "rgba(255,255,255,0.16)",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {c}
            </span>
          ))}
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 12px",
              background: "#fff",
              color: accentB,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Abrir <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function CategoryTile({
  onClick,
  grad,
  icon,
  title,
  sub,
  footer,
  footerColor,
}: {
  onClick: () => void;
  grad: string;
  icon: ReactNode;
  title: string;
  sub: string;
  footer?: ReactNode;
  footerColor?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="aurora-tap"
      style={{
        padding: 16,
        borderRadius: 20,
        background: "var(--aurora-surface)",
        border: "1px solid var(--aurora-line)",
        boxShadow: "var(--aurora-shadow)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: grad,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <div className="font-grotesk" style={{ marginTop: 14, fontWeight: 700, fontSize: 16, color: "var(--aurora-text)" }}>
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--aurora-text-mute)", marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      {footer && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 10,
            fontSize: 11,
            color: footerColor || "var(--aurora-text-mute)",
            fontWeight: 600,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  accent?: string;
  gradient?: string;
  backTo?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export default function AuroraScreenHeader({
  title,
  subtitle,
  accent = "var(--aurora-cyan)",
  gradient,
  backTo = "/dashboard",
  onBack,
  right,
}: Props) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(backTo));
  const useGradient = !!gradient;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        paddingTop: 14,
        background: useGradient ? gradient : "var(--aurora-bg)",
        overflow: "hidden",
      }}
    >
      {useGradient && (
        <div
          className="aurora-blob"
          style={{
            position: "absolute",
            top: -50,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent} 0%, transparent 65%)`,
            opacity: 0.35,
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ position: "relative", padding: "8px 18px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handleBack}
          className="aurora-tap"
          aria-label="Volver"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: useGradient ? "rgba(255,255,255,0.14)" : "var(--aurora-surface)",
            border: useGradient ? "1px solid rgba(255,255,255,0.18)" : "1px solid var(--aurora-line)",
            color: useGradient ? "#fff" : "var(--aurora-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backdropFilter: "blur(8px)",
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-grotesk"
            style={{
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "-0.01em",
              color: useGradient ? "#fff" : accent,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 12.5,
                color: useGradient ? "rgba(255,255,255,0.7)" : "var(--aurora-text-mute)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
    </div>
  );
}
import { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";

interface Props {
  title: string;
  subtitle?: string;
  brandName?: string;
  brandIconUrl?: string | null;
  brandFallbackIcon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function AuroraAuthLayout({
  title,
  subtitle,
  brandName,
  brandIconUrl,
  brandFallbackIcon,
  children,
  footer,
  size = "md",
}: Props) {
  const maxW = size === "lg" ? 560 : size === "sm" ? 380 : 460;

  return (
    <div className="aurora-auth-bg">
      {/* floating blobs */}
      <div
        className="aurora-blob"
        style={{
          position: "absolute", top: -140, left: -120,
          width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, var(--aurora-violet) 0%, transparent 70%)",
          opacity: 0.55, filter: "blur(20px)", pointerEvents: "none",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          position: "absolute", bottom: -160, right: -120,
          width: 420, height: 420, borderRadius: "50%",
          background: "radial-gradient(circle, var(--aurora-cyan) 0%, transparent 70%)",
          opacity: 0.45, filter: "blur(22px)", pointerEvents: "none",
          animationDelay: "1.5s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          position: "absolute", top: "40%", right: "8%",
          width: 220, height: 220, borderRadius: "50%",
          background: "radial-gradient(circle, var(--aurora-rose) 0%, transparent 70%)",
          opacity: 0.28, filter: "blur(28px)", pointerEvents: "none",
          animationDelay: "3s",
        }}
      />

      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div
        className="aurora-screen-enter"
        style={{
          position: "relative", zIndex: 2,
          minHeight: "100dvh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "32px 18px",
        }}
      >
        <div style={{ width: "100%", maxWidth: maxW }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))",
                boxShadow: "0 14px 40px -10px rgba(139,123,240,0.55)",
                marginBottom: 14, overflow: "hidden",
              }}
            >
              {brandIconUrl ? (
                <img src={brandIconUrl} alt={brandName || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                brandFallbackIcon
              )}
            </div>
            <h1
              className="aurora-display"
              style={{ fontSize: 38, lineHeight: 1.05, color: "#fff", margin: 0 }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="aurora-grotesk"
                style={{ marginTop: 8, color: "rgba(255,255,255,0.72)", fontSize: 14 }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div className="aurora-auth-card" style={{ padding: 22 }}>
            {children}
          </div>

          {footer && (
            <div style={{ marginTop: 18, textAlign: "center", color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
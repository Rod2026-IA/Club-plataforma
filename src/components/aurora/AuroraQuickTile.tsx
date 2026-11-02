import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface Props {
  to: string;
  icon: LucideIcon;
  label: string;
  tint?: string;
}

export default function AuroraQuickTile({ to, icon: Icon, label, tint = "var(--aurora-violet)" }: Props) {
  return (
    <Link
      to={to}
      className="aurora-tap relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center gap-2"
      style={{
        background: "var(--aurora-surface)",
        border: "1px solid var(--aurora-line)",
        boxShadow: "var(--aurora-shadow)",
        color: "var(--aurora-text)",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute", top: -30, right: -30,
          width: 80, height: 80, borderRadius: "50%",
          background: `radial-gradient(circle, ${tint} 0%, transparent 70%)`,
          opacity: 0.25, pointerEvents: "none",
        }}
      />
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          background: `color-mix(in oklab, ${tint} 14%, transparent)`,
          color: tint,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[13px] font-semibold aurora-grotesk">{label}</span>
    </Link>
  );
}
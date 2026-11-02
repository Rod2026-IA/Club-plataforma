interface Props {
  label: string;
  value: string | number;
  tint?: string;
}

export default function AuroraStat({ label, value, tint = "var(--aurora-violet)" }: Props) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: "var(--aurora-surface-2)",
        border: "1px solid var(--aurora-line)",
      }}
    >
      <p className="text-[11px] aurora-mono uppercase tracking-[0.14em]" style={{ color: "var(--aurora-text-mute)" }}>
        {label}
      </p>
      <p className="aurora-display text-3xl mt-0.5" style={{ color: tint, lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  );
}
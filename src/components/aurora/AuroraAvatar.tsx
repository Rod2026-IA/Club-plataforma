interface AuroraAvatarProps {
  size?: number;
  color?: string;
  initials?: string;
  ring?: string;
  online?: boolean;
  imageUrl?: string | null;
}

export default function AuroraAvatar({
  size = 40,
  color = "var(--aurora-violet)",
  initials = "",
  ring,
  online,
  imageUrl,
}: AuroraAvatarProps) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: imageUrl ? "var(--aurora-surface-2)" : color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: size * 0.38,
          boxShadow: ring ? `0 0 0 2px ${ring}` : "none",
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </div>
      {online != null && (
        <span
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: "50%",
            background: online ? "var(--aurora-mint)" : "var(--aurora-text-dim)",
            boxShadow: `0 0 0 2px ${ring || "var(--aurora-surface)"}`,
          }}
        />
      )}
    </div>
  );
}
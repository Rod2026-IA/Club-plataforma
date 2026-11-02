import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AnimatedGridBackground({ children }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Animated grid - stronger in light mode */}
      <div
        className="absolute inset-0 animate-grid-move opacity-40 dark:opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.25) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute inset-0 animate-grid-move opacity-70 dark:hidden"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.55) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background) / 0.85) 70%, hsl(var(--background)) 100%)",
        }}
      />
      {/* Floating glow orbs - more vibrant in light mode */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/20 dark:bg-primary/20 light:bg-primary/40 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/20 dark:bg-accent/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-primary/30 blur-3xl animate-pulse dark:hidden" style={{ animationDelay: "0.8s" }} />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

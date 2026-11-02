import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
      <Icon className="w-16 h-16 text-primary opacity-60" strokeWidth={1.5} />
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
        {description}
      </p>
      {ctaLabel && onCtaClick && (
        <Button onClick={onCtaClick} className="mt-2 rounded-lg">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
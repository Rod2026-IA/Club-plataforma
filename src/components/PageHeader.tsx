import AuroraScreenHeader from "./aurora/AuroraScreenHeader";
import ThemeToggle from "./ThemeToggle";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  backTo?: string;
  accent?: string;
}

/**
 * Backwards-compatible page header. Now renders with the Aurora design
 * so every existing page automatically inherits the new look.
 */
const PageHeader = ({ title, subtitle, backTo = "/dashboard", accent }: PageHeaderProps) => {
  return (
    <AuroraScreenHeader
      title={title}
      subtitle={subtitle}
      backTo={backTo}
      accent={accent || "var(--aurora-cyan)"}
      right={<ThemeToggle />}
    />
  );
};

export default PageHeader;
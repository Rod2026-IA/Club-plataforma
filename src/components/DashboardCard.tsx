import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  customIconUrl?: string;
  path: string;
  glowClass: string;
  gradient: string;
  delay?: number;
}

const cardGlowMap: Record<string, string> = {
  "neon-glow-cyan": "neon-card-cyan",
  "neon-glow-purple": "neon-card-purple",
  "neon-glow-green": "neon-card-green",
  "neon-glow-pink": "neon-card-pink",
  "neon-glow-orange": "neon-card-orange",
};

const DashboardCard = ({ title, description, icon: Icon, customIconUrl, path, glowClass, gradient, delay = 0 }: DashboardCardProps) => {
  const navigate = useNavigate();
  const cardGlow = cardGlowMap[glowClass] ?? "";

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className={`glass-card rounded-2xl p-5 text-left w-full hover:border-primary/30 transition-all group ${cardGlow}`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 ${gradient} ${glowClass} overflow-hidden`}
      >
        {customIconUrl ? (
          <img src={customIconUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-6 h-6 text-primary-foreground" />
        )}
      </div>
      <h3 className="font-bold text-foreground text-base mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground font-body text-xs leading-relaxed">{description}</p>
    </motion.button>
  );
};

export default DashboardCard;

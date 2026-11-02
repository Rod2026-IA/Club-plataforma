import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface SectionPlaceholderProps {
  title: string;
  description: string;
}

const SectionPlaceholder = ({ title, description }: SectionPlaceholderProps) => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={title} subtitle={description} />

      <div className="container py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl gradient-neon flex items-center justify-center mx-auto mb-4 neon-glow-cyan">
            <Construction className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">En Construcción</h2>
          <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">
            Esta sección está siendo desarrollada. Pronto podrás acceder a {title.toLowerCase()}.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SectionPlaceholder;

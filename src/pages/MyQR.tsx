import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  director: "Director",
  subdirector: "Sub-Director",
  integrante: "Integrante",
};

const MyQR = () => {
  const navigate = useNavigate();
  const { user, profile, role, loading } = useAuth();
  const [unitName, setUnitName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    const fetchUnit = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("unit_members")
        .select("position, units(name)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && (data as any).units?.name) {
        setUnitName((data as any).units.name);
      }
    };
    fetchUnit();
  }, [user]);

  const scanUrl = user ? `${window.location.origin}/scan/${user.id}` : "";
  const fullName = profile
    ? `${profile.first_name} ${profile.first_last_name}`
    : user?.email ?? "";

  const downloadQR = () => {
    const canvas = document.querySelector("#my-qr canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${fullName.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mi Código QR" subtitle="Muéstralo para registrar tu asistencia" />
      <div className="container py-8 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 max-w-md w-full text-center neon-glow-cyan"
        >
          <h2 className="text-2xl font-bold text-foreground mb-1">{fullName}</h2>
          {unitName && <p className="text-muted-foreground text-sm mb-1">{unitName}</p>}
          <p className="text-xs text-primary mb-6 uppercase tracking-wider">
            {role ? roleLabels[role] ?? role : ""}
          </p>

          <div
            id="my-qr"
            className="bg-white p-6 rounded-2xl inline-block mb-6"
          >
            {scanUrl && (
              <QRCodeCanvas
                value={scanUrl}
                size={256}
                level="H"
                includeMargin={false}
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground break-all mb-4">{scanUrl}</p>

          <Button onClick={downloadQR} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Descargar PNG
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default MyQR;

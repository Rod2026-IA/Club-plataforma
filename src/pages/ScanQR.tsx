import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SCANNER_ID = "qr-scanner-region";

const canScan = (role: string | null, position: string | null) => {
  if (!role) return false;
  if (["super_admin", "director", "subdirector"].includes(role)) return true;
  if (position && ["capitan", "secretario"].includes(position)) return true;
  return false;
};

const parseTarget = (decoded: string): string | null => {
  try {
    const url = new URL(decoded);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("scan");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // not a URL
  }
  if (/^[0-9a-f-]{36}$/i.test(decoded)) return decoded;
  return null;
};

const ScanQR = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    const fetchPos = async () => {
      if (!user) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("unit_members")
        .select("position")
        .eq("user_id", user.id)
        .maybeSingle();
      setPosition(data?.position ?? null);
    };
    fetchPos();
  }, [user]);

  const allowed = canScan(role, position);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const getState = (s as unknown as { getState?: () => number }).getState;
      const state = typeof getState === "function" ? getState.call(s) : 2;
      if (state === 2) {
        await s.stop();
      }
      await s.clear();
    } catch {
      // ignore
    } finally {
      scannerRef.current = null;
    }
  };

  const start = async () => {
    setError(null);
    handledRef.current = false;
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;

          const target = parseTarget(decoded);

          // Stop camera BEFORE navigating so the stream is released cleanly
          await stopScanner();
          setActive(false);

          if (target) {
            navigate(`/scan/${target}`, { replace: true });
          } else {
            toast({ title: "QR no válido", variant: "destructive" });
            handledRef.current = false;
          }
        },
        () => {}
      );
      setActive(true);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo acceder a la cámara");
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Escanear QR" subtitle="Apunta la cámara al código del integrante" />
      <div className="container py-8 max-w-lg">
        {!allowed ? (
          <div className="glass-card rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-foreground">No autorizado</p>
              <p className="text-sm text-muted-foreground">
                Solo directores, subdirectores, capitanes y secretarios pueden escanear códigos QR.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-4">
            <div
              id={SCANNER_ID}
              className="w-full aspect-square rounded-xl overflow-hidden bg-black/40"
            />
            {error && (
              <p className="text-sm text-destructive mt-3 text-center">{error}</p>
            )}
            {!active && (
              <Button onClick={start} className="w-full mt-4 gap-2">
                <Camera className="w-4 h-4" /> Iniciar cámara
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Asegúrate de permitir el acceso a la cámara en tu navegador.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanQR;

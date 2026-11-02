import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User as UserIcon, Award, Coins, Loader2, TrendingUp, TrendingDown, CheckCircle2, Circle, ChevronDown, Calendar, PenLine, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initialSections } from "@/data/guiaMayorData";
import FingerprintCard from "@/components/FingerprintCard";

interface Profile {
  user_id: string;
  first_name: string;
  first_last_name: string;
  phone: string;
  email: string;
  birthday: string | null;
  avatar_url: string | null;
}

interface KashTx {
  id: string;
  amount: number;
  tx_type: "ingreso" | "egreso";
  description: string | null;
  tx_date: string;
}

interface GMProgress {
  section_id: string;
  req_id: string;
  sub_id: string;
  completed: boolean;
  completion_date: string | null;
  instructor: string | null;
}

interface GMPhoto {
  id: string;
  photo_url: string;
  section_id: string;
  req_id: string;
  sub_id: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  director: "Director",
  subdirector: "Subdirector",
  gm_investido: "GM Investido",
  integrante: "Aspirante GM",
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);

interface SelectedReqInfo {
  sectionTitle: string;
  reqText: string;
  subText?: string;
  date: string | null;
  instructor: string | null;
  photos: GMPhoto[];
}

const MemberProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { role, loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [kash, setKash] = useState<KashTx[]>([]);
  const [gmProgress, setGmProgress] = useState<GMProgress[]>([]);
  const [gmPhotos, setGmPhotos] = useState<GMPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [selectedReq, setSelectedReq] = useState<SelectedReqInfo | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const allowed = ["super_admin", "director", "subdirector"];
    if (!allowed.includes(role || "")) {
      toast.error("Acceso denegado");
      navigate("/dashboard");
      return;
    }
    if (userId) load();
  }, [role, authLoading, userId]);

  const load = async () => {
    setLoading(true);
    const [p, r, k, gm, ph] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!).maybeSingle(),
      supabase
        .from("conqui_kash_transactions")
        .select("id, amount, tx_type, description, tx_date")
        .eq("user_id", userId!)
        .order("tx_date", { ascending: false }),
      supabase
        .from("guia_mayor_progress")
        .select("section_id, req_id, sub_id, completed, completion_date, instructor")
        .eq("user_id", userId!),
      supabase
        .from("guia_mayor_photos")
        .select("id, photo_url, section_id, req_id, sub_id")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false }),
    ]);
    setProfile((p.data as Profile) || null);
    setMemberRole((r.data?.role as string) || null);
    setKash((k.data || []) as KashTx[]);
    setGmProgress((gm.data || []) as GMProgress[]);
    setGmPhotos((ph.data || []) as GMPhoto[]);
    setLoading(false);
  };

  const balance = kash.reduce(
    (sum, t) => sum + (t.tx_type === "ingreso" ? Number(t.amount) : -Number(t.amount)),
    0
  );
  const totalIn = kash.filter((t) => t.tx_type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = kash.filter((t) => t.tx_type === "egreso").reduce((s, t) => s + Number(t.amount), 0);

  const gmCompletedReqs = gmProgress.filter((p) => p.completed && !p.sub_id).length;
  const gmCompletedSubs = gmProgress.filter((p) => p.completed && p.sub_id).length;

  const findProgress = (sectionId: string, reqId: string, subId = "") =>
    gmProgress.find(
      (p) => p.section_id === sectionId && p.req_id === reqId && (p.sub_id || "") === subId
    );

  const findPhotos = (sectionId: string, reqId: string, subId = "") =>
    gmPhotos.filter(
      (p) => p.section_id === sectionId && p.req_id === reqId && (p.sub_id || "") === subId
    );

  const openReqDetail = (
    sectionTitle: string,
    sectionId: string,
    reqId: string,
    reqText: string,
    subId = "",
    subText?: string
  ) => {
    const prog = findProgress(sectionId, reqId, subId);
    const photos = findPhotos(sectionId, reqId, subId);
    setSelectedReq({
      sectionTitle,
      reqText,
      subText,
      date: prog?.completion_date || null,
      instructor: prog?.instructor || null,
      photos,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-navy flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen gradient-navy p-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-center text-muted-foreground py-10">Perfil no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-navy p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold neon-text-cyan">Perfil del miembro</h1>
            <p className="text-muted-foreground font-body text-sm">Información y avances</p>
          </div>
        </div>

        {/* Profile header */}
        <Card className="glass-card p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">{profile.first_name} {profile.first_last_name}</h2>
              <p className="text-sm text-muted-foreground">{profile.phone}</p>
              {profile.birthday && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cumpleaños: {new Date(profile.birthday).toLocaleDateString()}
                </p>
              )}
              {memberRole && (
                <Badge variant="secondary" className="mt-2">{ROLE_LABELS[memberRole] || memberRole}</Badge>
              )}
            </div>
          </div>
        </Card>

        {user?.id === userId && (
          <div className="mb-3">
            <FingerprintCard />
          </div>
        )}

        <Tabs defaultValue="guia" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="guia"><Award className="w-4 h-4 mr-2" /> Guía Mayor</TabsTrigger>
            <TabsTrigger value="kash"><Coins className="w-4 h-4 mr-2" /> Conqui Kash</TabsTrigger>
          </TabsList>

          <TabsContent value="guia" className="mt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Card className="glass-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Requisitos completados</p>
                  <p className="text-2xl font-bold text-primary">{gmCompletedReqs}</p>
                </Card>
                <Card className="glass-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Sub-ítems completados</p>
                  <p className="text-2xl font-bold text-primary">{gmCompletedSubs}</p>
                </Card>
              </div>

              <Button
                onClick={() => navigate(`/guia-mayor?userId=${userId}`)}
                className="w-full"
              >
                <Award className="w-4 h-4 mr-2" />
                Ver / editar tarjeta completa
              </Button>

              {/* Tarjeta completa con secciones colapsables */}
              <div className="space-y-2">
                {initialSections.map((sec) => {
                  const isOpen = openSections[sec.id] ?? false;
                  const totalReqs = sec.requirements.length;
                  const completedInSec = sec.requirements.filter((r) =>
                    findProgress(sec.id, r.id)?.completed
                  ).length;
                  return (
                    <Collapsible
                      key={sec.id}
                      open={isOpen}
                      onOpenChange={(o) => setOpenSections((prev) => ({ ...prev, [sec.id]: o }))}
                    >
                      <Card className="glass-card overflow-hidden">
                        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="text-left min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{sec.title}</p>
                            {sec.subtitle && (
                              <p className="text-[10px] text-muted-foreground truncate">{sec.subtitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-[10px]">
                              {completedInSec}/{totalReqs}
                            </Badge>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3 pt-0 space-y-2">
                            {sec.requirements.map((req) => {
                              const prog = findProgress(sec.id, req.id);
                              const photos = findPhotos(sec.id, req.id);
                              const completed = prog?.completed || false;
                              return (
                                <div key={req.id} className="rounded-lg border border-border/50 overflow-hidden">
                                  <button
                                    onClick={() =>
                                      openReqDetail(sec.title, sec.id, req.id, req.text)
                                    }
                                    className="w-full p-2 flex items-start gap-2 text-left hover:bg-muted/30 transition-colors"
                                  >
                                    {completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs">{req.text}</p>
                                      {(prog?.completion_date || photos.length > 0) && (
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          {prog?.completion_date && (
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {prog.completion_date}
                                            </span>
                                          )}
                                          {photos.length > 0 && (
                                            <span className="text-[10px] text-primary flex items-center gap-1">
                                              <ImageIcon className="w-3 h-3" />
                                              {photos.length}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                  {req.subitems && req.subitems.length > 0 && (
                                    <div className="pl-7 pr-2 pb-2 space-y-1 border-t border-border/30">
                                      {req.subitems.map((sub) => {
                                        const subProg = findProgress(sec.id, req.id, sub.id);
                                        const subPhotos = findPhotos(sec.id, req.id, sub.id);
                                        const subCompleted = subProg?.completed || false;
                                        return (
                                          <button
                                            key={sub.id}
                                            onClick={() =>
                                              openReqDetail(sec.title, sec.id, req.id, req.text, sub.id, sub.text)
                                            }
                                            className="w-full pt-1.5 flex items-start gap-2 text-left hover:bg-muted/20 transition-colors rounded"
                                          >
                                            {subCompleted ? (
                                              <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                                            ) : (
                                              <Circle className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[11px] text-muted-foreground">{sub.text}</p>
                                              {(subProg?.completion_date || subPhotos.length > 0) && (
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                  {subProg?.completion_date && (
                                                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                      <Calendar className="w-2.5 h-2.5" />
                                                      {subProg.completion_date}
                                                    </span>
                                                  )}
                                                  {subPhotos.length > 0 && (
                                                    <span className="text-[9px] text-primary flex items-center gap-1">
                                                      <ImageIcon className="w-2.5 h-2.5" />
                                                      {subPhotos.length}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kash" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Card className="glass-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="text-lg font-bold text-primary">{formatMoney(balance)}</p>
              </Card>
              <Card className="glass-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-lg font-bold text-green-500">{formatMoney(totalIn)}</p>
              </Card>
              <Card className="glass-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Egresos</p>
                <p className="text-lg font-bold text-destructive">{formatMoney(totalOut)}</p>
              </Card>
            </div>

            <Card className="glass-card p-4">
              <h3 className="font-semibold text-sm mb-3">Movimientos</h3>
              {kash.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">Sin movimientos registrados</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {kash.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {t.tx_type === "ingreso" ? (
                          <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs truncate">{t.description || (t.tx_type === "ingreso" ? "Ingreso" : "Egreso")}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(t.tx_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${t.tx_type === "ingreso" ? "text-green-500" : "text-destructive"}`}>
                        {t.tx_type === "ingreso" ? "+" : "-"}{formatMoney(Number(t.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Detail dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(o) => !o && setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedReq?.sectionTitle}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              {selectedReq?.reqText}
              {selectedReq?.subText && (
                <span className="block mt-1 text-foreground/80">→ {selectedReq.subText}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" /> Fecha
                </p>
                <p className="text-sm font-medium">
                  {selectedReq?.date || <span className="text-muted-foreground">—</span>}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <PenLine className="w-3 h-3" /> Firma instructor
                </p>
                <p className="text-sm font-medium">
                  {selectedReq?.instructor || <span className="text-muted-foreground">—</span>}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Fotos adjuntas ({selectedReq?.photos.length || 0})
              </p>
              {!selectedReq?.photos.length ? (
                <p className="text-center text-xs text-muted-foreground py-6 bg-muted/20 rounded-lg">
                  Sin fotos para este requisito
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {selectedReq.photos.map((p) => (
                    <a
                      key={p.id}
                      href={p.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-muted block"
                    >
                      <img src={p.photo_url} alt="Evidencia" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberProfile;

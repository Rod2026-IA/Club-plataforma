import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award, CheckCircle2, Circle, ChevronDown, Share2, CalendarDays, User,
  Loader2, ImageIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { shareOptions, type CompletionInfo } from "@/data/guiaMayorData";
import { useAuth } from "@/contexts/AuthContext";
import { useGuiaMayorData } from "@/hooks/useGuiaMayorData";
import RequirementPhotos from "@/components/RequirementPhotos";

interface PendingCheck {
  sectionId: string;
  reqId: string;
  subId?: string;
  label: string;
}

const GuiaMayor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const targetUserId = searchParams.get("userId") || user?.id || null;
  const isViewingOther = !!searchParams.get("userId") && searchParams.get("userId") !== user?.id;

  const { sections, photosMap, loading, upsertProgress, uploadPhoto, deletePhoto, photoKey } =
    useGuiaMayorData(targetUserId);

  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);
  const [modalDate, setModalDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalInstructor, setModalInstructor] = useState("");
  const [openPhotos, setOpenPhotos] = useState<Record<string, boolean>>({});

  const togglePhotos = (key: string) =>
    setOpenPhotos((prev) => ({ ...prev, [key]: !prev[key] }));

  const requestCheck = (sectionId: string, reqId: string, label: string, subId?: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    const req = sec?.requirements.find((r) => r.id === reqId);
    if (subId) {
      const sub = req?.subitems?.find((s) => s.id === subId);
      if (sub?.completed) {
        upsertProgress(sectionId, reqId, subId, false);
        return;
      }
    } else {
      if (req?.completed) {
        upsertProgress(sectionId, reqId, "", false);
        return;
      }
    }
    setPendingCheck({ sectionId, reqId, subId, label });
    setModalDate(new Date().toISOString().split("T")[0]);
    setModalInstructor("");
  };

  const confirmCheck = async () => {
    if (!pendingCheck) return;
    const info: CompletionInfo = { date: modalDate, instructor: modalInstructor };
    await upsertProgress(
      pendingCheck.sectionId,
      pendingCheck.reqId,
      pendingCheck.subId || "",
      true,
      info
    );
    setPendingCheck(null);
  };

  const toggleShareOption = async (sectionId: string, reqId: string, shareId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    const req = sec?.requirements.find((r) => r.id === reqId);
    if (!req?.hasShareOptions) return;
    const selected = req.selectedShareOptions || [];
    const isSelected = selected.includes(shareId);
    let updated: string[];
    if (isSelected) {
      updated = selected.filter((s) => s !== shareId);
    } else if (selected.length < (req.shareOptionsCount || 2)) {
      updated = [...selected, shareId];
    } else {
      return;
    }
    await upsertProgress(sectionId, reqId, "", req.completed || false, req.completionInfo, updated);
  };

  const totalReqs = sections.reduce((sum, s) => sum + s.requirements.length, 0);
  const completedReqs = sections.reduce(
    (sum, s) => sum + s.requirements.filter((r) => r.completed).length,
    0
  );
  const overallProgress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Tarjeta de Guía Mayor"
        subtitle={isViewingOther ? "Vista de administrador" : "Conferencia General"}
      />

      <div className="container py-6 space-y-5">
        {/* Overall Progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220 70% 25%), hsl(220 60% 35%))" }}>
              <Award className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-sm">Progreso General</h3>
              <p className="text-muted-foreground text-xs">{completedReqs} de {totalReqs} requisitos</p>
            </div>
            <span className="text-xl font-bold text-foreground">{overallProgress.toFixed(0)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2.5" />
        </motion.div>

        <Accordion type="multiple" className="space-y-2">
          {sections.map((section, sIdx) => {
            const sCompleted = section.requirements.filter((r) => r.completed).length;
            const sTotal = section.requirements.length;
            const sProgress = sTotal > 0 ? (sCompleted / sTotal) * 100 : 0;

            return (
              <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sIdx * 0.05 }}>
                <AccordionItem value={section.id} className="glass-card rounded-2xl border-0 overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${sProgress === 100 ? "bg-primary/20 text-accent" : "bg-primary/10 text-primary"}`}>
                        {sProgress === 100 ? <CheckCircle2 className="w-4 h-4" /> : `${sCompleted}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{section.title}</p>
                        {section.subtitle && <p className="text-muted-foreground text-[10px]">{section.subtitle}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground mr-2">{sCompleted}/{sTotal}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="mb-2">
                      <Progress value={sProgress} className="h-1.5" />
                    </div>
                    <div className="space-y-1.5">
                      {section.requirements.map((req) => {
                        const reqPhotoKey = photoKey(section.id, req.id);
                        const reqPhotos = photosMap[reqPhotoKey] || [];
                        const reqOpen = openPhotos[reqPhotoKey] ?? reqPhotos.length > 0;
                        return (
                          <div key={req.id} className="space-y-1">
                            <div className="flex items-start gap-1">
                              <button
                                onClick={() => requestCheck(section.id, req.id, req.text)}
                                className={`flex-1 flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-colors ${
                                  req.completed ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                                }`}
                              >
                                {req.completed ? (
                                  <div className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-accent" />
                                  </div>
                                ) : (
                                  <Circle className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                )}
                                <div className="flex-1">
                                  <span className="leading-relaxed">{req.text}</span>
                                  {req.completed && req.completionInfo && (
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{req.completionInfo.date}</span>
                                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.completionInfo.instructor}</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                              <button
                                onClick={() => togglePhotos(reqPhotoKey)}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary relative"
                                title="Fotos del requisito"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                {reqPhotos.length > 0 && (
                                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                    {reqPhotos.length}
                                  </span>
                                )}
                              </button>
                            </div>

                            {reqOpen && !req.subitems?.length && (
                              <RequirementPhotos
                                photos={reqPhotos}
                                onUpload={(file) => uploadPhoto(section.id, req.id, undefined, file)}
                                onDelete={(p) => deletePhoto(p)}
                                readOnly={isViewingOther}
                              />
                            )}

                            {req.subitems && req.subitems.length > 0 && (
                              <div className="ml-9 space-y-1 border-l-2 border-muted pl-3">
                                {req.subitems.map((sub, i) => {
                                  const subPhotoKey = photoKey(section.id, req.id, sub.id);
                                  const subPhotos = photosMap[subPhotoKey] || [];
                                  const subOpen = openPhotos[subPhotoKey] ?? subPhotos.length > 0;
                                  return (
                                    <div key={sub.id} className="space-y-1">
                                    <div className="flex items-start gap-1">
                                      <button
                                        onClick={() => requestCheck(section.id, req.id, sub.text, sub.id)}
                                        className={`flex-1 flex items-start gap-2 p-2 rounded-lg text-left text-[11px] transition-colors ${
                                          sub.completed ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                                        }`}
                                      >
                                        {sub.completed ? (
                                          <div className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 rounded-full bg-primary flex items-center justify-center">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-accent" />
                                          </div>
                                        ) : (
                                          <Circle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                          <span className="leading-relaxed">{i + 1}. {sub.text}</span>
                                          {sub.completed && sub.completionInfo && (
                                            <div className="flex items-center gap-3 mt-0.5 text-[9px] text-muted-foreground">
                                              <span className="flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" />{sub.completionInfo.date}</span>
                                              <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{sub.completionInfo.instructor}</span>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                      <button
                                        onClick={() => togglePhotos(subPhotoKey)}
                                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary relative"
                                        title="Fotos del subítem"
                                      >
                                        <ImageIcon className="w-3 h-3" />
                                        {subPhotos.length > 0 && (
                                          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                            {subPhotos.length}
                                          </span>
                                        )}
                                      </button>
                                    </div>
                                    {subOpen && (
                                      <RequirementPhotos
                                        photos={subPhotos}
                                        onUpload={(file) => uploadPhoto(section.id, req.id, sub.id, file)}
                                        onDelete={(p) => deletePhoto(p)}
                                        readOnly={isViewingOther}
                                        compact
                                      />
                                    )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {req.hasShareOptions && (
                              <Collapsible>
                                <CollapsibleTrigger className="ml-9 flex items-center gap-1.5 text-[11px] text-primary font-medium py-1 px-2 rounded-lg hover:bg-primary/5 transition-colors">
                                  <Share2 className="w-3 h-3" />
                                  Sección Compartir — Elige {req.shareOptionsCount || 2} opciones
                                  <span className="text-muted-foreground ml-1">({(req.selectedShareOptions || []).length}/{req.shareOptionsCount || 2})</span>
                                  <ChevronDown className="w-3 h-3 ml-auto transition-transform" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="ml-9 mt-1 space-y-1 bg-muted/30 rounded-xl p-2">
                                    {shareOptions.map((opt) => {
                                      const isSelected = (req.selectedShareOptions || []).includes(opt.id);
                                      const isFull = (req.selectedShareOptions || []).length >= (req.shareOptionsCount || 2);
                                      return (
                                        <label key={opt.id} className={`flex items-start gap-2 p-2 rounded-lg text-[11px] cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary" : isFull ? "opacity-40 cursor-not-allowed" : "hover:bg-muted text-foreground"}`}>
                                          <Checkbox checked={isSelected} disabled={!isSelected && isFull} onCheckedChange={() => toggleShareOption(section.id, req.id, opt.id)} className="mt-0.5" />
                                          <span className="leading-relaxed">{opt.text}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            );
          })}
        </Accordion>
      </div>

      {/* Completion Modal */}
      <Dialog open={!!pendingCheck} onOpenChange={(open) => !open && setPendingCheck(null)}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Registrar Completado</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{pendingCheck?.label}</p>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="comp-date" className="text-xs">Fecha de completado</Label>
              <Input id="comp-date" type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-instructor" className="text-xs">Nombre del instructor</Label>
              <Input id="comp-instructor" placeholder="Nombre completo" value={modalInstructor} onChange={(e) => setModalInstructor(e.target.value)} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmCheck} disabled={!modalInstructor.trim()} className="w-full">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuiaMayor;

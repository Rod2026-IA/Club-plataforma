import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award, CheckCircle2, Circle, CalendarDays, User, Loader2, ImageIcon,
  GraduationCap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useClassCardData } from "@/hooks/useClassCardData";
import { type CardType, type ClassId } from "@/data/classCardsData";
import type { CompletionInfo } from "@/data/guiaMayorData";
import RequirementPhotos from "@/components/RequirementPhotos";
import EmptyState from "@/components/EmptyState";

interface PendingCheck {
  sectionId: string;
  reqId: string;
  subId?: string;
  label: string;
}

interface Props {
  classId: ClassId;
  cardType: CardType;
  targetUserId: string | null;
  isViewingOther?: boolean;
}

export default function ClassCardView({ classId, cardType, targetUserId, isViewingOther }: Props) {
  const { sections, photosMap, loading, upsertProgress, uploadPhoto, deletePhoto, photoKey } =
    useClassCardData(targetUserId, classId, cardType);
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);
  const [modalDate, setModalDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalInstructor, setModalInstructor] = useState("");
  const [openPhotos, setOpenPhotos] = useState<Record<string, boolean>>({});

  const togglePhotos = (k: string) => setOpenPhotos((p) => ({ ...p, [k]: !p[k] }));

  const requestCheck = (sectionId: string, reqId: string, label: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    const req = sec?.requirements.find((r) => r.id === reqId);
    if (req?.completed) {
      upsertProgress(sectionId, reqId, "", false);
      return;
    }
    setPendingCheck({ sectionId, reqId, label });
    setModalDate(new Date().toISOString().split("T")[0]);
    setModalInstructor("");
  };

  const confirmCheck = async () => {
    if (!pendingCheck) return;
    const info: CompletionInfo = { date: modalDate, instructor: modalInstructor };
    await upsertProgress(pendingCheck.sectionId, pendingCheck.reqId, "", true, info);
    setPendingCheck(null);
  };

  const totalReqs = sections.reduce((s, x) => s + x.requirements.length, 0);
  const done = sections.reduce((s, x) => s + x.requirements.filter((r) => r.completed).length, 0);
  const overall = totalReqs > 0 ? (done / totalReqs) * 100 : 0;

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Sin clases registradas"
        description="Aún no hay clases en este nivel. El contenido aparecerá aquí cuando esté disponible."
      />
    );
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220 70% 25%), hsl(220 60% 35%))" }}>
            <Award className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-sm">Progreso General</h3>
            <p className="text-muted-foreground text-xs">{done} de {totalReqs} requisitos</p>
          </div>
          <span className="text-xl font-bold text-foreground">{overall.toFixed(0)}%</span>
        </div>
        <Progress value={overall} className="h-2.5" />
      </motion.div>

      <Accordion type="multiple" className="space-y-2">
        {sections.map((section, sIdx) => {
          const sCompleted = section.requirements.filter((r) => r.completed).length;
          const sTotal = section.requirements.length;
          const sProgress = sTotal > 0 ? (sCompleted / sTotal) * 100 : 0;
          return (
            <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: sIdx * 0.04 }}>
              <AccordionItem value={section.id} className="glass-card rounded-2xl border-0 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${sProgress === 100 ? "bg-primary/20 text-accent" : "bg-primary/10 text-primary"}`}>
                      {sProgress === 100 ? <CheckCircle2 className="w-4 h-4" /> : `${sCompleted}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{section.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mr-2">{sCompleted}/{sTotal}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="mb-2"><Progress value={sProgress} className="h-1.5" /></div>
                  <div className="space-y-1.5">
                    {section.requirements.map((req) => {
                      const k = photoKey(section.id, req.id);
                      const reqPhotos = photosMap[k] || [];
                      const reqOpen = openPhotos[k] ?? reqPhotos.length > 0;
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
                              onClick={() => togglePhotos(k)}
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
                          {reqOpen && (
                            <RequirementPhotos
                              photos={reqPhotos}
                              onUpload={(file) => uploadPhoto(section.id, req.id, undefined, file)}
                              onDelete={(p) => deletePhoto(p)}
                              readOnly={isViewingOther}
                            />
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

      <Dialog open={!!pendingCheck} onOpenChange={(o) => !o && setPendingCheck(null)}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Registrar Completado</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{pendingCheck?.label}</p>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cc-date" className="text-xs">Fecha de completado</Label>
              <Input id="cc-date" type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-inst" className="text-xs">Instructor</Label>
              <Input id="cc-inst" value={modalInstructor} onChange={(e) => setModalInstructor(e.target.value)} placeholder="Nombre del instructor" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingCheck(null)}>Cancelar</Button>
            <Button size="sm" onClick={confirmCheck} disabled={!modalDate || !modalInstructor}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
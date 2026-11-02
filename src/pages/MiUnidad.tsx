import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Crown, FileText, Save, X, Pencil, QrCode, ScanLine, History, BarChart3, Trash2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import UnitAdminPanel from "@/components/UnitAdminPanel";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AuroraQuickTile from "@/components/aurora/AuroraQuickTile";
import AuroraStat from "@/components/aurora/AuroraStat";

const categories = [
  { key: "asistencia", label: "Asistencia", max: 25, short: "Asis" },
  { key: "puntualidad", label: "Puntualidad", max: 20, short: "Punt" },
  { key: "uniforme", label: "Uniforme", max: 20, short: "Unif" },
  { key: "part_devocional", label: "Part. Activa en el Devocional", max: 20, short: "Devo" },
  { key: "asistencia_ja", label: "Asistencia a JA", max: 25, short: "JA" },
  { key: "tareas", label: "Tareas", max: 20, short: "Tare" },
  { key: "cuota", label: "Cuota", max: 20, short: "Cuot" },
] as const;

const MAX_TOTAL = categories.reduce((s, c) => s + c.max, 0);

type CategoryKey = (typeof categories)[number]["key"];

interface MemberRow {
  user_id: string;
  position: string;
  profile: { first_name: string; first_last_name: string } | null;
}

interface EvalRow {
  id: string;
  user_id: string;
  evaluation_date: string;
  asistencia: number;
  puntualidad: number;
  uniforme: number;
  tareas: number;
  part_devocional: number;
  asistencia_ja: number;
  cuota: number;
  excusa?: string;
}

const getRoleLabel = (pos: string) => {
  if (pos === "capitan") return "Capitán";
  if (pos === "secretario") return "Secretario";
  return "Miembro";
};

const getRoleColor = (pos: string) => {
  if (pos === "capitan") return "bg-accent text-accent-foreground";
  if (pos === "secretario") return "bg-primary text-primary-foreground";
  return "bg-muted text-muted-foreground";
};

const getRoleIcon = (pos: string) => {
  if (pos === "capitan") return Crown;
  if (pos === "secretario") return FileText;
  return Users;
};

const MiUnidad = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitInfo, setUnitInfo] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [unitLoading, setUnitLoading] = useState(true);
  const [unitRefreshKey, setUnitRefreshKey] = useState(0);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<CategoryKey, number>>({
    asistencia: 0, puntualidad: 0, uniforme: 0, tareas: 0, part_devocional: 0, asistencia_ja: 0, cuota: 0,
  });
  const [excusa, setExcusa] = useState("");
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const canEdit = ["super_admin", "director", "subdirector"].includes(role || "");

  // Check if user is capitan or secretario
  const [userPosition, setUserPosition] = useState<string | null>(null);
  const canEditAsUnit = canEdit || userPosition === "capitan" || userPosition === "secretario";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUnitLoading(false);
      return;
    }
    let cancelled = false;
    const loadUnit = async () => {
      setUnitLoading(true);
      try {
        const { data: membership } = await supabase
          .from("unit_members")
          .select("unit_id, position")
          .eq("user_id", user.id)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (!membership) {
          setUnitId(null);
          setUserPosition(null);
          setUnitInfo(null);
          setMembers([]);
          setEvaluations([]);
          return;
        }

        setUnitId(membership.unit_id);
        setUserPosition(membership.position);

        const [{ data: unit }, { data: mems }, { data: evals }] = await Promise.all([
          supabase.from("units").select("name, logo_url").eq("id", membership.unit_id).single(),
          supabase.from("unit_members").select("user_id, position").eq("unit_id", membership.unit_id),
          supabase.from("evaluations").select("*").eq("unit_id", membership.unit_id),
        ]);

        if (cancelled) return;

        if (unit) setUnitInfo({ name: unit.name, logo_url: unit.logo_url });
        if (mems?.length) {
          const ids = mems.map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, first_name, first_last_name")
            .in("user_id", ids);
          if (cancelled) return;
          const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
          setMembers(mems.map((m) => ({ ...m, profile: profileMap.get(m.user_id) ?? null })));
        } else {
          setMembers([]);
        }
        setEvaluations((evals as EvalRow[]) ?? []);
      } finally {
        if (!cancelled) setUnitLoading(false);
      }
    };
    loadUnit();
    return () => { cancelled = true; };
  }, [authLoading, user, role, unitRefreshKey]);

  // Realtime subscription
  useEffect(() => {
    if (!unitId) return;
    const channel = supabase
      .channel("evaluations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "evaluations" }, (payload) => {
        // Refresh evaluations
        supabase
          .from("evaluations")
          .select("*")
          .eq("unit_id", unitId)
          .then(({ data }) => {
            if (data) setEvaluations(data as EvalRow[]);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const getMemberTotal = (userId: string) => {
    return evaluations
      .filter((e) => e.user_id === userId)
      .reduce(
        (sum, e) =>
          sum +
          (e.asistencia ?? 0) +
          (e.puntualidad ?? 0) +
          (e.uniforme ?? 0) +
          (e.tareas ?? 0) +
          (e.part_devocional ?? 0) +
          (e.asistencia_ja ?? 0) +
          (e.cuota ?? 0),
        0
      );
  };

  const getMemberEvals = (userId: string) =>
    evaluations.filter((e) => e.user_id === userId).sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date));

  const openEvalDialog = (member: MemberRow) => {
    setSelectedMember(member);
    setEditMode(false);
    setEditingEvalId(null);
    setFormData({ asistencia: 0, puntualidad: 0, uniforme: 0, tareas: 0, part_devocional: 0, asistencia_ja: 0, cuota: 0 });
    setExcusa("");
    setEvalDate(new Date().toISOString().split("T")[0]);
  };

  const startEditEval = (ev: EvalRow) => {
    setEditingEvalId(ev.id);
    setEditMode(true);
    setEvalDate(ev.evaluation_date);
    setFormData({
      asistencia: ev.asistencia,
      puntualidad: ev.puntualidad,
      uniforme: ev.uniforme,
      tareas: ev.tareas,
      part_devocional: (ev as any).part_devocional ?? 0,
      asistencia_ja: (ev as any).asistencia_ja ?? 0,
      cuota: ev.cuota,
    });
    setExcusa((ev as any).excusa ?? "");
  };

  const handleDelete = async () => {
    if (!editingEvalId) return;
    if (!confirm("¿Eliminar esta evaluación?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("evaluations").delete().eq("id", editingEvalId);
      if (error) throw error;
      toast({ title: "Evaluación eliminada" });
      setSelectedMember(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMember || !unitId) return;
    setSaving(true);
    try {
      if (editingEvalId) {
        const { error } = await supabase
          .from("evaluations")
          .update({ evaluation_date: evalDate, ...formData, excusa })
          .eq("id", editingEvalId);
        if (error) throw error;
        toast({ title: "Evaluación actualizada" });
      } else {
        const { error } = await supabase.from("evaluations").insert({
          user_id: selectedMember.user_id,
          unit_id: unitId,
          evaluation_date: evalDate,
          registered_by: user!.id,
          ...formData,
          excusa,
        });
        if (error) throw error;
        toast({ title: "Evaluación guardada" });
      }
      setSelectedMember(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const unitTotal = members.reduce((sum, m) => sum + getMemberTotal(m.user_id), 0);

  // Mini resumen del último día con registros
  const latestDate = evaluations.length
    ? evaluations.map((e) => e.evaluation_date).sort().slice(-1)[0]
    : null;
  const todayEvals = latestDate ? evaluations.filter((e) => e.evaluation_date === latestDate) : [];
  const presentes = todayEvals.filter((e) => (e.asistencia ?? 0) > 0);
  // Solo se considera ausente si existe una evaluación registrada con asistencia = 0
  const ausentesEvals = todayEvals.filter((e) => (e.asistencia ?? 0) === 0);
  const ausentes = ausentesEvals.map((e) => ({ user_id: e.user_id }));
  const conExcusa = todayEvals.filter((e) => (e.excusa ?? "").trim().length > 0);
  const pagaronCuota = todayEvals.filter((e) => (e.cuota ?? 0) > 0);
  const totalCuota = pagaronCuota.length * 10;
  const memberName = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.profile ? `${m.profile.first_name} ${m.profile.first_last_name}` : "—";
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Mi Unidad" subtitle="Evaluación mensual" />

      {unitInfo && (
        <div className="container pt-4 px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-5 flex items-center gap-4 text-white"
            style={{
              background: "linear-gradient(135deg, var(--aurora-violet) 0%, var(--aurora-cyan) 100%)",
              boxShadow: "0 18px 50px -16px rgba(109,91,208,0.55)",
            }}
          >
            <div
              className="aurora-blob"
              style={{
                position: "absolute", top: -60, right: -40, width: 180, height: 180, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/15 border border-white/25 flex items-center justify-center shrink-0 backdrop-blur-sm">
              {unitInfo.logo_url ? (
                <img src={unitInfo.logo_url} alt={unitInfo.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 aurora-mono">Unidad</p>
              <h2 className="text-2xl text-white aurora-display" style={{ lineHeight: 1.1 }}>{unitInfo.name}</h2>
            </div>
          </motion.div>
        </div>
      )}

      <div className="container px-4 py-5 space-y-5 pb-28">
        {/* QR quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AuroraQuickTile to="/mi-qr" icon={QrCode} label="Mi QR" tint="var(--aurora-violet)" />
          {canEditAsUnit && (
            <AuroraQuickTile to="/escanear" icon={ScanLine} label="Escanear" tint="var(--aurora-mint)" />
          )}
          <AuroraQuickTile to="/mi-historial" icon={History} label="Historial" tint="var(--aurora-cyan)" />
          {canEdit && (
            <AuroraQuickTile to="/reportes-unidad" icon={BarChart3} label="Reportes" tint="var(--aurora-rose)" />
          )}
        </motion.div>

        {/* Admin: create units & assign members */}
        <UnitAdminPanel onChanged={() => setUnitRefreshKey((key) => key + 1)} />

        {/* Unit Total */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="aurora-card p-5 flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] aurora-mono" style={{ color: "var(--aurora-text-mute)" }}>
              Puntaje Total
            </p>
            <p className="aurora-display text-4xl mt-1" style={{ color: "var(--aurora-violet)" }}>
              {unitTotal}
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))" }}
          >
            <BarChart3 className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Resumen del día */}
        {latestDate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="aurora-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="aurora-grotesk font-semibold" style={{ color: "var(--aurora-text)" }}>Resumen del día</h3>
              <span className="aurora-chip">{latestDate}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AuroraStat label="Presentes" value={presentes.length} tint="var(--aurora-mint)" />
              <AuroraStat label="Ausentes" value={ausentes.length} tint="var(--aurora-red)" />
              <AuroraStat label="Cuota (Lps)" value={`L. ${totalCuota}`} tint="var(--aurora-gold)" />
              <AuroraStat label="Observaciones" value={conExcusa.length} tint="var(--aurora-violet)" />
            </div>
            {conExcusa.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] aurora-mono" style={{ color: "var(--aurora-text-mute)" }}>Observaciones</p>
                {conExcusa.map((e) => (
                  <div key={e.id} className="rounded-xl p-3" style={{ background: "var(--aurora-surface-2)", border: "1px solid var(--aurora-line)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--aurora-text)" }}>{memberName(e.user_id)}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--aurora-text-mute)" }}>{e.excusa}</p>
                  </div>
                ))}
              </div>
            )}
            {ausentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] aurora-mono" style={{ color: "var(--aurora-text-mute)" }}>Ausentes</p>
                <div className="flex flex-wrap gap-2">
                  {ausentes.map((a) => (
                    <span key={a.user_id} className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background: "color-mix(in oklab, var(--aurora-red) 14%, transparent)",
                        color: "var(--aurora-red)",
                        border: "1px solid color-mix(in oklab, var(--aurora-red) 30%, transparent)",
                      }}
                    >
                      {memberName(a.user_id)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Members Table */}
        {unitLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aurora-card p-8 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--aurora-violet)", borderTopColor: "transparent" }} />
            <p style={{ color: "var(--aurora-text-mute)" }}>Cargando unidad…</p>
          </motion.div>
        ) : members.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="aurora-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="aurora-grotesk font-semibold" style={{ color: "var(--aurora-text)" }}>Miembros</h3>
              <span className="aurora-chip">{members.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--aurora-text-mute)", borderBottom: "1px solid var(--aurora-line)" }}>
                    <th className="text-left py-2 pr-2">Nombre</th>
                    <th className="text-center py-2 px-1">Cargo</th>
                    {categories.map((c) => (
                      <th key={c.key} className="text-center py-2 px-1">{c.short}</th>
                    ))}
                    <th className="text-center py-2 pl-2 font-bold" style={{ color: "var(--aurora-text)" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const evals = getMemberEvals(member.user_id);
                    const totals: Record<string, number> = {};
                    categories.forEach((c) => {
                      totals[c.key] = evals.reduce((s, e) => s + (e as any)[c.key], 0);
                    });
                    const total = getMemberTotal(member.user_id);
                    const name = member.profile ? member.profile.first_name : "—";

                    return (
                      <tr
                        key={member.user_id}
                        className="aurora-tap cursor-pointer transition-colors"
                        style={{ borderTop: "1px solid var(--aurora-line)" }}
                        onClick={() => openEvalDialog(member)}
                      >
                        <td className="py-2.5 pr-2 font-medium" style={{ color: "var(--aurora-text)" }}>{name}</td>
                        <td className="text-center py-2 px-1">
                          <Badge variant="secondary" className={`text-xs ${getRoleColor(member.position)}`}>
                            {getRoleLabel(member.position)}
                          </Badge>
                        </td>
                        {categories.map((c) => (
                          <td key={c.key} className="text-center py-2 px-1" style={{ color: "var(--aurora-text-mute)" }}>
                            {totals[c.key]}
                          </td>
                        ))}
                        <td className="text-center py-2 pl-2 font-bold" style={{ color: "var(--aurora-violet)" }}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aurora-card p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--aurora-text-dim)" }} />
            <p style={{ color: "var(--aurora-text-mute)" }}>No estás asignado a ninguna unidad aún.</p>
          </motion.div>
        )}
      </div>

      {/* Evaluation Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>
              {selectedMember?.profile
                ? `${selectedMember.profile.first_name} ${selectedMember.profile.first_last_name}`
                : "Evaluación"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-2">
          {/* History */}
          {selectedMember && getMemberEvals(selectedMember.user_id).length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Historial</p>
              {getMemberEvals(selectedMember.user_id).map((ev) => {
                const realTotal =
                  (ev.asistencia ?? 0) + (ev.puntualidad ?? 0) + (ev.uniforme ?? 0) +
                  (ev.tareas ?? 0) + ((ev as any).part_devocional ?? 0) +
                  ((ev as any).asistencia_ja ?? 0) + (ev.cuota ?? 0);
                const isEditing = editingEvalId === ev.id;
                return (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${
                      isEditing ? "bg-primary/15 ring-1 ring-primary/40" : "bg-muted/30"
                    }`}
                  >
                    <span className="text-muted-foreground">{ev.evaluation_date}</span>
                    <span className="flex-1" />
                    <span className="font-bold text-foreground">{realTotal}</span>
                    {canEditAsUnit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => startEditEval(ev)}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* New / Edit Evaluation Form */}
          {canEditAsUnit && (
            <>
              {!editMode ? (
                <Button variant="outline" onClick={() => { setEditMode(true); setEditingEvalId(null); }} className="w-full">
                  <Pencil className="w-4 h-4 mr-2" />
                  Nueva Evaluación
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {editingEvalId ? "Editando evaluación" : "Nueva evaluación"}
                  </p>
                  <div>
                    <Label>Fecha</Label>
                    <Input type="date" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    {categories.map((c) => {
                      const on = formData[c.key] > 0;
                      return (
                        <button
                          type="button"
                          key={c.key}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, [c.key]: on ? 0 : c.max }))
                          }
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left",
                            on
                              ? "bg-gradient-neon-green text-white border-transparent neon-glow-green"
                              : "glass-card text-foreground border-border/50 hover:border-primary/40"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                on ? "bg-white/20" : "bg-muted"
                              )}
                            >
                              {on ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-muted-foreground" />}
                            </span>
                            <span className="font-semibold text-sm">{c.label}</span>
                          </div>
                          <span className="text-base font-bold">{on ? `+${c.max}` : "0"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <Label>Observaciones (opcional)</Label>
                    <Textarea
                      value={excusa}
                      onChange={(e) => setExcusa(e.target.value)}
                      placeholder="Notas u observaciones del día. No afecta el puntaje ni cuenta como inasistencia."
                      rows={3}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Solo se considera inasistencia cuando el ítem "Asistencia" queda en cero.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold neon-text-cyan">
                      {Object.values(formData).reduce((s, v) => s + v, 0)}
                      <span className="text-sm text-muted-foreground"> / {MAX_TOTAL}</span>
                    </span>
                  </div>
                  <DialogFooter className="gap-2 sm:justify-between sticky bottom-0 bg-background pt-3 -mx-6 px-6 pb-1 border-t border-border/40">
                    {editingEvalId && canEdit ? (
                      <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                        <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                      </Button>
                    ) : <span />}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setEditMode(false); setEditingEvalId(null); }}>
                        <X className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" /> {saving ? "Guardando…" : "Guardar"}
                      </Button>
                    </div>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiUnidad;

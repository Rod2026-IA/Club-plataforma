import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Save, AlertCircle, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const criteria = [
  { key: "asistencia", label: "Asistencia", points: 25 },
  { key: "puntualidad", label: "Puntualidad", points: 20 },
  { key: "uniforme", label: "Uniforme", points: 20 },
  { key: "part_devocional", label: "Part. Activa en el Devocional", points: 20 },
  { key: "asistencia_ja", label: "Asistencia a JA", points: 25 },
  { key: "tareas", label: "Tareas", points: 20 },
  { key: "cuota", label: "Cuota", points: 20 },
] as const;

const TOTAL_POSSIBLE = criteria.reduce((s, c) => s + c.points, 0);

type CritKey = (typeof criteria)[number]["key"];

const ScanRegister = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  const [memberName, setMemberName] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState("");
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [scannerPosition, setScannerPosition] = useState<string | null>(null);
  const [alreadyToday, setAlreadyToday] = useState(false);
  const [scores, setScores] = useState<Record<CritKey, boolean>>({
    asistencia: false,
    puntualidad: false,
    cuota: false,
    part_devocional: false,
    asistencia_ja: false,
    tareas: false,
    uniforme: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [evalDate, setEvalDate] = useState<string>(todayStr);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!userId || !user) return;
      setLoadingData(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, first_last_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileData) {
        setMemberName(`${profileData.first_name} ${profileData.first_last_name}`);
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      setMemberRole(roleData?.role ?? null);

      const { data: unitData } = await supabase
        .from("unit_members")
        .select("unit_id, units(name)")
        .eq("user_id", userId)
        .maybeSingle();
      if (unitData) {
        setUnitId(unitData.unit_id);
        setUnitName((unitData as any).units?.name ?? "");
      }

      const { data: scannerUnit } = await supabase
        .from("unit_members")
        .select("position")
        .eq("user_id", user.id)
        .maybeSingle();
      setScannerPosition(scannerUnit?.position ?? null);

      const { data: existing } = await supabase
        .from("evaluations")
        .select("id, asistencia, puntualidad, cuota, part_devocional, asistencia_ja, tareas, uniforme")
        .eq("user_id", userId)
        .eq("evaluation_date", evalDate)
        .maybeSingle();
      if (existing) {
        setAlreadyToday(true);
        setScores({
          asistencia: (existing.asistencia ?? 0) > 0,
          puntualidad: (existing.puntualidad ?? 0) > 0,
          cuota: (existing.cuota ?? 0) > 0,
          part_devocional: ((existing as any).part_devocional ?? 0) > 0,
          asistencia_ja: ((existing as any).asistencia_ja ?? 0) > 0,
          tareas: (existing.tareas ?? 0) > 0,
          uniforme: (existing.uniforme ?? 0) > 0,
        });
      } else {
        setAlreadyToday(false);
        setScores({
          asistencia: false, puntualidad: false, cuota: false,
          part_devocional: false, asistencia_ja: false, tareas: false, uniforme: false,
        });
      }

      setLoadingData(false);
    };
    load();
  }, [userId, user, evalDate]);

  const total = useMemo(
    () => criteria.reduce((s, c) => s + (scores[c.key] ? c.points : 0), 0),
    [scores]
  );

  const isEvaluable = memberRole !== "director" && memberRole !== "subdirector";
  const canRegister =
    role === "super_admin" ||
    role === "director" ||
    role === "subdirector" ||
    scannerPosition === "capitan" ||
    scannerPosition === "secretario";

  const toggle = (k: CritKey) => setScores((p) => ({ ...p, [k]: !p[k] }));

  const submit = async () => {
    if (!userId || !user || !unitId) {
      toast({ title: "Falta unidad asignada al miembro", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload: any = {
      user_id: userId,
      unit_id: unitId,
      evaluation_date: evalDate,
      registered_by: user.id,
    };
    criteria.forEach((c) => {
      payload[c.key] = scores[c.key] ? c.points : 0;
    });

    const { error } = await supabase
      .from("evaluations")
      .upsert(payload, { onConflict: "user_id,evaluation_date" });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Evaluación guardada", description: `Total: ${total} puntos` });
    navigate("/mi-unidad");
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Registro de Evaluación" subtitle="" />
        <div className="container py-8 text-center text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (!canRegister) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Registro de Evaluación" subtitle="" />
        <div className="container py-8 max-w-lg">
          <div className="glass-card rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground">
              No tienes permisos para registrar evaluaciones.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isEvaluable) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Registro de Evaluación" subtitle="" />
        <div className="container py-8 max-w-lg">
          <div className="glass-card rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground">
              No se pueden registrar evaluaciones para directores o subdirectores.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader title="Registro de Evaluación" subtitle={format(parseISO(evalDate), "PPP", { locale: es })} />
      <div className="container py-6 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 mb-4"
        >
          <p className="text-xs uppercase tracking-wider text-primary">Integrante</p>
          <h2 className="text-xl font-bold text-foreground">{memberName || "—"}</h2>
          {unitName && <p className="text-sm text-muted-foreground mt-1">{unitName}</p>}

          {/* Date picker */}
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
              Fecha de la evaluación
            </p>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !evalDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(parseISO(evalDate), "PPP", { locale: es })}
                  {evalDate === todayStr && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">
                      Hoy
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(evalDate)}
                  onSelect={(d) => {
                    if (d) {
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      setEvalDate(iso);
                      setDatePickerOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  locale={es}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {alreadyToday && (
            <div className="mt-3 flex items-center gap-2 text-xs text-accent">
              <AlertCircle className="w-4 h-4" />
              Ya existe un registro para esta fecha. Al guardar se actualizará.
            </div>
          )}
        </motion.div>

        <div className="space-y-3">
          {criteria.map(({ key, label }) => {
            const on = scores[key];
            const pts = criteria.find((c) => c.key === key)!.points;
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={cn(
                  "w-full flex items-center justify-between rounded-2xl border px-5 py-4 transition-all text-left",
                  on
                    ? "bg-gradient-neon-green text-white border-transparent neon-glow-green"
                    : "glass-card text-foreground border-border/50 hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      on ? "bg-white/20" : "bg-muted"
                    )}
                  >
                    {on ? <Check className="w-5 h-5" /> : <X className="w-5 h-5 text-muted-foreground" />}
                  </span>
                  <span className={cn("font-semibold text-base", on && "text-white")}>{label}</span>
                </div>
                <span className={cn("text-lg font-bold", on && "text-white")}>{on ? `+${pts}` : `0/${pts}`}</span>
              </button>
            );
          })}
        </div>

        <motion.div
          layout
          className="sticky bottom-4 mt-6 glass-card rounded-2xl p-4 flex items-center justify-between neon-glow-cyan"
        >
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold neon-text-cyan">{total}<span className="text-base text-muted-foreground"> / {TOTAL_POSSIBLE}</span></p>
          </div>
          <Button onClick={submit} disabled={submitting} className="gap-2 h-12 px-6">
            <Save className="w-4 h-4" />
            {submitting ? "Guardando…" : "Guardar"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ScanRegister;

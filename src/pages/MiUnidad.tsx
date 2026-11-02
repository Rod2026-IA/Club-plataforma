import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Crown,
  FileText,
  Save,
  X,
  Pencil,
  QrCode,
  ScanLine,
  History,
  BarChart3,
  Trash2,
  Check,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Shield,
  Layers,
  ChevronDown,
  Sparkles,
  Calendar,
  AlertCircle,
  Coins,
  Award,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import UnitAdminPanel, { Unit } from "@/components/UnitAdminPanel";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AuroraAvatar from "@/components/aurora/AuroraAvatar";

const categories = [
  { key: "asistencia", label: "Asistencia", max: 25, short: "Asis", icon: "✓" },
  { key: "puntualidad", label: "Puntualidad", max: 20, short: "Punt", icon: "⏱" },
  { key: "uniforme", label: "Uniforme", max: 20, short: "Unif", icon: "👔" },
  { key: "part_devocional", label: "Part. Activa Devocional", max: 20, short: "Devo", icon: "📖" },
  { key: "asistencia_ja", label: "Asistencia a JA", max: 25, short: "JA", icon: "⛪" },
  { key: "tareas", label: "Tareas y Especialidades", max: 20, short: "Tare", icon: "📝" },
  { key: "cuota", label: "Cuota Semanal", max: 20, short: "Cuot", icon: "🪙" },
] as const;

const MAX_TOTAL = categories.reduce((s, c) => s + c.max, 0); // 150 points

type CategoryKey = (typeof categories)[number]["key"];

interface MemberRow {
  user_id: string;
  position: string;
  profile: {
    first_name: string;
    first_last_name: string;
    avatar_url?: string | null;
  } | null;
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
  return "Integrante";
};

const MiUnidad = () => {
  const { user, role, loading: authLoading } = useAuth();

  // Navigation & View state
  const [activeMainTab, setActiveMainTab] = useState<"members" | "all_units" | "admin">("members");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchMember, setSearchMember] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "capitan" | "secretario" | "miembro">("all");

  // Unit and data states
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitInfo, setUnitInfo] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [unitLoading, setUnitLoading] = useState(true);
  const [unitRefreshKey, setUnitRefreshKey] = useState(0);

  // User position & permissions
  const [userPosition, setUserPosition] = useState<string | null>(null);
  const isClubLeadership = ["super_admin", "director", "subdirector"].includes(role || "");
  const canEdit = isClubLeadership || userPosition === "capitan" || userPosition === "secretario";

  // Evaluation modal states
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [evalModalTab, setEvalModalTab] = useState<"evaluate" | "history">("evaluate");
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<CategoryKey, number>>({
    asistencia: 0,
    puntualidad: 0,
    uniforme: 0,
    tareas: 0,
    part_devocional: 0,
    asistencia_ja: 0,
    cuota: 0,
  });
  const [excusa, setExcusa] = useState("");
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  // Load all club units (for switching or overview)
  useEffect(() => {
    const fetchAllUnits = async () => {
      const { data } = await supabase.from("units").select("id, name, logo_url").order("name");
      setAllUnits((data as Unit[]) ?? []);
    };
    fetchAllUnits();
  }, [unitRefreshKey]);

  // Load active unit, members & evaluations
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUnitLoading(false);
      return;
    }

    let cancelled = false;

    const loadUnitData = async () => {
      setUnitLoading(true);
      try {
        let currentTargetUnitId = unitId;

        // If no unitId explicitly selected yet, resolve from membership
        if (!currentTargetUnitId) {
          const { data: membership } = await supabase
            .from("unit_members")
            .select("unit_id, position")
            .eq("user_id", user.id)
            .order("position", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (cancelled) return;

          if (membership) {
            currentTargetUnitId = membership.unit_id;
            setUserPosition(membership.position);
            setUnitId(membership.unit_id);
          } else if (isClubLeadership) {
            // Directors with no personal unit assignment default to the first available unit
            const { data: firstUnit } = await supabase
              .from("units")
              .select("id")
              .order("name")
              .limit(1)
              .maybeSingle();
            if (firstUnit) {
              currentTargetUnitId = firstUnit.id;
              setUnitId(firstUnit.id);
            }
          }
        } else {
          // If a unitId is already set, check if user is member/leader in it
          const { data: userMem } = await supabase
            .from("unit_members")
            .select("position")
            .eq("user_id", user.id)
            .eq("unit_id", currentTargetUnitId)
            .maybeSingle();
          setUserPosition(userMem?.position || null);
        }

        if (!currentTargetUnitId) {
          setUnitInfo(null);
          setMembers([]);
          setEvaluations([]);
          return;
        }

        // Fetch unit details, members, and evaluations in parallel
        const [{ data: unit }, { data: mems }, { data: evals }] = await Promise.all([
          supabase.from("units").select("id, name, logo_url").eq("id", currentTargetUnitId).single(),
          supabase.from("unit_members").select("user_id, position").eq("unit_id", currentTargetUnitId),
          supabase.from("evaluations").select("*").eq("unit_id", currentTargetUnitId),
        ]);

        if (cancelled) return;

        if (unit) {
          setUnitInfo({ id: unit.id, name: unit.name, logo_url: unit.logo_url });
        }

        if (mems?.length) {
          const ids = mems.map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, first_name, first_last_name, avatar_url")
            .in("user_id", ids);

          if (cancelled) return;

          const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
          // Sort members: Capitan first, then Secretario, then alphabetically
          const sortedMembers = mems.map((m) => ({
            ...m,
            profile: profileMap.get(m.user_id) ?? null,
          })).sort((a, b) => {
            if (a.position === "capitan") return -1;
            if (b.position === "capitan") return 1;
            if (a.position === "secretario") return -1;
            if (b.position === "secretario") return 1;
            const nameA = a.profile?.first_name || "";
            const nameB = b.profile?.first_name || "";
            return nameA.localeCompare(nameB);
          });

          setMembers(sortedMembers);
        } else {
          setMembers([]);
        }

        setEvaluations((evals as EvalRow[]) ?? []);
      } finally {
        if (!cancelled) setUnitLoading(false);
      }
    };

    loadUnitData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, role, unitId, unitRefreshKey, isClubLeadership]);

  // Realtime subscription for evaluations
  useEffect(() => {
    if (!unitId) return;
    const channel = supabase
      .channel("evaluations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "evaluations" }, () => {
        supabase
          .from("evaluations")
          .select("*")
          .eq("unit_id", unitId)
          .then(({ data }) => {
            if (data) setEvaluations(data as EvalRow[]);
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitId]);

  // Helper calculations
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
          ((e as any).part_devocional ?? 0) +
          ((e as any).asistencia_ja ?? 0) +
          (e.cuota ?? 0),
        0
      );
  };

  const getMemberEvals = (userId: string) =>
    evaluations
      .filter((e) => e.user_id === userId)
      .sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date));

  const unitTotal = members.reduce((sum, m) => sum + getMemberTotal(m.user_id), 0);

  // Leadership info
  const capitanMember = members.find((m) => m.position === "capitan");
  const secretarioMember = members.find((m) => m.position === "secretario");

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = m.profile ? `${m.profile.first_name} ${m.profile.first_last_name}`.toLowerCase() : "";
      const matchesSearch = !searchMember.trim() || name.includes(searchMember.toLowerCase().trim());
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "capitan" && m.position === "capitan") ||
        (roleFilter === "secretario" && m.position === "secretario") ||
        (roleFilter === "miembro" && m.position !== "capitan" && m.position !== "secretario");

      return matchesSearch && matchesRole;
    });
  }, [members, searchMember, roleFilter]);

  // Latest evaluation date & metrics
  const latestDate = useMemo(() => {
    if (!evaluations.length) return null;
    return evaluations.map((e) => e.evaluation_date).sort().slice(-1)[0];
  }, [evaluations]);

  const todayEvals = latestDate ? evaluations.filter((e) => e.evaluation_date === latestDate) : [];
  const presentes = todayEvals.filter((e) => (e.asistencia ?? 0) > 0);
  const ausentesEvals = todayEvals.filter((e) => (e.asistencia ?? 0) === 0);
  const ausentes = ausentesEvals.map((e) => ({ user_id: e.user_id }));
  const conExcusa = todayEvals.filter((e) => (e.excusa ?? "").trim().length > 0);
  const pagaronCuota = todayEvals.filter((e) => (e.cuota ?? 0) > 0);
  const totalCuota = pagaronCuota.length * 10;

  const memberName = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.profile ? `${m.profile.first_name} ${m.profile.first_last_name}` : "—";
  };

  // Evaluation Dialog Actions
  const openEvalDialog = (member: MemberRow) => {
    setSelectedMember(member);
    setEvalModalTab("evaluate");
    setEditingEvalId(null);
    setFormData({
      asistencia: 25,
      puntualidad: 20,
      uniforme: 20,
      tareas: 20,
      part_devocional: 20,
      asistencia_ja: 25,
      cuota: 20,
    });
    setExcusa("");
    setEvalDate(new Date().toISOString().split("T")[0]);
  };

  const startEditEval = (ev: EvalRow) => {
    setEditingEvalId(ev.id);
    setEvalModalTab("evaluate");
    setEvalDate(ev.evaluation_date);
    setFormData({
      asistencia: ev.asistencia ?? 0,
      puntualidad: ev.puntualidad ?? 0,
      uniforme: ev.uniforme ?? 0,
      tareas: ev.tareas ?? 0,
      part_devocional: (ev as any).part_devocional ?? 0,
      asistencia_ja: (ev as any).asistencia_ja ?? 0,
      cuota: ev.cuota ?? 0,
    });
    setExcusa((ev as any).excusa ?? "");
  };

  const handleDelete = async () => {
    if (!editingEvalId) return;
    if (!confirm("¿Eliminar este registro de evaluación?")) return;
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
        toast({ title: "Evaluación actualizada correctamente" });
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
        toast({ title: "Evaluación registrada correctamente" });
      }
      setSelectedMember(null);
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentFormTotal = Object.values(formData).reduce((s, v) => s + v, 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      <PageHeader
        title="Mi Unidad"
        subtitle="Control de grupo, desempeño individual y registro de actividades"
      />

      <div className="container max-w-5xl px-4 py-4 space-y-5">
        {/* TOP SELECTOR & STATUS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Vista de Grupo
              </p>
              <h2 className="text-sm font-bold text-foreground">
                {unitInfo ? unitInfo.name : "Sin unidad asignada"}
              </h2>
            </div>
          </div>

          {/* Unit selector for leadership or browsing */}
          {(isClubLeadership || allUnits.length > 1) && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-muted-foreground hidden sm:inline">Cambiar unidad:</span>
              <Select
                value={unitId || ""}
                onValueChange={(val) => {
                  setUnitId(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl w-[200px] border-border/80 bg-background font-medium">
                  <SelectValue placeholder="Seleccionar unidad" />
                </SelectTrigger>
                <SelectContent>
                  {allUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* UNIT HERO DISPLAY (When unit exists) */}
        {unitInfo ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Emblem & Identity */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-background border-2 border-border/80 shadow-md flex items-center justify-center shrink-0">
                  {unitInfo.logo_url ? (
                    <img
                      src={unitInfo.logo_url}
                      alt={unitInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-primary" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary font-mono">
                      Unidad de Conquistadores
                    </span>
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                      {members.length} {members.length === 1 ? "miembro" : "miembros"}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-0.5 tracking-tight">
                    {unitInfo.name}
                  </h1>

                  {/* Leadership names */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-medium text-foreground">
                        Capitán: {capitanMember?.profile?.first_name || "Sin asignar"}
                      </span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-medium text-foreground">
                        Secretario: {secretarioMember?.profile?.first_name || "Sin asignar"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score & KPI Strip */}
              <div className="flex items-center gap-4 bg-background/80 border border-border/60 rounded-2xl p-4 shadow-sm shrink-0 self-stretch md:self-auto justify-around">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Puntaje Total
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-primary font-mono tabular-nums mt-0.5">
                    {unitTotal}
                  </p>
                  <span className="text-[10px] text-muted-foreground">puntos acumulados</span>
                </div>

                <div className="h-10 w-px bg-border/60" />

                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Promedio
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-foreground font-mono tabular-nums mt-0.5">
                    {members.length > 0 ? Math.round(unitTotal / members.length) : 0}
                  </p>
                  <span className="text-[10px] text-muted-foreground">pts / integrante</span>
                </div>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-border/40">
              <Link
                to="/mi-qr"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground group"
              >
                <QrCode className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span>Mi QR</span>
              </Link>

              {canEdit && (
                <Link
                  to="/escanear"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground group"
                >
                  <ScanLine className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>Escanear</span>
                </Link>
              )}

              <Link
                to="/mi-historial"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground group"
              >
                <History className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                <span>Historial</span>
              </Link>

              {isClubLeadership && (
                <Link
                  to="/reportes-unidad"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground group"
                >
                  <BarChart3 className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                  <span>Reportes</span>
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          /* Empty / Unassigned Welcome State */
          <div className="rounded-3xl border border-border/60 bg-card p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isClubLeadership
                  ? "Crea o selecciona una unidad para comenzar"
                  : "Aún no tienes una unidad asignada"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                {isClubLeadership
                  ? "Puedes crear las unidades del club o asignar a los conquistadores desde la pestaña de Administración."
                  : "Pídele a tu Director o Consejero de Club que te asigne a una de las unidades activas."}
              </p>
            </div>

            {isClubLeadership && (
              <Button
                onClick={() => setActiveMainTab("admin")}
                className="gap-2 rounded-xl text-xs font-semibold"
              >
                <Sparkles className="w-4 h-4" /> Ir a Gestión de Unidades
              </Button>
            )}
          </div>
        )}

        {/* MAIN NAVIGATION SEGMENTED TABS */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMainTab("members")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeMainTab === "members"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Integrantes ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("all_units")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeMainTab === "all_units"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Unidades del Club ({allUnits.length})</span>
            </button>

            {isClubLeadership && (
              <button
                type="button"
                onClick={() => setActiveMainTab("admin")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeMainTab === "admin"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Gestión y Asignación</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MEMBERS & EVALUATIONS */}
        {activeMainTab === "members" && (
          <div className="space-y-5">
            {/* Filter and View mode toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl p-3 shadow-sm">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="pl-9 h-9 text-xs rounded-xl border-border/60 bg-background"
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setRoleFilter("all")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    roleFilter === "all"
                      ? "bg-muted text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("capitan")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    roleFilter === "capitan"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown className="w-3 h-3 text-amber-500" /> Capitán
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("secretario")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    roleFilter === "secretario"
                      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3 h-3 text-indigo-500" /> Secretario
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("miembro")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    roleFilter === "miembro"
                      ? "bg-muted text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Integrantes
                </button>

                <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

                {/* View Mode Toggle */}
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                    title="Vista Cuadrícula"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                    title="Vista Tabla"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* MEMBERS LIST DISPLAY */}
            {unitLoading ? (
              <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Cargando integrantes y calificaciones...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-8 text-center space-y-2">
                <Users className="w-10 h-10 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No se encontraron integrantes</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {members.length === 0
                    ? "Esta unidad aún no tiene integrantes asignados."
                    : "Intenta con otro término de búsqueda o filtro de cargo."}
                </p>
              </div>
            ) : viewMode === "cards" ? (
              /* CARDS VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMembers.map((member) => {
                  const total = getMemberTotal(member.user_id);
                  const evals = getMemberEvals(member.user_id);
                  const isCapitan = member.position === "capitan";
                  const isSecretario = member.position === "secretario";
                  const fullName = member.profile
                    ? `${member.profile.first_name} ${member.profile.first_last_name}`
                    : "Conquistador";
                  const initials = member.profile
                    ? `${member.profile.first_name?.[0] || ""}${member.profile.first_last_name?.[0] || ""}`.toUpperCase()
                    : "CQ";

                  // Category breakdown totals
                  const catTotals: Record<string, number> = {};
                  categories.forEach((c) => {
                    catTotals[c.key] = evals.reduce((s, e) => s + ((e as any)[c.key] ?? 0), 0);
                  });

                  return (
                    <motion.div
                      key={member.user_id}
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-border/60 bg-card p-4.5 shadow-sm hover:border-border transition-all flex flex-col justify-between space-y-4"
                    >
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AuroraAvatar
                            size={44}
                            initials={initials}
                            imageUrl={member.profile?.avatar_url}
                            color={
                              isCapitan
                                ? "var(--aurora-peach)"
                                : isSecretario
                                ? "var(--aurora-violet)"
                                : "var(--aurora-cyan)"
                            }
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">
                              {fullName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCapitan
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : isSecretario
                                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isCapitan && <Crown className="w-3 h-3 text-amber-500" />}
                                {isSecretario && <FileText className="w-3 h-3 text-indigo-500" />}
                                {getRoleLabel(member.position)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Points badge */}
                        <div className="text-right shrink-0">
                          <span className="text-lg font-black text-primary font-mono tabular-nums">
                            {total}
                          </span>
                          <span className="text-[10px] block text-muted-foreground">pts</span>
                        </div>
                      </div>

                      {/* Mini Category Chips Grid */}
                      <div className="grid grid-cols-4 gap-1.5 text-center bg-muted/30 p-2.5 rounded-xl border border-border/40">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Asis</p>
                          <p className="text-xs font-bold text-foreground font-mono mt-0.5">
                            {catTotals.asistencia || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Unif</p>
                          <p className="text-xs font-bold text-foreground font-mono mt-0.5">
                            {catTotals.uniforme || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Tare</p>
                          <p className="text-xs font-bold text-foreground font-mono mt-0.5">
                            {catTotals.tareas || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Cuot</p>
                          <p className="text-xs font-bold text-foreground font-mono mt-0.5">
                            {catTotals.cuota || 0}
                          </p>
                        </div>
                      </div>

                      {/* Card Action footer */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                        <span className="text-[11px] text-muted-foreground">
                          {evals.length} {evals.length === 1 ? "evaluación" : "evaluaciones"}
                        </span>

                        <Button
                          size="sm"
                          variant={canEdit ? "default" : "outline"}
                          onClick={() => openEvalDialog(member)}
                          className="h-8 text-xs font-semibold rounded-xl gap-1.5 px-3"
                        >
                          {canEdit ? (
                            <>
                              <Pencil className="w-3.5 h-3.5" /> Evaluar
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3.5 h-3.5" /> Ver Desempeño
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                        <th className="text-left py-3 px-4 font-semibold">Integrante</th>
                        <th className="text-center py-3 px-2 font-semibold">Cargo</th>
                        {categories.map((c) => (
                          <th key={c.key} className="text-center py-3 px-1.5 font-semibold">
                            {c.short}
                          </th>
                        ))}
                        <th className="text-right py-3 pr-4 font-bold text-foreground">Total</th>
                        <th className="text-center py-3 px-2 font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => {
                        const evals = getMemberEvals(member.user_id);
                        const totals: Record<string, number> = {};
                        categories.forEach((c) => {
                          totals[c.key] = evals.reduce((s, e) => s + ((e as any)[c.key] ?? 0), 0);
                        });
                        const total = getMemberTotal(member.user_id);
                        const name = member.profile
                          ? `${member.profile.first_name} ${member.profile.first_last_name}`
                          : "—";

                        return (
                          <tr
                            key={member.user_id}
                            className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <AuroraAvatar
                                  size={28}
                                  initials={member.profile?.first_name?.[0] || "C"}
                                  imageUrl={member.profile?.avatar_url}
                                />
                                <span className="truncate">{name}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  member.position === "capitan"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : member.position === "secretario"
                                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {getRoleLabel(member.position)}
                              </span>
                            </td>
                            {categories.map((c) => (
                              <td
                                key={c.key}
                                className="text-center py-3 px-1.5 font-mono text-muted-foreground"
                              >
                                {totals[c.key] || 0}
                              </td>
                            ))}
                            <td className="text-right py-3 pr-4 font-black text-primary font-mono text-sm tabular-nums">
                              {total}
                            </td>
                            <td className="text-center py-3 px-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEvalDialog(member)}
                                className="h-7 px-2 text-xs"
                              >
                                {canEdit ? "Evaluar" : "Ver"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RECENT SESSION SUMMARY (LAST RECORDED DAY) */}
            {latestDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">Resumen de la Última Sesión</h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                    {latestDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Presentes
                    </p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {presentes.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                      Ausentes
                    </p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                      {ausentes.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                      Cuota del Día
                    </p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                      L. {totalCuota}
                    </p>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-primary">
                      Observaciones
                    </p>
                    <p className="text-2xl font-black text-primary font-mono mt-0.5">
                      {conExcusa.length}
                    </p>
                  </div>
                </div>

                {/* Notes & Absences Details */}
                {conExcusa.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Notas y Observaciones
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {conExcusa.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-xl p-3 bg-muted/40 border border-border/40 text-xs"
                        >
                          <p className="font-bold text-foreground">{memberName(e.user_id)}</p>
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{e.excusa}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 2: ALL CLUB UNITS DIRECTORY */}
        {activeMainTab === "all_units" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Unidades del Club</h3>
                <p className="text-xs text-muted-foreground">
                  Explora las unidades oficiales, sus líderes y su puntuación general.
                </p>
              </div>
              {isClubLeadership && (
                <Button
                  size="sm"
                  onClick={() => setActiveMainTab("admin")}
                  className="gap-1.5 text-xs rounded-xl"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Administrar
                </Button>
              )}
            </div>

            {allUnits.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
                <Layers className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No hay unidades registradas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  El personal directivo puede registrar las unidades en la pestaña Administración.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allUnits.map((u) => {
                  const isCurrent = unitId === u.id;
                  return (
                    <motion.div
                      key={u.id}
                      whileHover={{ y: -2 }}
                      className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? "bg-card border-primary ring-1 ring-primary/20 shadow-md"
                          : "bg-card border-border/60 hover:border-border shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted/60 border border-border/80 flex items-center justify-center shrink-0">
                            {u.logo_url ? (
                              <img
                                src={u.logo_url}
                                alt={u.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-7 h-7 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-base text-foreground">{u.name}</h4>
                              {isCurrent && (
                                <span className="text-[10px] bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full">
                                  Activa
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Unidad oficial del club
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
                        <Button
                          size="sm"
                          variant={isCurrent ? "secondary" : "default"}
                          onClick={() => {
                            setUnitId(u.id);
                            setActiveMainTab("members");
                          }}
                          className="w-full text-xs font-semibold rounded-xl gap-1.5"
                        >
                          {isCurrent ? "Ver Integrantes Activos" : "Visualizar esta Unidad"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN & ASSIGNMENT PANEL */}
        {activeMainTab === "admin" && isClubLeadership && (
          <div className="space-y-4">
            <UnitAdminPanel
              activeUnitId={unitId}
              onSelectUnit={(selectedId) => {
                setUnitId(selectedId);
                setActiveMainTab("members");
              }}
              onChanged={() => setUnitRefreshKey((k) => k + 1)}
            />
          </div>
        )}
      </div>

      {/* EVALUATION & HISTORY MODAL */}
      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 rounded-3xl overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AuroraAvatar
                  size={36}
                  initials={selectedMember?.profile?.first_name?.[0] || "C"}
                  imageUrl={selectedMember?.profile?.avatar_url}
                  color="var(--aurora-violet)"
                />
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {selectedMember?.profile
                      ? `${selectedMember.profile.first_name} ${selectedMember.profile.first_last_name}`
                      : "Evaluación del Conquistador"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Cargo: {getRoleLabel(selectedMember?.position || "miembro")} · Total acumulado:{" "}
                    <span className="font-bold text-primary font-mono">
                      {selectedMember ? getMemberTotal(selectedMember.user_id) : 0} pts
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-tabs in modal */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setEvalModalTab("evaluate")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  evalModalTab === "evaluate"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pencil className="w-3 h-3" />
                {editingEvalId ? "Editar Registro" : "Nueva Evaluación"}
              </button>
              <button
                type="button"
                onClick={() => setEvalModalTab("history")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  evalModalTab === "history"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="w-3 h-3" />
                Historial ({selectedMember ? getMemberEvals(selectedMember.user_id).length : 0})
              </button>
            </div>
          </DialogHeader>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {evalModalTab === "evaluate" ? (
              canEdit ? (
                <div className="space-y-4">
                  {/* Date selection with "Hoy" shortcut */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs font-semibold">Fecha de Evaluación</Label>
                      <Input
                        type="date"
                        value={evalDate}
                        onChange={(e) => setEvalDate(e.target.value)}
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEvalDate(new Date().toISOString().split("T")[0])}
                      className="mt-5 h-9 text-xs rounded-xl"
                    >
                      Hoy
                    </Button>
                  </div>

                  {/* Category Toggle Cards */}
                  <div>
                    <Label className="text-xs font-semibold">Criterios de Calificación</Label>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Toca cada categoría para alternar su cumplimiento:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.map((c) => {
                        const on = formData[c.key] > 0;
                        return (
                          <button
                            type="button"
                            key={c.key}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                [c.key]: on ? 0 : c.max,
                              }))
                            }
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                              on
                                ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/20"
                                : "bg-card border-border/60 text-muted-foreground hover:border-border"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                                  on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}
                              >
                                {on ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              </span>
                              <span className="text-xs font-semibold truncate">{c.label}</span>
                            </div>
                            <span
                              className={cn(
                                "text-xs font-bold font-mono ml-2 shrink-0",
                                on ? "text-primary" : "text-muted-foreground"
                              )}
                            >
                              +{c.max} pts
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes / Excusa */}
                  <div>
                    <Label className="text-xs font-semibold">Observaciones o Notas (Opcional)</Label>
                    <Textarea
                      value={excusa}
                      onChange={(e) => setExcusa(e.target.value)}
                      placeholder="Motivo de tardanza, permiso especial o notas de mérito..."
                      rows={2}
                      className="mt-1 text-xs rounded-xl"
                    />
                  </div>

                  {/* Running Total Indicator */}
                  <div className="flex items-center justify-between bg-muted/40 border border-border/60 rounded-xl px-4 py-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Puntaje de esta sesión
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Math.round((currentFormTotal / MAX_TOTAL) * 100)}% del máximo posible
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary font-mono tabular-nums">
                        {currentFormTotal}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {MAX_TOTAL} pts</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm font-semibold text-foreground">Modo solo lectura</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Solo los líderes de la unidad (Capitán o Secretario) o el personal directivo pueden registrar evaluaciones.
                  </p>
                </div>
              )
            ) : (
              /* HISTORY VIEW */
              <div className="space-y-3">
                {selectedMember && getMemberEvals(selectedMember.user_id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No hay evaluaciones registradas aún para este integrante.</p>
                  </div>
                ) : (
                  selectedMember &&
                  getMemberEvals(selectedMember.user_id).map((ev) => {
                    const realTotal =
                      (ev.asistencia ?? 0) +
                      (ev.puntualidad ?? 0) +
                      (ev.uniforme ?? 0) +
                      (ev.tareas ?? 0) +
                      ((ev as any).part_devocional ?? 0) +
                      ((ev as any).asistencia_ja ?? 0) +
                      (ev.cuota ?? 0);

                    return (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {ev.evaluation_date}
                            </span>
                            <span className="text-xs font-black text-primary font-mono">
                              +{realTotal} pts
                            </span>
                          </div>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditEval(ev)}
                              className="h-7 text-xs px-2 gap-1"
                            >
                              <Pencil className="w-3 h-3" /> Editar
                            </Button>
                          )}
                        </div>

                        {/* Breakdown pills */}
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md font-mono",
                              ev.asistencia > 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            )}
                          >
                            Asis: {ev.asistencia}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md font-mono",
                              ev.uniforme > 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            )}
                          >
                            Unif: {ev.uniforme}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md font-mono",
                              ev.tareas > 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            )}
                          >
                            Tare: {ev.tareas}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md font-mono",
                              ev.cuota > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
                            )}
                          >
                            Cuot: {ev.cuota}
                          </span>
                        </div>

                        {ev.excusa && (
                          <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-lg">
                            "{ev.excusa}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <DialogFooter className="px-6 py-3 border-t border-border/50 shrink-0 bg-muted/20 flex flex-row items-center justify-between gap-2">
            {evalModalTab === "evaluate" && canEdit && editingEvalId ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
                className="gap-1.5 text-xs h-9 rounded-xl"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMember(null)}
                className="text-xs h-9 rounded-xl"
              >
                Cerrar
              </Button>

              {evalModalTab === "evaluate" && canEdit && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1.5 text-xs h-9 rounded-xl font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Guardando…" : editingEvalId ? "Actualizar" : "Guardar Evaluación"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiUnidad;

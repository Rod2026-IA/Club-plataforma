import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ScanLine, Calendar as CalendarIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Unit { id: string; name: string }
interface EvalRow {
  id: string;
  unit_id: string;
  user_id: string;
  evaluation_date: string;
  asistencia: number;
  puntualidad: number;
  cuota: number;
  part_devocional: number;
  asistencia_ja: number;
  tareas: number;
  uniforme: number;
  total_score: number;
  excusa?: string;
}
interface Profile { user_id: string; first_name: string; first_last_name: string }
interface Membership { user_id: string; unit_id: string; position: string }

const criteria = [
  { key: "asistencia", label: "Asistencia", short: "Asis", max: 25 },
  { key: "puntualidad", label: "Puntualidad", short: "Punt", max: 20 },
  { key: "uniforme", label: "Uniforme", short: "Unif", max: 20 },
  { key: "part_devocional", label: "Part. Devocional", short: "Devo", max: 20 },
  { key: "asistencia_ja", label: "Asistencia JA", short: "JA", max: 25 },
  { key: "tareas", label: "Tareas", short: "Tare", max: 20 },
  { key: "cuota", label: "Cuota", short: "Cuot", max: 20 },
] as const;

const positionLabel = (p: string) =>
  p === "capitan" ? "Capitán" : p === "secretario" ? "Secretario" : "Integrante";

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  const txt = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const currentYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const UnitReports = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYM());

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    const load = async () => {
      const [{ data: u }, { data: e }, { data: p }, { data: m }] = await Promise.all([
        supabase.from("units").select("id, name").order("name"),
        supabase
          .from("evaluations")
          .select("id, unit_id, user_id, evaluation_date, asistencia, puntualidad, cuota, part_devocional, asistencia_ja, tareas, uniforme, total_score, excusa")
          .order("evaluation_date", { ascending: false })
          .limit(5000),
        supabase.from("profiles").select("user_id, first_name, first_last_name"),
        supabase.from("unit_members").select("user_id, unit_id, position"),
      ]);
      setUnits((u as Unit[]) ?? []);
      setEvals((e as EvalRow[]) ?? []);
      setProfiles((p as Profile[]) ?? []);
      setMemberships((m as Membership[]) ?? []);
    };
    load();
  }, []);

  // Available months across all evals (descending), always include current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYM());
    evals.forEach((e) => set.add(e.evaluation_date.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [evals]);

  // Restrict to the selected month for all aggregates / detail views.
  const monthEvals = useMemo(
    () => evals.filter((e) => e.evaluation_date.startsWith(selectedMonth)),
    [evals, selectedMonth]
  );

  const rows = useMemo(() => {
    return units.map((u) => {
      const unitEvals = monthEvals.filter((x) => x.unit_id === u.id);
      // Use the latest registration date in the selected month as "día más reciente"
      const latestDate = unitEvals.length
        ? unitEvals.map((x) => x.evaluation_date).sort().slice(-1)[0]
        : null;
      const todays = latestDate ? unitEvals.filter((x) => x.evaluation_date === latestDate) : [];
      const dailyTotal = todays.reduce((s, x) => s + (x.total_score ?? 0), 0);
      const monthlyTotal = unitEvals.reduce((s, x) => s + (x.total_score ?? 0), 0);
      const membersToday = new Set(todays.map((x) => x.user_id)).size;
      return { id: u.id, name: u.name, membersToday, dailyTotal, monthlyTotal, latestDate };
    });
  }, [units, monthEvals]);

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => { m[p.user_id] = p; });
    return m;
  }, [profiles]);

  const renderUnitMembers = (unitId: string) => {
    const unitMembers = memberships.filter((m) => m.unit_id === unitId);
    const unitEvals = monthEvals.filter((e) => e.unit_id === unitId);

    if (unitMembers.length === 0) {
      return (
        <div className="px-6 py-6 text-sm text-muted-foreground text-center">
          Esta unidad aún no tiene miembros asignados.
        </div>
      );
    }

    const monthPrefix = selectedMonth;
    const unitMonthEvals = unitEvals; // already month-filtered

    const memberRows = unitMembers.map((m) => {
      const memberEvals = unitMonthEvals.filter((e) => e.user_id === m.user_id);
      const totals: Record<string, number> = {};
      criteria.forEach((c) => {
        totals[c.key] = memberEvals.reduce((s, e) => s + ((e as any)[c.key] ?? 0), 0);
      });
      const total = memberEvals.reduce((s, e) => s + (e.total_score ?? 0), 0);
      const profile = profileMap[m.user_id];
      const name = profile ? `${profile.first_name} ${profile.first_last_name}` : "—";
      return { user_id: m.user_id, name, position: m.position, totals, total, evals: memberEvals };
    });

    // Daily summary for the latest registration date of this unit within the selected month
    const latestDate = unitEvals.length
      ? unitEvals.map((e) => e.evaluation_date).sort().slice(-1)[0]
      : null;
    const todayEvals = latestDate ? unitEvals.filter((e) => e.evaluation_date === latestDate) : [];
    const presentes = todayEvals.filter((e) => (e.asistencia ?? 0) > 0);
    // Solo se considera ausente si existe evaluación registrada con asistencia = 0
    const ausentesEvals = todayEvals.filter((e) => (e.asistencia ?? 0) === 0);
    const conObs = todayEvals.filter((e) => (e.excusa ?? "").trim().length > 0);
    const totalCuota = todayEvals.filter((e) => (e.cuota ?? 0) > 0).length * 10;
    const nameOf = (uid: string) => {
      const p = profileMap[uid];
      return p ? `${p.first_name} ${p.first_last_name}` : "—";
    };

    return (
      <div className="bg-muted/10 px-4 py-4">
        <Tabs defaultValue="day" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="day">Último día del mes</TabsTrigger>
            <TabsTrigger value="month">Reporte del mes</TabsTrigger>
          </TabsList>
          <TabsContent value="day">
        {latestDate ? (
          <div className="mb-4 rounded-xl border border-border/50 bg-background/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Resumen del día más reciente</h4>
              <span className="text-xs text-muted-foreground">{latestDate}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Presentes</p>
                <p className="text-lg font-bold text-accent">{presentes.length}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Ausentes</p>
                <p className="text-lg font-bold text-destructive">{ausentesEvals.length}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Cuota (Lps)</p>
                <p className="text-lg font-bold text-primary">L. {totalCuota}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Con observación</p>
                <p className="text-lg font-bold text-secondary">{conObs.length}</p>
              </div>
            </div>
            {conObs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Observaciones</p>
                {conObs.map((e) => (
                  <div key={e.id} className="rounded-md border border-border/40 bg-muted/20 p-2">
                    <p className="text-xs font-semibold text-foreground">{nameOf(e.user_id)}</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{e.excusa}</p>
                  </div>
                ))}
              </div>
            )}
            {ausentesEvals.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ausentes</p>
                <div className="flex flex-wrap gap-1.5">
                  {ausentesEvals.map((e) => (
                    <span key={e.id} className="text-[11px] px-2 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/30">
                      {nameOf(e.user_id)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Sin evaluaciones registradas en este mes.</p>
        )}
        {latestDate && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Cargo</TableHead>
              {criteria.map((c) => (
                <TableHead key={c.key} className="text-center" title={c.label}>{c.short}</TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unitMembers.map((m) => {
              const ev = todayEvals.find((e) => e.user_id === m.user_id);
              const profile = profileMap[m.user_id];
              const name = profile ? `${profile.first_name} ${profile.first_last_name}` : "—";
              return (
                <TableRow key={m.user_id}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{positionLabel(m.position)}</TableCell>
                  {criteria.map((c) => (
                    <TableCell key={c.key} className="text-center">{ev ? ((ev as any)[c.key] ?? 0) : "—"}</TableCell>
                  ))}
                  <TableCell className="text-right font-bold neon-text-cyan">{ev ? (ev.total_score ?? 0) : "—"}</TableCell>
                  <TableCell className="text-right">
                    {m.position !== "director" && m.position !== "subdirector" && (
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link to={`/scan/${m.user_id}`}>
                          <ScanLine className="w-3.5 h-3.5 mr-1" /> Evaluar
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
          </TabsContent>
          <TabsContent value="month">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Reporte del mes</h4>
              <span className="text-xs text-muted-foreground">{monthLabel(monthPrefix)}</span>
            </div>
            {unitMonthEvals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin evaluaciones este mes.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Fecha</TableHead>
                    {criteria.map((c) => (
                      <TableHead key={c.key} className="text-center" title={c.label}>{c.short}</TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberRows
                    .filter((r) => r.evals.length > 0)
                    .flatMap((r) =>
                      [...r.evals]
                        .sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date))
                        .map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{e.evaluation_date}</TableCell>
                            {criteria.map((c) => (
                              <TableCell key={c.key} className="text-center">{(e as any)[c.key] ?? 0}</TableCell>
                            ))}
                            <TableCell className="text-right font-bold neon-text-cyan">{e.total_score ?? 0}</TableCell>
                          </TableRow>
                        ))
                    )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Total unidad (mes)</TableCell>
                    {criteria.map((c) => (
                      <TableCell key={c.key} className="text-center font-semibold">
                        {memberRows.reduce((s, r) => s + r.totals[c.key], 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-lg font-bold neon-text-cyan">
                      {memberRows.reduce((s, r) => s + r.total, 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Reportes por Unidad" subtitle="Toca una unidad para ver el detalle de miembros" />
      <div className="container px-4 py-5 pb-28 space-y-4">
        {/* Month picker */}
        <div className="aurora-card p-4 flex items-center gap-3 flex-wrap">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg, var(--aurora-violet), var(--aurora-cyan))" }}
          >
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] aurora-mono" style={{ color: "var(--aurora-text-mute)" }}>
              Mes del informe
            </p>
            <p className="aurora-grotesk font-semibold" style={{ color: "var(--aurora-text)" }}>
              {monthLabel(selectedMonth)}
            </p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona mes" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {availableMonths.map((ym) => (
                <SelectItem key={ym} value={ym}>
                  {monthLabel(ym)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="aurora-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-center">Últ. registros</TableHead>
                <TableHead className="text-right">Total día más reciente</TableHead>
                <TableHead className="text-right">Total del mes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay unidades registradas.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const isOpen = openUnit === r.id;
                  return (
                    <>
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setOpenUnit(isOpen ? null : r.id)}
                      >
                        <TableCell>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform",
                              isOpen && "rotate-180 text-primary"
                            )}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-center">{r.membersToday}</TableCell>
                        <TableCell className="text-right font-semibold">{r.dailyTotal}</TableCell>
                        <TableCell className="text-right font-bold neon-text-cyan">{r.monthlyTotal}</TableCell>
                      </TableRow>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <TableRow key={`${r.id}-detail`}>
                            <TableCell colSpan={5} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: "hidden" }}
                              >
                                {renderUnitMembers(r.id)}
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default UnitReports;

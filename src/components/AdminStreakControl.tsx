import { useEffect, useMemo, useState } from "react";
import { Loader2, Flame, Heart, AlertTriangle, Pencil, RefreshCw, CalendarDays, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminStreakRow {
  conversation_id: string;
  user1_id: string;
  user2_id: string;
  user1_name: string;
  user2_name: string;
  user1_avatar: string | null;
  user2_avatar: string | null;
  streak_count: number;
  lives: number;
  last_interaction_date: string | null;
  start_date: string | null;
  week_report: string;
  week_has_issue: boolean;
}

interface ActivityRow {
  day: string;
  user_id: string;
  first_at: string;
  last_at: string;
  message_count: number;
}

const AdminStreakControl = () => {
  const [rows, setRows] = useState<AdminStreakRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<AdminStreakRow | null>(null);
  const [streak, setStreak] = useState("");
  const [lives, setLives] = useState("");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<AdminStreakRow | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [month, setMonth] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const broadcastRefresh = async () => {
    setBroadcasting(true);
    try {
      const ch = supabase.channel("streak-admin-broadcast");
      await new Promise<void>((resolve) => {
        ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
      });
      await ch.send({ type: "broadcast", event: "refresh", payload: { at: Date.now() } });
      await supabase.removeChannel(ch);
      toast.success("Cambios enviados a los usuarios");
    } catch (e) {
      toast.error("No se pudo notificar");
    } finally {
      setBroadcasting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_all_streaks");
    if (error) toast.error(error.message);
    setRows(((data || []) as unknown) as AdminStreakRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (r: AdminStreakRow) => {
    setEdit(r);
    setStreak(String(r.streak_count));
    setLives(String(r.lives));
    setStartDate(r.start_date || "");
  };

  const save = async () => {
    if (!edit) return;
    const s = parseInt(streak, 10);
    const l = parseInt(lives, 10);
    if (Number.isNaN(s) || s < 0) return toast.error("Días inválidos");
    if (Number.isNaN(l) || l < 0 || l > 5) return toast.error("Corazones 0-5");
    setSaving(true);
    const { error } = await supabase.rpc("admin_adjust_streak", {
      _conversation_id: edit.conversation_id,
      _streak_count: s,
      _lives: l,
      _start_date: startDate || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Racha actualizada");
    setEdit(null);
    load();
    broadcastRefresh();
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.user1_name.toLowerCase().includes(q) || r.user2_name.toLowerCase().includes(q);
  });

  const openDetail = async (r: AdminStreakRow) => {
    setDetail(r);
    setSelectedDay(null);
    const start = r.start_date ? new Date(`${r.start_date}T12:00:00Z`) : new Date();
    setMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setActivityLoading(true);
    const { data, error } = await supabase.rpc("admin_get_streak_activity", { _conversation_id: r.conversation_id });
    setActivityLoading(false);
    if (error) { toast.error(error.message); return; }
    setActivity(((data || []) as unknown) as ActivityRow[]);
  };

  const activityByDay = useMemo(() => {
    const m = new Map<string, ActivityRow[]>();
    for (const a of activity) {
      const arr = m.get(a.day) || [];
      arr.push(a);
      m.set(a.day, arr);
    }
    return m;
  }, [activity]);

  const calendarDays = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date, day: d });
    }
    return cells;
  }, [month]);

  const dayReport = useMemo(() => {
    if (!selectedDay || !detail) return null;
    const rows = activityByDay.get(selectedDay) || [];
    const u1Row = rows.find((r) => r.user_id === detail.user1_id);
    const u2Row = rows.find((r) => r.user_id === detail.user2_id);
    const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!u1Row && !u2Row) {
      return { ok: false, text: "Ningún usuario envió mensajes este día. Se habría usado un corazón para mantener la racha." };
    }
    if (u1Row && u2Row) {
      return {
        ok: true,
        text: `Ambos enviaron mensajes este día. ${detail.user1_name} activó la racha a las ${fmt(u1Row.first_at)} (${u1Row.message_count} msg). ${detail.user2_name} a las ${fmt(u2Row.first_at)} (${u2Row.message_count} msg).`,
      };
    }
    const only = u1Row || u2Row!;
    const name = u1Row ? detail.user1_name : detail.user2_name;
    const other = u1Row ? detail.user2_name : detail.user1_name;
    return {
      ok: false,
      text: `Solo ${name} escribió este día a las ${fmt(only.first_at)} (${only.message_count} msg). ${other} no respondió.`,
    };
  }, [selectedDay, activityByDay, detail]);

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="font-bold flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Control de Rachas</h2>
          <p className="text-xs text-muted-foreground">Edita días y corazones de cada pareja. Informe semanal se reinicia cada lunes.</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar pareja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-40"
          />
          <Button size="sm" variant="default" onClick={broadcastRefresh} disabled={broadcasting} title="Notificar a usuarios">
            <Radio className={`w-3.5 h-3.5 ${broadcasting ? "animate-pulse" : ""}`} />
            <span className="ml-1 text-xs">Actualizar</span>
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Sin rachas</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filtered.map((r) => (
            <div key={r.conversation_id} className="rounded-lg border bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold break-words">
                    {r.user1_name} ↔ {r.user2_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inicio: {r.start_date ? new Date(`${r.start_date}T12:00:00Z`).toLocaleDateString() : "—"}
                    {r.last_interaction_date && (
                      <> · Último: {new Date(`${r.last_interaction_date}T12:00:00Z`).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500">
                    <Flame className="w-3.5 h-3.5" /> {r.streak_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                    <Heart className="w-3.5 h-3.5 fill-red-500" /> {r.lives}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => openDetail(r)} title="Ver actividad">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openDetail(r)}
                className={`text-xs rounded-md p-2 flex gap-2 items-start ${
                  r.week_has_issue ? "bg-destructive/15 text-red-700 dark:text-red-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                } w-full text-left hover:opacity-90`}
              >
                {r.week_has_issue && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <span>{r.week_report}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Actividad de la racha</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-semibold">{detail.user1_name} ↔ {detail.user2_name}</p>
                <p className="text-xs text-muted-foreground">
                  Inicio: {detail.start_date ? new Date(`${detail.start_date}T12:00:00Z`).toLocaleDateString() : "—"} · Racha actual: {detail.streak_count} día(s)
                </p>
              </div>

              <div className="rounded-lg border p-2">
                <div className="flex items-center justify-between mb-2">
                  <Button size="sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <p className="text-sm font-semibold capitalize">
                    {month.toLocaleDateString("es", { month: "long", year: "numeric" })}
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
                  {["L","M","X","J","V","S","D"].map((d) => <div key={d}>{d}</div>)}
                </div>
                {activityLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((c, i) => {
                      if (!c.date) return <div key={i} />;
                      const rows = activityByDay.get(c.date) || [];
                      const hasU1 = !!rows.find((r) => r.user_id === detail.user1_id);
                      const hasU2 = !!rows.find((r) => r.user_id === detail.user2_id);
                      const both = hasU1 && hasU2;
                      const some = hasU1 || hasU2;
                      const isSel = selectedDay === c.date;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDay(c.date)}
                          className={`aspect-square rounded-md text-xs font-medium border transition-colors flex flex-col items-center justify-center ${
                            isSel ? "ring-2 ring-primary" : ""
                          } ${
                            both
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                              : some
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300"
                              : "bg-muted/30 border-transparent text-muted-foreground"
                          }`}
                        >
                          <span>{c.day}</span>
                          {some && (
                            <span className="flex gap-0.5 mt-0.5">
                              {hasU1 && <span className="w-1 h-1 rounded-full bg-current" />}
                              {hasU2 && <span className="w-1 h-1 rounded-full bg-current opacity-60" />}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedDay && (
                <div className="rounded-md border p-3 space-y-2 bg-card/60">
                  <p className="text-sm font-semibold">
                    {new Date(`${selectedDay}T12:00:00Z`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className={`text-xs p-2 rounded ${dayReport?.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/15 text-red-700 dark:text-red-300"}`}>
                    {dayReport?.text}
                  </div>
                  <div className="space-y-1">
                    {(activityByDay.get(selectedDay) || []).map((a) => (
                      <div key={a.user_id} className="text-xs flex justify-between border rounded p-2">
                        <span className="font-medium">
                          {a.user_id === detail.user1_id ? detail.user1_name : detail.user2_name}
                        </span>
                        <span className="text-muted-foreground">
                          Activó a las {new Date(a.first_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · último {new Date(a.last_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.message_count} msg
                        </span>
                      </div>
                    ))}
                    {(activityByDay.get(selectedDay) || []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Sin mensajes este día</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" /> Ambos</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40" /> Solo uno</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Sin actividad</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar racha</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{edit.user1_name} ↔ {edit.user2_name}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Días de racha</Label>
                <Input type="number" min={0} value={streak} onChange={(e) => setStreak(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Corazones (0-5)</Label>
                <Input type="number" min={0} max={5} value={lives} onChange={(e) => setLives(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminStreakControl;
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  UserPlus,
  Crown,
  FileText,
  Users as UsersIcon,
  Upload,
  Image as ImageIcon,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AuroraAvatar from "@/components/aurora/AuroraAvatar";

type Position = "capitan" | "secretario" | "miembro";
type AppRole = "super_admin" | "director" | "subdirector" | "integrante";

export interface Unit {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface Profile {
  user_id: string;
  first_name: string;
  first_last_name: string;
  email: string;
  avatar_url?: string | null;
}

interface MemberAssignment {
  id: string;
  user_id: string;
  unit_id: string;
  position: Position;
}

const positionLabel = (p: Position) =>
  p === "capitan" ? "Capitán" : p === "secretario" ? "Secretario" : "Integrante";

const roleLabel = (r: AppRole) =>
  r === "super_admin"
    ? "Super Admin"
    : r === "director"
    ? "Director"
    : r === "subdirector"
    ? "Sub-Director"
    : "Integrante";

interface Props {
  onChanged?: () => void;
  onSelectUnit?: (unitId: string) => void;
  activeUnitId?: string | null;
}

const UnitAdminPanel = ({ onChanged, onSelectUnit, activeUnitId }: Props) => {
  const { role } = useAuth();
  const allowed = role === "super_admin" || role === "director" || role === "subdirector";

  const [activeTab, setActiveTab] = useState<"units" | "assignments">("units");
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitMemberCounts, setUnitMemberCounts] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [loadingData, setLoadingData] = useState(true);

  // Pagination + search
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState<string>("all");

  const [newUnitModalOpen, setNewUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUnitLogoFile, setNewUnitLogoFile] = useState<File | null>(null);
  const [uploadingLogoFor, setUploadingLogoFor] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignUnitId, setAssignUnitId] = useState<string>("");
  const [assignPosition, setAssignPosition] = useState<Position>("miembro");
  const [assignAppRole, setAssignAppRole] = useState<AppRole>("integrante");
  const [savingAssign, setSavingAssign] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load units & counts
  const loadUnits = async () => {
    const [{ data: u }, { data: mems }] = await Promise.all([
      supabase.from("units").select("id, name, logo_url").order("name"),
      supabase.from("unit_members").select("unit_id"),
    ]);

    const unitList = (u as Unit[]) ?? [];
    setUnits(unitList);

    const counts: Record<string, number> = {};
    (mems ?? []).forEach((m: any) => {
      counts[m.unit_id] = (counts[m.unit_id] || 0) + 1;
    });
    setUnitMemberCounts(counts);
  };

  // Load profiles page
  const loadProfilesPage = async () => {
    setLoadingData(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("profiles")
        .select("user_id, first_name, first_last_name, email, avatar_url", { count: "exact" })
        .order("first_name", { ascending: true })
        .range(from, to);

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `first_name.ilike.${term},first_last_name.ilike.${term},email.ilike.${term}`
        );
      }

      const { data: p, count } = await query;
      const pageProfiles = (p as Profile[]) ?? [];
      setProfiles(pageProfiles);
      setTotalCount(count ?? 0);

      const ids = pageProfiles.map((x) => x.user_id);
      if (ids.length === 0) {
        setAssignments([]);
        setRoles({});
      } else {
        const [{ data: a }, { data: r }] = await Promise.all([
          supabase
            .from("unit_members")
            .select("id, user_id, unit_id, position")
            .in("user_id", ids),
          supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        ]);
        setAssignments((a as MemberAssignment[]) ?? []);
        const rmap: Record<string, AppRole> = {};
        (r ?? []).forEach((x: any) => {
          rmap[x.user_id] = x.role;
        });
        setRoles(rmap);
      }
    } finally {
      setLoadingData(false);
    }
  };

  const load = async () => {
    await Promise.all([loadUnits(), loadProfilesPage()]);
  };

  useEffect(() => {
    if (allowed) loadUnits();
  }, [allowed]);

  useEffect(() => {
    if (allowed) loadProfilesPage();
  }, [allowed, page, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeLabel = useMemo(() => {
    if (totalCount === 0) return "0";
    const from = page * PAGE_SIZE + 1;
    const to = Math.min(totalCount, from + profiles.length - 1);
    return `${from}–${to} de ${totalCount}`;
  }, [page, profiles.length, totalCount]);

  if (!allowed) return null;

  const createUnit = async () => {
    if (!newUnitName.trim()) return;
    setCreating(true);
    try {
      const { data: created, error } = await supabase
        .from("units")
        .insert({ name: newUnitName.trim() })
        .select("id")
        .single();
      if (error) throw error;
      if (newUnitLogoFile && created?.id) {
        await uploadLogoFor(created.id, newUnitLogoFile);
      }
      setNewUnitName("");
      setNewUnitLogoFile(null);
      setNewUnitModalOpen(false);
      toast({ title: "Unidad creada con éxito" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Error al crear unidad", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const uploadLogoFor = async (targetUnitId: string, file: File) => {
    setUploadingLogoFor(targetUnitId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${targetUnitId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("unit-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("unit-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("units")
        .update({ logo_url: publicUrl })
        .eq("id", targetUnitId);
      if (updErr) throw updErr;
      toast({ title: "Emblema actualizado" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Error de imagen", description: e.message, variant: "destructive" });
    } finally {
      setUploadingLogoFor(null);
    }
  };

  const deleteUnit = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la unidad "${name}"? Se quitarán los miembros asociados.`)) return;
    await supabase.from("unit_members").delete().eq("unit_id", id);
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unidad eliminada" });
    await load();
    onChanged?.();
  };

  const openAssignFor = (userId: string) => {
    setAssignUserId(userId);
    const current = assignments.find((a) => a.user_id === userId);
    setAssignUnitId(current?.unit_id ?? units[0]?.id ?? "");
    setAssignPosition(current?.position ?? "miembro");
    setAssignAppRole(roles[userId] ?? "integrante");
    setAssignOpen(true);
  };

  const saveAssignment = async () => {
    if (!assignUserId || !assignUnitId) return;
    setSavingAssign(true);
    try {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", assignUserId)
        .maybeSingle();
      if (existingRole) {
        await supabase.from("user_roles").update({ role: assignAppRole }).eq("user_id", assignUserId);
      } else {
        await supabase.from("user_roles").insert({ user_id: assignUserId, role: assignAppRole });
      }

      const existing = assignments.find((a) => a.user_id === assignUserId);
      if (existing) {
        const { error } = await supabase
          .from("unit_members")
          .update({ unit_id: assignUnitId, position: assignPosition })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("unit_members")
          .insert({ user_id: assignUserId, unit_id: assignUnitId, position: assignPosition });
        if (error) throw error;
      }

      toast({ title: "Asignación guardada" });
      setAssignOpen(false);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAssign(false);
    }
  };

  const removeAssignment = async (userId: string) => {
    if (!confirm("¿Quitar a este miembro de su unidad?")) return;
    const existing = assignments.find((a) => a.user_id === userId);
    if (!existing) return;
    const { error } = await supabase.from("unit_members").delete().eq("id", existing.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Miembro desvinculado" });
    await load();
    onChanged?.();
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-pin", {
      body: { targetUserId: deleteTarget.user_id, action: "delete" },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Error", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario eliminado" });
    setDeleteTarget(null);
    await load();
    onChanged?.();
  };

  const unitName = (id: string) => units.find((u) => u.id === id)?.name ?? "—";

  const filteredProfiles = profiles.filter((p) => {
    if (filterUnit === "all") return true;
    const a = assignments.find((x) => x.user_id === p.user_id);
    if (filterUnit === "unassigned") return !a;
    return a?.unit_id === filterUnit;
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5 shadow-sm">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Panel de Gestión y Grupos</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organiza las unidades, emblemas, miembros asignados y cargos directivos.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/40 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("units")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "units"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Unidades ({units.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "assignments"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UsersIcon className="w-3.5 h-3.5" /> Asignaciones
          </button>
        </div>
      </div>

      {/* TAB 1: UNITS & GROUPS */}
      {activeTab === "units" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Unidades Activas en el Club
              </p>
              <p className="text-xs text-muted-foreground">
                Haz clic en una unidad para seleccionarla como tu vista activa o gestiona su emblema.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setNewUnitModalOpen(true)}
              className="gap-1.5 rounded-xl text-xs h-9"
            >
              <Plus className="w-4 h-4" /> Nueva Unidad
            </Button>
          </div>

          {units.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-foreground">Aún no hay unidades creadas</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Crea la primera unidad (por ejemplo: Águilas, Leones, Osos) para empezar a asignar a los conquistadores.
              </p>
              <Button
                size="sm"
                onClick={() => setNewUnitModalOpen(true)}
                className="mt-4 gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" /> Crear Unidad
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {units.map((u) => {
                const count = unitMemberCounts[u.id] || 0;
                const isSelected = activeUnitId === u.id;
                return (
                  <motion.div
                    key={u.id}
                    whileHover={{ y: -2 }}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                        : "bg-card border-border/60 hover:border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/60 border border-border/80 flex items-center justify-center shrink-0 relative group">
                        {u.logo_url ? (
                          <img src={u.logo_url} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <UsersIcon className="w-6 h-6 text-primary" />
                        )}
                        {/* Overlay to upload logo */}
                        <label
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                          title="Cambiar emblema"
                        >
                          <Upload className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadLogoFor(u.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-foreground text-sm truncate">{u.name}</h4>
                          {isSelected && (
                            <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              Activa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {count} {count === 1 ? "integrante" : "integrantes"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/40">
                      {onSelectUnit ? (
                        <Button
                          size="sm"
                          variant={isSelected ? "secondary" : "outline"}
                          className="text-xs h-7 px-2.5 font-medium"
                          onClick={() => onSelectUnit(u.id)}
                        >
                          {isSelected ? "Visualizando" : "Ver en Mi Unidad"}
                        </Button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1">
                        <label
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Subir o cambiar logo"
                        >
                          {uploadingLogoFor === u.id ? (
                            <span className="w-3.5 h-3.5 inline-block rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadLogoFor(u.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteUnit(u.id, u.name)}
                          className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition"
                          title="Eliminar unidad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS & ROLES */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Asignación de Usuarios a Unidades
              </p>
              <p className="text-xs text-muted-foreground">
                Define el rol, unidad y cargo (Capitán, Secretario o Integrante) de cada miembro.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{rangeLabel}</span>
          </div>

          {/* Search and Unit Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Filtrar por unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las unidades</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Profiles Table */}
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/60 bg-muted/30">
                  <th className="text-left py-2.5 px-3 font-semibold">Usuario</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Rol Plataforma</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Unidad</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Cargo</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Cargando integrantes…
                    </td>
                  </tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-8">
                      No se encontraron usuarios con los criterios actuales.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => {
                    const a = assignments.find((x) => x.user_id === p.user_id);
                    const r = roles[p.user_id] ?? "integrante";
                    const fullName = `${p.first_name} ${p.first_last_name}`.trim();
                    const initials = `${p.first_name?.[0] || ""}${p.first_last_name?.[0] || ""}`.toUpperCase();

                    return (
                      <tr
                        key={p.user_id}
                        className="border-t border-border/40 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <AuroraAvatar
                              size={30}
                              initials={initials}
                              imageUrl={p.avatar_url}
                              color={a?.position === "capitan" ? "var(--aurora-peach)" : "var(--aurora-violet)"}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{fullName || "—"}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {roleLabel(r)}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {a ? (
                            <span className="text-foreground font-semibold">{unitName(a.unit_id)}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Sin unidad</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {a ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                a.position === "capitan"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : a.position === "secretario"
                                  ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {a.position === "capitan" && <Crown className="w-3 h-3 text-amber-500" />}
                              {a.position === "secretario" && <FileText className="w-3 h-3 text-indigo-500" />}
                              {positionLabel(a.position)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignFor(p.user_id)}
                              className="gap-1 h-7 text-xs px-2 rounded-lg"
                            >
                              <UserPlus className="w-3 h-3" /> Asignar
                            </Button>
                            {a && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAssignment(p.user_id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                                title="Quitar de la unidad"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(p)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                              title="Eliminar usuario"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={loadingData || page === 0}
              className="gap-1 text-xs h-8 rounded-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </Button>
            <span className="text-xs font-mono text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={loadingData || page + 1 >= totalPages}
              className="gap-1 text-xs h-8 rounded-lg"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* DIALOG: CREATE NEW UNIT */}
      <Dialog open={newUnitModalOpen} onOpenChange={setNewUnitModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Crear Nueva Unidad
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Nombre de la Unidad</Label>
              <Input
                placeholder="Ej. Águilas Reales, Leones de Judá..."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Emblema o Logo (Opcional)</Label>
              <label className="flex items-center gap-2 mt-1.5 px-3 h-11 rounded-xl border border-input bg-muted/30 cursor-pointer hover:bg-muted/50 text-xs transition">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="truncate flex-1">
                  {newUnitLogoFile ? newUnitLogoFile.name : "Seleccionar imagen PNG o JPG"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setNewUnitLogoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewUnitModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createUnit} disabled={creating || !newUnitName.trim()}>
              {creating ? "Creando…" : "Crear Unidad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ASSIGN MEMBER */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Asignar Integrante
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Rol en el Club</Label>
              <Select value={assignAppRole} onValueChange={(v) => setAssignAppRole(v as AppRole)}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {role === "super_admin" && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="subdirector">Sub-Director</SelectItem>
                  <SelectItem value="integrante">Integrante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Unidad Asignada</Label>
              <Select value={assignUnitId} onValueChange={setAssignUnitId}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Selecciona una unidad" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {units.length === 0 && (
                <p className="text-xs text-destructive mt-1">Crea una unidad primero en la pestaña Unidades.</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold">Cargo en la Unidad</Label>
              <Select value={assignPosition} onValueChange={(v) => setAssignPosition(v as Position)}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="capitan">Capitán</SelectItem>
                  <SelectItem value="secretario">Secretario</SelectItem>
                  <SelectItem value="miembro">Integrante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={saveAssignment} disabled={savingAssign || !assignUnitId}>
              {savingAssign ? "Guardando…" : "Confirmar Asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: DELETE USER */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Se eliminará permanentemente a <strong>{deleteTarget?.first_name} {deleteTarget?.first_last_name}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UnitAdminPanel;

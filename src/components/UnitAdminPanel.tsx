import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, UserPlus, Crown, FileText, Users as UsersIcon, Upload, Image as ImageIcon, UserX, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Position = "capitan" | "secretario" | "miembro";
type AppRole = "super_admin" | "director" | "subdirector" | "integrante";

interface Unit { id: string; name: string; logo_url?: string | null }
interface Profile {
  user_id: string;
  first_name: string;
  first_last_name: string;
  email: string;
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
  r === "super_admin" ? "Super Admin"
  : r === "director" ? "Director"
  : r === "subdirector" ? "Sub-Director"
  : "Integrante";

interface Props { onChanged?: () => void }

const UnitAdminPanel = ({ onChanged }: Props) => {
  const { role } = useAuth();
  const allowed = role === "super_admin" || role === "director" || role === "subdirector";

  const [units, setUnits] = useState<Unit[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [loadingData, setLoadingData] = useState(true);

  // Pagination + search (server-side, in batches)
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  // Load units once (small list, needed for selects and assignment names)
  const loadUnits = async () => {
    const { data: u } = await supabase
      .from("units")
      .select("id, name, logo_url")
      .order("name");
    setUnits((u as Unit[]) ?? []);
  };

  // Load one page of profiles + only the assignments/roles for that page
  const loadProfilesPage = async () => {
    setLoadingData(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("profiles")
        .select("user_id, first_name, first_last_name, email", { count: "exact" })
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
        (r ?? []).forEach((x: any) => { rmap[x.user_id] = x.role; });
        setRoles(rmap);
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Reload everything (used after mutations)
  const load = async () => {
    await Promise.all([loadUnits(), loadProfilesPage()]);
  };

  useEffect(() => { if (allowed) loadUnits(); }, [allowed]);
  useEffect(() => { if (allowed) loadProfilesPage(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [allowed, page, search]);

  // Debounce the search input so we don't hammer the DB on every keystroke
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
      toast({ title: "Unidad creada" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const uploadLogoFor = async (unitId: string, file: File) => {
    setUploadingLogoFor(unitId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${unitId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("unit-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("unit-logos").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("units")
        .update({ logo_url: publicUrl })
        .eq("id", unitId);
      if (updErr) throw updErr;
      toast({ title: "Logo actualizado" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploadingLogoFor(null);
    }
  };

  const deleteUnit = async (id: string) => {
    if (!confirm("¿Eliminar esta unidad? Se quitarán los miembros asignados.")) return;
    // Remove memberships first to avoid FK errors
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
      // Update app role
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

      // Upsert unit assignment (one unit per user model)
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
    toast({ title: "Miembro removido" });
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 space-y-6"
    >
      <div>
        <h3 className="font-bold text-foreground mb-1">Administración de Unidades</h3>
        <p className="text-xs text-muted-foreground">
          Crea unidades y asigna miembros con su cargo.
        </p>
      </div>

      {/* Create unit */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nueva unidad</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Nombre de la unidad (ej. Águilas)"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
          />
          <label className="flex items-center gap-2 px-3 h-10 rounded-md border border-input bg-background cursor-pointer hover:bg-muted/40 text-sm">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="truncate max-w-[140px]">
              {newUnitLogoFile ? newUnitLogoFile.name : "Logo (opcional)"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setNewUnitLogoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button onClick={createUnit} disabled={creating || !newUnitName.trim()} className="gap-1">
            <Plus className="w-4 h-4" /> Crear
          </Button>
        </div>
      </div>

      {/* Units list */}
      {units.length > 0 && (
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unidades</Label>
          <div className="flex flex-wrap gap-3 mt-2">
            {units.map((u) => (
              <div key={u.id} className="flex items-center gap-2 bg-muted/30 rounded-2xl pl-2 pr-2 py-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                  {u.logo_url ? (
                    <img src={u.logo_url} alt={u.name} className="w-full h-full object-cover" />
                  ) : (
                    <UsersIcon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <span className="text-sm font-medium">{u.name}</span>
                <label
                  className="p-1.5 rounded-full hover:bg-primary/20 text-muted-foreground hover:text-primary transition cursor-pointer"
                  title={u.logo_url ? "Cambiar logo" : "Subir logo"}
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
                  onClick={() => deleteUnit(u.id)}
                  className="p-1.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition"
                  aria-label="Eliminar unidad"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members table */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Miembros registrados</Label>
          <span className="text-xs text-muted-foreground">{rangeLabel}</span>
        </div>
        <div className="relative mt-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="pl-9"
          />
        </div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-2 pr-2">Nombre</th>
                <th className="text-left py-2 px-2">Rol</th>
                <th className="text-left py-2 px-2">Unidad</th>
                <th className="text-left py-2 px-2">Cargo</th>
                <th className="text-right py-2 pl-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-6">
                    Cargando miembros…
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-6">
                    No hay miembros registrados.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const a = assignments.find((x) => x.user_id === p.user_id);
                  const r = roles[p.user_id] ?? "integrante";
                  return (
                    <tr key={p.user_id} className="border-t border-border/30">
                      <td className="py-2 pr-2 font-medium text-foreground">
                        {p.first_name} {p.first_last_name}
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="secondary" className="text-xs">{roleLabel(r)}</Badge>
                      </td>
                      <td className="py-2 px-2 text-foreground">{a ? unitName(a.unit_id) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 px-2">
                        {a ? (
                          <Badge className="text-xs gap-1">
                            {a.position === "capitan" && <Crown className="w-3 h-3" />}
                            {a.position === "secretario" && <FileText className="w-3 h-3" />}
                            {positionLabel(a.position)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openAssignFor(p.user_id)} className="gap-1 h-8">
                            <UserPlus className="w-3.5 h-3.5" /> Asignar
                          </Button>
                          {a && (
                            <Button size="sm" variant="ghost" onClick={() => removeAssignment(p.user_id)} className="h-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(p)}
                            className="h-8 text-destructive hover:text-destructive"
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
        {/* Pagination controls */}
        <div className="flex items-center justify-between gap-2 pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={loadingData || page === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={loadingData || page + 1 >= totalPages}
            className="gap-1"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar miembro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rol en la plataforma</Label>
              <Select value={assignAppRole} onValueChange={(v) => setAssignAppRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {role === "super_admin" && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="subdirector">Sub-Director</SelectItem>
                  <SelectItem value="integrante">Integrante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidad</Label>
              <Select value={assignUnitId} onValueChange={setAssignUnitId}>
                <SelectTrigger><SelectValue placeholder="Selecciona una unidad" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {units.length === 0 && (
                <p className="text-xs text-destructive mt-1">Crea una unidad primero.</p>
              )}
            </div>
            <div>
              <Label>Cargo en la unidad</Label>
              <Select value={assignPosition} onValueChange={(v) => setAssignPosition(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="capitan">Capitán</SelectItem>
                  <SelectItem value="secretario">Secretario</SelectItem>
                  <SelectItem value="miembro">Integrante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={saveAssignment} disabled={savingAssign || !assignUnitId}>
              {savingAssign ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente a <strong>{deleteTarget?.first_name} {deleteTarget?.first_last_name}</strong> y todos sus datos asociados (evaluaciones, progreso, fotos, mensajes, etc.). Esta acción no se puede deshacer.
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
    </motion.div>
  );
};

export default UnitAdminPanel;

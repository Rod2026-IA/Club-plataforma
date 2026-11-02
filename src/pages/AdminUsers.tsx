import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Trash2, Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminStreakControl from "@/components/AdminStreakControl";
import AdminSupportPanel from "@/components/AdminSupportPanel";

interface UserRow {
  user_id: string;
  first_name: string;
  first_last_name: string;
  phone: string;
  pin: string | null;
  source: string | null;
  updated_at: string | null;
  role: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  director: "Director",
  subdirector: "Subdirector",
  gm_investido: "GM Investido",
  integrante: "Aspirante GM",
};

const ROLE_OPTIONS = ["integrante", "gm_investido", "subdirector", "director", "super_admin"] as const;

const AdminUsers = () => {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [newPin, setNewPin] = useState("");
  const [working, setWorking] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "super_admin") {
      toast.error("Acceso denegado");
      navigate("/dashboard");
      return;
    }
    loadUsers();
  }, [role, authLoading]);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, first_last_name, phone")
      .order("first_name");
    const { data: pins } = await supabase
      .from("pin_records")
      .select("user_id, pin, source, updated_at");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const pinMap = new Map((pins || []).map((p) => [p.user_id, p]));
    const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role as string]));
    const merged: UserRow[] = (profiles || []).map((p) => ({
      ...p,
      pin: pinMap.get(p.user_id)?.pin ?? null,
      source: pinMap.get(p.user_id)?.source ?? null,
      updated_at: pinMap.get(p.user_id)?.updated_at ?? null,
      role: roleMap.get(p.user_id) ?? null,
    }));
    setUsers(merged);
    setLoading(false);
  };

  const doReset = async () => {
    if (!resetTarget || newPin.length !== 4) { toast.error("PIN debe ser 4 dígitos"); return; }
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-pin", {
      body: { targetUserId: resetTarget.user_id, newPin, action: "reset" },
    });
    setWorking(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Error"); return; }
    toast.success("PIN actualizado");
    setResetTarget(null);
    setNewPin("");
    loadUsers();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-pin", {
      body: { targetUserId: deleteTarget.user_id, action: "delete" },
    });
    setWorking(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Error"); return; }
    toast.success("Usuario eliminado");
    setDeleteTarget(null);
    loadUsers();
  };

  const syncAllPins = async () => {
    if (!confirm("¿Resincronizar las contraseñas de TODOS los usuarios con su PIN guardado? Esto asegurará que puedan iniciar sesión con el PIN mostrado.")) return;
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("admin-sync-pins", { body: {} });
    setSyncing(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Error"); return; }
    toast.success(`Sincronizados: ${data?.synced ?? 0} · Fallidos: ${data?.failed ?? 0}`);
  };

  const syncOnePin = async (userId: string, name: string) => {
    const { data, error } = await supabase.functions.invoke("admin-sync-pins", { body: { targetUserId: userId } });
    if (error || data?.error) { toast.error(data?.error || error?.message || "Error"); return; }
    if (data?.synced > 0) toast.success(`PIN resincronizado para ${name}`);
    else toast.error(`No se pudo resincronizar ${name}`);
  };

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Rol actualizado");
    loadUsers();
  };

  const sourceLabel = (s: string | null) => {
    if (s === "registration") return "Registro";
    if (s === "admin_reset") return "Reset por admin";
    if (s === "self_recovery") return "Recuperación";
    return "—";
  };

  return (
    <div className="min-h-screen gradient-navy p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold neon-text-cyan">Gestión de Usuarios</h1>
            <p className="text-muted-foreground font-body text-sm">Solo super admin</p>
          </div>
        </div>

        <Card className="p-3 mb-4 bg-destructive/10 border-destructive/40">
          <div className="flex gap-2 items-start">
            <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">Los PINs visibles son sensibles. No compartas esta pantalla.</p>
          </div>
        </Card>

        <Card className="p-3 mb-4 bg-primary/5 border-primary/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Resincronizar contraseñas</p>
              <p className="text-xs text-muted-foreground">Si algún usuario no puede iniciar sesión con su PIN, usa esto para volver a aplicar el PIN guardado como contraseña.</p>
            </div>
            <Button size="sm" onClick={syncAllPins} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sincronizar todos</>}
            </Button>
          </div>
        </Card>

        <div className="mb-4">
          <AdminStreakControl />
        </div>

        <div className="mb-4">
          <AdminSupportPanel />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.user_id} className="p-4 glass-card">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{u.first_name} {u.first_last_name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Origen PIN: <span className="font-medium">{sourceLabel(u.source)}</span>
                      {u.updated_at && <> · {new Date(u.updated_at).toLocaleDateString()}</>}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rol:</span>
                      <Select value={u.role || "integrante"} onValueChange={(v) => changeRole(u.user_id, v)}>
                        <SelectTrigger className="h-7 text-xs w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted/40 rounded-md px-2 py-1.5">
                      <span className="text-sm font-mono tracking-widest min-w-[3.5rem] text-center">
                        {u.pin ? (showPins[u.user_id] ? u.pin : "••••") : "—"}
                      </span>
                      {u.pin && (
                        <button
                          onClick={() => setShowPins((p) => ({ ...p, [u.user_id]: !p[u.user_id] }))}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {showPins[u.user_id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setResetTarget(u); setNewPin(""); }}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" title="Resincronizar PIN" onClick={() => syncOnePin(u.user_id, `${u.first_name} ${u.first_last_name}`)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {users.length === 0 && <p className="text-center text-muted-foreground py-8">Sin usuarios</p>}
          </div>
        )}
      </motion.div>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Asignar nuevo PIN para <span className="font-semibold text-foreground">{resetTarget?.first_name} {resetTarget?.first_last_name}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nuevo PIN (4 dígitos)</Label>
              <Input type="text" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="text-center tracking-[0.4em] text-lg" placeholder="0000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={doReset} disabled={working}>{working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resetear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente a <strong>{deleteTarget?.first_name} {deleteTarget?.first_last_name}</strong> y sus datos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={working} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;

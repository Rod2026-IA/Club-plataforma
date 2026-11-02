import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Coins, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";

interface Profile {
  user_id: string;
  first_name: string;
  first_last_name: string;
  avatar_url: string | null;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  tx_type: "ingreso" | "egreso";
  description: string | null;
  tx_date: string;
  registered_by: string;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const ADMIN_ROLES = ["super_admin", "director", "subdirector"];

const ConquiKash = () => {
  const { user, role } = useAuth();
  const isAdmin = role ? ADMIN_ROLES.includes(role) : false;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<"ingreso" | "egreso">("ingreso");
  const [description, setDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    const [profilesRes, rolesRes, txRes] = await Promise.all([
      supabase.from("profiles").select("user_id, first_name, first_last_name, avatar_url"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("conqui_kash_transactions").select("*").order("tx_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (rolesRes.data) {
      const map: Record<string, string> = {};
      (rolesRes.data as RoleRow[]).forEach((r) => (map[r.user_id] = r.role));
      setRoles(map);
    }
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Members the admin can register money for: integrante role
  const memberProfiles = useMemo(
    () => profiles.filter((p) => {
      const r = roles[p.user_id];
      // Excluir administradores; incluir cualquier otro rol (integrante, gm_investido, aspirante, etc.)
      return r && !ADMIN_ROLES.includes(r);
    }),
    [profiles, roles]
  );

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => (m[p.user_id] = p));
    return m;
  }, [profiles]);

  const fullName = (uid: string) => {
    const p = profileMap[uid];
    return p ? `${p.first_name} ${p.first_last_name}` : "—";
  };

  const roleLabel = (uid: string) => {
    const r = roles[uid];
    if (r === "director") return "Director";
    if (r === "subdirector") return "Sub-director";
    if (r === "super_admin") return "Super Admin";
    return "Registro";
  };

  // Compute balance per user
  const balanceFor = (uid: string) =>
    transactions
      .filter((t) => t.user_id === uid)
      .reduce((sum, t) => sum + (t.tx_type === "ingreso" ? Number(t.amount) : -Number(t.amount)), 0);

  const myTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === user?.id),
    [transactions, user]
  );

  const myBalance = useMemo(() => (user ? balanceFor(user.id) : 0), [transactions, user]);

  const openNewDialog = (uid?: string) => {
    setEditingTx(null);
    setSelectedUserId(uid ?? "");
    setAmount("");
    setTxType("ingreso");
    setDescription("");
    setTxDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const openEditDialog = (tx: Transaction) => {
    setEditingTx(tx);
    setSelectedUserId(tx.user_id);
    setAmount(String(tx.amount));
    setTxType(tx.tx_type);
    setDescription(tx.description ?? "");
    setTxDate(tx.tx_date);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!selectedUserId || !amount || Number(amount) <= 0) {
      toast.error("Selecciona un integrante y un monto válido");
      return;
    }

    if (editingTx) {
      const { error } = await supabase
        .from("conqui_kash_transactions")
        .update({
          user_id: selectedUserId,
          amount: Number(amount),
          tx_type: txType,
          description,
          tx_date: txDate,
        })
        .eq("id", editingTx.id);
      if (error) {
        toast.error("Error al actualizar");
        return;
      }
      toast.success("Movimiento actualizado");
    } else {
      const { error } = await supabase.from("conqui_kash_transactions").insert({
        user_id: selectedUserId,
        amount: Number(amount),
        tx_type: txType,
        description,
        tx_date: txDate,
        registered_by: user.id,
      });
      if (error) {
        toast.error("Error al registrar");
        return;
      }
      toast.success("Movimiento registrado");
    }
    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("conqui_kash_transactions").delete().eq("id", deleteId);
    if (error) {
      toast.error("Error al eliminar");
      return;
    }
    toast.success("Movimiento eliminado");
    setDeleteId(null);
    loadData();
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  // ===== MEMBER VIEW =====
  if (!isAdmin) {
    const ingresos = myTransactions.filter((t) => t.tx_type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
    const egresos = myTransactions.filter((t) => t.tx_type === "egreso").reduce((s, t) => s + Number(t.amount), 0);

    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Conqui Kash" subtitle="Mis ahorros" />
        <div className="container py-6 space-y-6">
          {/* Balance card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 gradient-neon text-primary-foreground neon-glow-orange">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6" />
                <p className="text-sm opacity-90">Total ahorrado</p>
              </div>
              <p className="text-4xl font-bold">{formatMoney(myBalance)}</p>
            </Card>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-success">
                <TrendingUp className="w-4 h-4" />
                <p className="text-xs text-muted-foreground">Ingresos</p>
              </div>
              <p className="text-lg font-bold mt-1">{formatMoney(ingresos)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <TrendingDown className="w-4 h-4" />
                <p className="text-xs text-muted-foreground">Egresos</p>
              </div>
              <p className="text-lg font-bold mt-1">{formatMoney(egresos)}</p>
            </Card>
          </div>

          {/* History */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Historial</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : myTransactions.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Tu billetera está lista"
                description="Aún no tienes movimientos. Comienza a registrar tus ingresos y egresos."
              />
            ) : (
              <div className="space-y-2">
                {myTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {tx.tx_type === "ingreso" ? (
                          <TrendingUp className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <p className="font-medium text-sm truncate">
                          {tx.description || (tx.tx_type === "ingreso" ? "Aporte" : "Retiro")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(tx.tx_date).toLocaleDateString("es-CO")} · Registrado por{" "}
                        <span className="font-medium">
                          {fullName(tx.registered_by)}
                        </span>{" "}
                        ({roleLabel(tx.registered_by)})
                      </p>
                    </div>
                    <p
                      className={`font-bold text-sm ml-3 ${
                        tx.tx_type === "ingreso" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {tx.tx_type === "ingreso" ? "+" : "-"}
                      {formatMoney(Number(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ===== ADMIN VIEW =====
  const totalFondo = memberProfiles.reduce((sum, p) => sum + balanceFor(p.user_id), 0);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Conqui Kash" subtitle="Administración de aportes" />
      <div className="container py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 gradient-neon text-primary-foreground neon-glow-orange">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="w-5 h-5" />
                  <p className="text-sm opacity-90">Fondo total del club</p>
                </div>
                <p className="text-3xl font-bold">{formatMoney(totalFondo)}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => openNewDialog()}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" /> Nuevo
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Members table */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Integrantes</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : memberProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay integrantes registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integrante</TableHead>
                    <TableHead className="text-right">Ahorrado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberProfiles.map((p) => (
                    <TableRow key={p.user_id}>
                      <TableCell className="font-medium">
                        {p.first_name} {p.first_last_name}
                      </TableCell>
                      <TableCell className="text-right font-bold neon-text-cyan">
                        {formatMoney(balanceFor(p.user_id))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openNewDialog(p.user_id)}>
                          <Plus className="w-3 h-3 mr-1" /> Aporte
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Full history */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Historial general</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Integrante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">
                        {new Date(tx.tx_date).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="font-medium">{fullName(tx.user_id)}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            tx.tx_type === "ingreso"
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {tx.tx_type === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          tx.tx_type === "ingreso" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {tx.tx_type === "ingreso" ? "+" : "-"}
                        {formatMoney(Number(tx.amount))}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{fullName(tx.registered_by)}</span>
                        <br />
                        <span className="text-muted-foreground">{roleLabel(tx.registered_by)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(tx)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(tx.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTx ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
            <DialogDescription>
              {editingTx ? "Corrige los datos del aporte" : "Registra un ingreso o egreso de dinero"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Integrante</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un integrante" />
                </SelectTrigger>
                <SelectContent>
                  {memberProfiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.first_name} {p.first_last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={txType} onValueChange={(v) => setTxType(v as "ingreso" | "egreso")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Concepto del movimiento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editingTx ? "Guardar" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro será borrado del historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConquiKash;

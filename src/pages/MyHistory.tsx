import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  evaluation_date: string;
  asistencia: number;
  puntualidad: number;
  cuota: number;
  part_devocional: number;
  asistencia_ja: number;
  tareas: number;
  uniforme: number;
  total_score: number;
}

const MyHistory = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("evaluations")
        .select("id, evaluation_date, asistencia, puntualidad, cuota, part_devocional, asistencia_ja, tareas, uniforme, total_score")
        .eq("user_id", user.id)
        .order("evaluation_date", { ascending: false });
      setRows((data as Row[]) ?? []);
    };
    load();
  }, [user]);

  const grandTotal = rows.reduce((s, r) => s + (r.total_score ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Mi Historial" subtitle="Todas tus evaluaciones registradas" />
      <div className="container py-6">
        <div className="glass-card rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">Asis.</TableHead>
                <TableHead className="text-center">Punt.</TableHead>
                <TableHead className="text-center">Unif.</TableHead>
                <TableHead className="text-center">Devo.</TableHead>
                <TableHead className="text-center">JA</TableHead>
                <TableHead className="text-center">Tareas</TableHead>
                <TableHead className="text-center">Cuota</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Aún no tienes evaluaciones registradas.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.evaluation_date}</TableCell>
                    <TableCell className="text-center">{r.asistencia}</TableCell>
                    <TableCell className="text-center">{r.puntualidad}</TableCell>
                    <TableCell className="text-center">{r.uniforme}</TableCell>
                    <TableCell className="text-center">{r.part_devocional}</TableCell>
                    <TableCell className="text-center">{r.asistencia_ja}</TableCell>
                    <TableCell className="text-center">{r.tareas}</TableCell>
                    <TableCell className="text-center">{r.cuota}</TableCell>
                    <TableCell className="text-right font-bold neon-text-cyan">{r.total_score}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={8} className="font-semibold">Total acumulado</TableCell>
                  <TableCell className="text-right text-lg font-bold neon-text-cyan">{grandTotal}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
};

export default MyHistory;

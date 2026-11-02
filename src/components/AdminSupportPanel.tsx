import { useEffect, useState } from "react";
import { Loader2, MessageCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SupportChatThread from "./SupportChatThread";

interface ThreadRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

const AdminSupportPanel = () => {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ThreadRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_support_threads");
    if (error) toast.error(error.message);
    setThreads(((data || []) as unknown) as ThreadRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-support-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "streak_support_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" /> Asistencia de racha
        </h2>
        {active && (
          <Button size="sm" variant="ghost" onClick={() => setActive(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
        )}
      </div>

      {active ? (
        <div>
          <p className="text-sm font-semibold mb-2">{active.full_name}</p>
          <div className="h-[420px] border rounded-lg overflow-hidden bg-background">
            <SupportChatThread threadUserId={active.user_id} isAdmin />
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : threads.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Sin reportes aún</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.user_id}
              onClick={() => setActive(t)}
              className="w-full text-left rounded-lg border bg-card/60 p-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.last_message}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.last_message_at).toLocaleDateString()}
                  </span>
                  {t.unread_count > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {t.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AdminSupportPanel;
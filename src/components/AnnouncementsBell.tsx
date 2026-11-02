import { useEffect, useState } from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { notifyAll } from "@/lib/pushNotifications";

interface Announcement {
  id: string;
  title: string;
  summary: string;
  created_at: string;
}

const AnnouncementsBell = () => {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  const isAdmin = role === "super_admin";

  const load = async () => {
    const { data } = await supabase
      .from("feature_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data || []) as Announcement[]);
    if (user) {
      const { data: reads } = await supabase
        .from("feature_announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);
      setReadIds(new Set((reads || []).map((r: any) => r.announcement_id)));
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`announcements-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_announcements" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((i) => !readIds.has(i.id)).length;

  const markAllRead = async () => {
    if (!user) return;
    const toMark = items.filter((i) => !readIds.has(i.id));
    if (toMark.length === 0) return;
    await supabase.from("feature_announcement_reads").upsert(
      toMark.map((i) => ({ user_id: user.id, announcement_id: i.id })),
      { onConflict: "user_id,announcement_id" }
    );
    setReadIds(new Set([...readIds, ...toMark.map((i) => i.id)]));
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) markAllRead();
  };

  const create = async () => {
    if (!user || !title.trim() || !summary.trim()) return;
    setCreating(true);
    const { error } = await supabase
      .from("feature_announcements")
      .insert({ title: title.trim(), summary: summary.trim(), created_by: user.id });
    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notificación publicada" });
    setTitle(""); setSummary("");
    notifyAll(`📢 ${title.trim()}`, summary.trim(), "/dashboard");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("feature_announcements").delete().eq("id", id);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          title="Novedades"
          className="relative p-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Novedades y nuevas funciones
          </DialogTitle>
        </DialogHeader>

        {isAdmin && (
          <div className="space-y-2 p-3 rounded-xl border border-border/50 bg-muted/20">
            <p className="text-sm font-semibold">Publicar nueva función</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Stickers en chats de racha" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resumen práctico</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Qué cambia y cómo usarlo, en pocas palabras." />
            </div>
            <Button onClick={create} disabled={creating || !title.trim() || !summary.trim()} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> {creating ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        )}

        <div className="space-y-2 mt-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no hay novedades.
            </p>
          )}
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-border/50 bg-card/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{a.summary}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => remove(a.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementsBell;
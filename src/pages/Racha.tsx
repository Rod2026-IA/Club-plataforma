import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Flame, Send, Search, Star, Check, Crown, Trash2, Globe, MessageCircle, Heart, Smile, Sticker, Upload, X, Mic, Square, Pencil, LifeBuoy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useVoiceRecorder, formatDuration } from "@/lib/voiceRecorder";
import VoiceMessage from "@/components/VoiceMessage";
import SupportChatThread from "@/components/SupportChatThread";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StreakRow {
  conversation_id: string;
  other_user_id: string;
  streak_count: number;
  last_interaction_date: string | null;
  has_today_interaction: boolean;
  lives: number;
}

interface Profile {
  user_id: string;
  first_name: string;
  first_last_name: string;
  avatar_url: string | null;
}

interface GlobalStreakRow {
  conversation_id: string;
  user1_id: string;
  user2_id: string;
  user1_name: string;
  user2_name: string;
  user1_avatar: string | null;
  user2_avatar: string | null;
  streak_count: number;
  last_interaction_date: string | null;
}

const RankCrown = ({ rank }: { rank: number }) => {
  if (rank > 3) return null;
  const styles = [
    // gold neon
    "text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]",
    // silver neon
    "text-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,0.9)]",
    // copper neon
    "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.9)]",
  ];
  return <Crown className={`w-6 h-6 ${styles[rank - 1]}`} fill="currentColor" />;
};

const DAYS = ["L", "Ma", "Mi", "J", "V", "S", "D"];
// JS getDay(): 0=Sun..6=Sat -> mapeo a L..D
const jsDayToIndex = (d: number) => (d === 0 ? 6 : d - 1);
const HONDURAS_TIME_ZONE = "America/Tegucigalpa";
const STREAK_DAY_START_OFFSET_MS = 60 * 60 * 1000;

const toHondurasISODate = (value: Date | string = new Date()) => {
  const rawDate = typeof value === "string" ? new Date(value) : value;
  const date = new Date(rawDate.getTime() - STREAK_DAY_START_OFFSET_MS);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HONDURAS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const addDaysToISODate = (isoDate: string, amount: number) => {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const diffISODateDays = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
};

const Racha = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const partnerId = params.get("partner");

  const [streaks, setStreaks] = useState<StreakRow[]>([]);
  const [globalStreaks, setGlobalStreaks] = useState<GlobalStreakRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"top" | "global" | "users">("top");
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    await supabase.rpc("cleanup_expired_streaks");
    const { data: rows } = await supabase.rpc("get_my_streaks");
    const list = (rows || []) as StreakRow[];
    setStreaks(list);

    const { data: globalRows } = await supabase.rpc("get_global_streaks");
    setGlobalStreaks((globalRows || []) as GlobalStreakRow[]);

    const ids = Array.from(new Set(list.map((r) => r.other_user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, first_last_name, avatar_url")
        .in("user_id", ids);
      const map: Record<string, Profile> = {};
      ((profs || []) as Profile[]).forEach((p) => (map[p.user_id] = p));
      setProfiles(map);
    }

    const { data: usersList } = await supabase
      .from("profiles")
      .select("user_id, first_name, first_last_name, avatar_url")
      .neq("user_id", user.id)
      .order("first_name");
    // Excluir super_admin del listado
    const { data: superAdmins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const superAdminIds = new Set(((superAdmins || []) as { user_id: string }[]).map((r) => r.user_id));
    setAllUsers(((usersList || []) as Profile[]).filter((u) => !superAdminIds.has(u.user_id)));
    setLoading(false);
  };

  const loadUnread = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .eq("read", false);
    const map: Record<string, number> = {};
    ((data || []) as { sender_id: string }[]).forEach((m) => {
      map[m.sender_id] = (map[m.sender_id] || 0) + 1;
    });
    setUnreadBySender(map);
  };


  const deleteStreak = async (partnerId: string) => {
    const { error } = await supabase.rpc("delete_my_streak", { _partner: partnerId });
    if (error) {
      toast.error("No se pudo eliminar la racha");
      return;
    }
    toast.success("Racha eliminada");
    load();
  };

  useEffect(() => {
    load();
    loadUnread();
    if (!user) return;
    const channel = supabase
      .channel(`racha-list-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => loadUnread()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => loadUnread()
      )
      .subscribe();
    const broadcast = supabase
      .channel("streak-admin-broadcast")
      .on("broadcast", { event: "refresh" }, () => {
        load(true);
        loadUnread();
        toast.info("Tu racha fue actualizada por el admin");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcast);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const topStreaks = useMemo(
    () => [...streaks].sort((a, b) => b.streak_count - a.streak_count),
    [streaks]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) =>
      `${u.first_name} ${u.first_last_name}`.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const fullName = (p?: Profile) =>
    p ? `${p.first_name} ${p.first_last_name}`.trim() : "Usuario";

  // ----- Vista de pareja seleccionada -----
  if (partnerId) {
    return (
      <PartnerStreakView
        partnerId={partnerId}
        onBack={() => {
          setParams({});
          load();
          loadUnread();
        }}
        onDelete={async () => {
          await deleteStreak(partnerId);
          setParams({});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Racha del Guía" subtitle="Mantén tu racha cada día" />

      <div className="container py-6 space-y-6">
        <SupportChatLauncher />
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={tab === "top" ? "default" : "outline"}
            onClick={() => setTab("top")}
            className="flex-1"
          >
            <Star className="w-4 h-4 mr-2" /> Tus rachas
          </Button>
          <Button
            variant={tab === "global" ? "default" : "outline"}
            onClick={() => setTab("global")}
            className="flex-1"
          >
            <Globe className="w-4 h-4 mr-2" /> Racha global
          </Button>
          <Button
            variant={tab === "users" ? "default" : "outline"}
            onClick={() => setTab("users")}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" /> Usuarios
          </Button>
        </div>

        {tab === "top" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">
              Tus rachas
            </h2>
            {loading && (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            )}
            {!loading && topStreaks.length === 0 && (
              <div className="glass-card rounded-2xl p-6 text-center">
                <Flame className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aún no tienes rachas. Ve a "Usuarios" y empieza una.
                </p>
              </div>
            )}
            {topStreaks.map((s, i) => {
              const p = profiles[s.other_user_id];
              const me: Profile | null = profile
                ? {
                    user_id: user?.id || "",
                    first_name: profile.first_name || "Yo",
                    first_last_name: profile.first_last_name || "",
                    avatar_url: profile.avatar_url || null,
                  }
                : null;
              return (
                <motion.button
                  key={s.conversation_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setParams({ partner: s.other_user_id })}
                  className="glass-card rounded-2xl p-4 w-full flex items-center gap-3 hover:border-primary/30 transition-all"
                >
                  <div className="w-7 flex items-center justify-center font-bold text-muted-foreground">
                    {i < 3 ? <RankCrown rank={i + 1} /> : i + 1}
                  </div>
                  {/* Avatares de la pareja solapados */}
                  <div className="flex -space-x-3 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-background">
                      {me?.avatar_url ? (
                        <img src={me.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-foreground font-bold text-sm">
                          {fullName(me || undefined).charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-background">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-foreground font-bold text-sm">
                          {fullName(p).charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {me?.first_name || "Tú"} <span className="text-muted-foreground">&</span> {p?.first_name || "Usuario"}
                    </p>
                    {!s.has_today_interaction && s.streak_count > 0 && (
                      <p className="text-xs text-orange-500">
                        Responde para mantener la racha
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-orange-500 font-bold">
                    <Flame className="w-5 h-5 fill-orange-500" />
                    {s.streak_count}
                  </div>
                  {unreadBySender[s.other_user_id] > 0 && (
                    <div className="relative" title="Mensajes nuevos">
                      <MessageCircle className="w-5 h-5 text-primary fill-primary/20 drop-shadow-[0_0_6px_hsl(var(--primary)/0.7)]" />
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadBySender[s.other_user_id] > 9 ? "9+" : unreadBySender[s.other_user_id]}
                      </span>
                    </div>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                        aria-label="Eliminar racha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar racha?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará la racha con {fullName(p)}. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteStreak(s.other_user_id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </motion.button>
              );
            })}
          </div>
        )}

        {tab === "global" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Racha global</h2>
            {loading && (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            )}
            {!loading && globalStreaks.length === 0 && (
              <div className="glass-card rounded-2xl p-6 text-center">
                <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aún no hay parejas con rachas activas.
                </p>
              </div>
            )}
            {globalStreaks.map((g, i) => (
              <motion.div
                key={g.conversation_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card rounded-2xl p-4 w-full flex items-center gap-3"
              >
                <div className="w-7 flex items-center justify-center font-bold text-muted-foreground">
                  {i < 3 ? <RankCrown rank={i + 1} /> : i + 1}
                </div>
                <div className="flex -space-x-3 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-background">
                    {g.user1_avatar ? (
                      <img src={g.user1_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-foreground font-bold text-sm">
                        {(g.user1_name || "U").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-background">
                    {g.user2_avatar ? (
                      <img src={g.user2_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-foreground font-bold text-sm">
                        {(g.user2_name || "U").charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {g.user1_name || "Usuario"} <span className="text-muted-foreground">&</span> {g.user2_name || "Usuario"}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-orange-500 font-bold">
                  <Flame className="w-5 h-5 fill-orange-500" />
                  {g.streak_count}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">
              Elige con quién hacer racha
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="pl-9"
              />
            </div>
            <div className="space-y-2">
              {filteredUsers.map((u) => {
                const existing = streaks.find(
                  (s) => s.other_user_id === u.user_id
                );
                return (
                  <button
                    key={u.user_id}
                    onClick={() => setParams({ partner: u.user_id })}
                    className="glass-card rounded-2xl p-3 w-full flex items-center gap-3 hover:border-primary/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-foreground font-bold">
                          {fullName(u).charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">
                        {fullName(u)}
                      </p>
                    </div>
                    {existing && existing.streak_count > 0 && (
                      <div className="flex items-center gap-1 text-orange-500 text-sm font-bold">
                        <Flame className="w-4 h-4 fill-orange-500" />
                        {existing.streak_count}
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No se encontraron usuarios.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== Vista de pareja =====================

const SupportChatLauncher = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full border-primary/40 text-primary hover:bg-primary/10"
      >
        <LifeBuoy className="w-4 h-4 mr-2" /> Asistencia con la racha
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-primary" /> Chat de asistencia
            </DialogTitle>
          </DialogHeader>
          <div className="h-[480px]">
            <SupportChatThread threadUserId={user.id} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface Msg {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  message_type?: string | null;
  audio_url?: string | null;
  audio_path?: string | null;
  audio_duration_ms?: number | null;
  edited?: boolean | null;
  read?: boolean | null;
}

const PartnerStreakView = ({
  partnerId,
  onBack,
  onDelete,
}: {
  partnerId: string;
  onBack: () => void;
  onDelete: () => void | Promise<void>;
}) => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [stickerPreview, setStickerPreview] = useState<string | null>(null);
  const [savingSticker, setSavingSticker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recorder = useVoiceRecorder();
  const [editMsg, setEditMsg] = useState<Msg | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages.length]);

  const saveStickerToCollection = async (url: string) => {
    if (!user) return;
    setSavingSticker(true);
    try {
      const { data: existing } = await supabase
        .from("user_stickers")
        .select("id")
        .eq("user_id", user.id)
        .eq("sticker_url", url)
        .maybeSingle();
      if (existing) {
        toast.info("Este sticker ya está en tu colección");
      } else {
        // Descargar y volver a subir al propio storage del usuario
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
        const path = `${user.id}/saved-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("stickers")
          .upload(path, blob, { upsert: false, contentType: blob.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("stickers").getPublicUrl(path);
        const { error: insErr } = await supabase.from("user_stickers").insert({
          user_id: user.id,
          sticker_url: publicUrl,
          storage_path: path,
        });
        if (insErr) throw insErr;
        toast.success("Sticker agregado a tu colección");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el sticker");
    } finally {
      setSavingSticker(false);
      setStickerPreview(null);
    }
  };

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, first_name, first_last_name, avatar_url")
      .eq("user_id", partnerId)
      .maybeSingle();
    if (prof) setPartner(prof as Profile);

    await supabase.rpc("cleanup_expired_streaks");
    const { data: rows } = await supabase.rpc("get_my_streaks");
    const found = ((rows || []) as StreakRow[]).find(
      (r) => r.other_user_id === partnerId
    );
    setStreak(found || null);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs || []) as Msg[]);

    // Marcar como leídos solo si hay mensajes no leídos del partner
    // (evita un UPDATE innecesario que dispara el canal realtime y causa un loop de recargas)
    const hasUnread = ((msgs || []) as Msg[]).some(
      (m) => m.sender_id === partnerId && m.receiver_id === user.id && m.read === false
    );
    if (hasUnread) {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", partnerId)
        .eq("receiver_id", user.id)
        .eq("read", false);
    }
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`streak-${partnerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${partnerId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    const broadcast = supabase
      .channel("streak-admin-broadcast")
      .on("broadcast", { event: "refresh" }, () => {
        load();
        toast.info("Tu racha fue actualizada por el admin");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcast);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, user?.id]);

  const sendMessage = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const payload = {
      sender_id: user.id,
      receiver_id: partnerId,
      content: text.trim(),
    };
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: partnerId,
      content: payload.content,
      created_at: new Date().toISOString(),
      message_type: "text",
    };
    setMessages((prev) => [...prev, optimistic]);
    const prevText = text;
    setText("");
    try {
      const { data, error } = await supabase.from("messages").insert(payload).select("*").single();
      if (error) {
        console.error("[Racha] sendMessage insert error", error, payload);
        toast.error(`No se pudo enviar: ${error.message}`);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setText(prevText);
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Msg) : m)));
      // Refresh streak/conversation info in background
      load();
    } catch (e: unknown) {
      console.error("[Racha] sendMessage exception", e, payload);
      toast.error(e instanceof Error ? `No se pudo enviar: ${e.message}` : "No se pudo enviar el mensaje");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(prevText);
    } finally {
      setSending(false);
    }
  };

  const sendSticker = async (url: string) => {
    if (!user) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: `sticker:${url}`,
    });
    if (error) {
      toast.error("No se pudo enviar el sticker");
      return;
    }
    load();
  };

  const sendVoice = async () => {
    if (!user) return;
    const result = await recorder.stop();
    if (!result || result.blob.size < 500) {
      toast.error("Nota de voz vacía");
      return;
    }
    setSending(true);
    try {
      const ext = result.mimeType.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/streak-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("voice-notes")
        .upload(path, result.blob, { contentType: result.mimeType });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("voice-notes").getPublicUrl(path);
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: partnerId,
        content: "",
        message_type: "voice",
        audio_url: publicUrl,
        audio_path: path,
        audio_duration_ms: result.durationMs,
      });
      if (error) throw error;
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar voz");
    } finally {
      setSending(false);
    }
  };

  const toggleMic = async () => {
    if (recorder.recording) {
      await sendVoice();
    } else {
      try {
        await recorder.start();
      } catch {
        toast.error("No se pudo acceder al micrófono");
      }
    }
  };

  const openEdit = (m: Msg) => {
    setEditMsg(m);
    setEditText(m.content);
  };

  const saveEdit = async () => {
    if (!editMsg) return;
    if (!editText.trim()) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("messages")
      .update({ content: editText.trim(), edited: true, edited_at: new Date().toISOString() })
      .eq("id", editMsg.id);
    setSavingEdit(false);
    if (error) {
      toast.error("No se pudo editar");
      return;
    }
    setEditMsg(null);
    setEditText("");
    load();
  };

  // Construir días de la semana actual (lunes a domingo)
  const weekDays = useMemo(() => {
    const today = new Date(`${toHondurasISODate()}T12:00:00Z`);
    const todayIdx = jsDayToIndex(today.getDay());
    const monday = new Date(today);
    monday.setDate(today.getDate() - todayIdx);
    return DAYS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return { label, date: iso, isToday: i === todayIdx, isFuture: i > todayIdx };
    });
  }, []);

  // Días marcados: si tenemos racha activa, los últimos N días desde last_interaction_date
  const markedDates = useMemo(() => {
    const set = new Set<string>();
    if (!streak || !streak.last_interaction_date || streak.streak_count <= 0) return set;
    for (let i = 0; i < streak.streak_count; i++) {
      set.add(addDaysToISODate(streak.last_interaction_date, -i));
    }
    return set;
  }, [streak]);

  const fullName = partner
    ? `${partner.first_name} ${partner.first_last_name}`.trim()
    : "Usuario";

  const partnerWroteToday = useMemo(() => {
    const today = toHondurasISODate();
    return messages.some(
      (m) => m.sender_id === partnerId && toHondurasISODate(m.created_at) === today
    );
  }, [messages, partnerId]);

  const youWroteToday = useMemo(() => {
    const today = toHondurasISODate();
    return messages.some(
      (m) => m.sender_id === user?.id && toHondurasISODate(m.created_at) === today
    );
  }, [messages, user?.id]);

  const statusMsg =
    youWroteToday && partnerWroteToday
      ? "¡Día completado! 🔥"
      : youWroteToday
      ? `Esperando respuesta de ${partner?.first_name || ""}`
      : "Responde para mantener la racha";

  const todayIso = toHondurasISODate();
  const lives = streak?.lives ?? 5;
  const missedDays =
    streak?.last_interaction_date && streak.streak_count > 0
      ? diffISODateDays(streak.last_interaction_date, todayIso) - 1
      : 0;
  const dayMissed =
    !!streak &&
    streak.streak_count > 0 &&
    !!streak.last_interaction_date &&
    missedDays > 0;
  const [reactivating, setReactivating] = useState(false);

  const reactivate = async () => {
    setReactivating(true);
    const { data, error } = await supabase.rpc("use_streak_life", { _partner: partnerId });
    setReactivating(false);
    if (error) {
      toast.error("No se pudo reactivar la racha");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.out_lives <= 0 && row.out_streak_count === 0) {
      toast.error("Te quedaste sin corazones. La racha se reinició.");
    } else if (row && row.out_lives === lives && row.out_streak_count === streak?.streak_count) {
      toast.info("Tu racha todavía está protegida; no se gastó ningún corazón.");
    } else {
      toast.success("¡Racha reactivada! Se repuso un día perdido.");
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={fullName}
        subtitle="Racha diaria"
        backTo="#"
      />
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-primary underline">
            ← Volver al listado
          </button>
          {streak && streak.streak_count > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar racha
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar racha?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará la racha con {fullName}. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Corazones de vida */}
        {streak && (
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Corazones de vida</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < lives;
                return (
                  <Heart
                    key={i}
                    className={`w-7 h-7 ${
                      filled
                        ? "text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                        : "text-muted-foreground/40"
                    }`}
                  />
                );
              })}
            </div>
            {dayMissed ? (
              <div className="space-y-2">
                <p className="text-sm text-orange-500 font-semibold">
                  Tienen {missedDays} día{missedDays === 1 ? "" : "s"} perdido{missedDays === 1 ? "" : "s"}. Usa un corazón para reponer un día.
                </p>
                <Button
                  onClick={reactivate}
                  disabled={reactivating}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Heart className="w-4 h-4 mr-1 fill-white" /> Reactivar racha
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Los corazones solo se gastan cuando pasa un día completo sin mensaje, de 1:00 a.m. a 12:59 a.m.
              </p>
            )}
          </div>
        )}

        {/* Bloque estilo Duolingo */}
        <div className="glass-card rounded-3xl p-6 text-center">
          <div className="relative inline-flex items-center justify-center mb-2">
            <Flame className="w-32 h-32 text-orange-500 fill-orange-500 drop-shadow-[0_8px_20px_rgba(249,115,22,0.5)]" />
            <span className="absolute text-5xl font-extrabold text-white">
              {streak?.streak_count ?? 0}
            </span>
          </div>
          <p className="text-2xl font-extrabold text-orange-500 mb-4">
            días de racha
          </p>

          {/* Semana */}
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((d) => (
                <div
                  key={d.label + d.date}
                  className={`text-xs font-bold ${
                    d.isToday ? "text-orange-500" : "text-muted-foreground"
                  }`}
                >
                  {d.label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => {
                const marked = markedDates.has(d.date);
                const isSunday = d.label === "D";
                return (
                  <div key={d.date} className="flex justify-center">
                    {marked ? (
                      <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                    ) : isSunday ? (
                      <Star className="w-9 h-9 text-yellow-400" />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full ${
                          d.isFuture ? "bg-muted/30" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Practica cada día esta semana para alcanzar una{" "}
              <span className="text-orange-500 font-bold">Racha perfecta</span>.
            </p>
          </div>

          <p className="mt-4 text-sm font-semibold text-foreground">
            {statusMsg}
          </p>
        </div>

        {/* Mini chat para activar la racha */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-bold text-foreground mb-3">
            Mensaje del día
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {messages.slice(-20).map((m) => {
              const mine = m.sender_id === user?.id;
              const isVoice = m.message_type === "voice" && (m.audio_path || m.audio_url);
              const isSticker = !isVoice && m.content.startsWith("sticker:");
              const stickerUrl = isSticker ? m.content.slice(8) : "";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  {isVoice ? (
                    <VoiceMessage url={m.audio_url} path={m.audio_path} durationMs={m.audio_duration_ms} mine={mine} />
                  ) : isSticker ? (
                    <button
                      type="button"
                      onClick={() => setStickerPreview(stickerUrl)}
                      className="focus:outline-none"
                    >
                      <img src={stickerUrl} alt="sticker" className="w-28 h-28 object-contain hover:scale-105 transition-transform" />
                    </button>
                  ) : (
                    <div className="group relative max-w-[75%]">
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm break-words ${
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {m.content}
                        {m.edited && (
                          <span className="ml-1 text-[10px] opacity-70">(editado)</span>
                        )}
                      </div>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="absolute -top-2 -left-2 bg-background border rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Envía el primer mensaje para iniciar la racha.
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>
          {recorder.recording ? (
            <div className="flex gap-2 items-center">
              <Button type="button" size="icon" variant="destructive" onClick={() => recorder.cancel()}>
                <X className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-sm text-destructive font-mono">
                ● Grabando {formatDuration(recorder.elapsedMs)}
              </div>
              <Button type="button" size="icon" onClick={toggleMic} disabled={sending}>
                <Square className="w-4 h-4" />
              </Button>
            </div>
          ) : (
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Emojis">
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto border-0" align="start">
                <EmojiPicker
                  theme={Theme.AUTO}
                  onEmojiClick={(e) => setText((t) => t + e.emoji)}
                  width={300}
                  height={380}
                />
              </PopoverContent>
            </Popover>
            <StickerPicker onPick={sendSticker} />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button type="button" variant="outline" size="icon" onClick={toggleMic} aria-label="Grabar voz">
              <Mic className="w-4 h-4" />
            </Button>
            <Button type="button" onClick={sendMessage} disabled={sending || !text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          )}
        </div>
      </div>

      {stickerPreview && (
        <AlertDialog open onOpenChange={(o) => !o && setStickerPreview(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sticker</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Quieres agregar este sticker a tu colección?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center justify-center py-4">
              <img src={stickerPreview} alt="sticker" className="w-40 h-40 object-contain" />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              <AlertDialogAction
                disabled={savingSticker}
                onClick={(e) => {
                  e.preventDefault();
                  saveStickerToCollection(stickerPreview);
                }}
              >
                {savingSticker ? "Guardando…" : "Agregar a mi colección"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={!!editMsg} onOpenChange={(o) => !o && setEditMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar mensaje</DialogTitle>
          </DialogHeader>
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMsg(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Racha;

// ===================== Sticker Picker =====================
interface UserSticker { id: string; user_id: string; sticker_url: string; storage_path: string; }

const StickerPicker = ({ onPick }: { onPick: (url: string) => void }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<UserSticker[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_stickers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setStickers((data || []) as UserSticker[]);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const upload = async (files: FileList | null) => {
    if (!user || !files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("stickers").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("stickers").getPublicUrl(path);
        await supabase.from("user_stickers").insert({
          user_id: user.id, sticker_url: publicUrl, storage_path: path,
        });
      }
      toast.success("Stickers cargados");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error subiendo stickers");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (s: UserSticker) => {
    await supabase.storage.from("stickers").remove([s.storage_path]);
    await supabase.from("user_stickers").delete().eq("id", s.id);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Stickers">
          <Sticker className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Tus stickers</p>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            {uploading ? "Subiendo…" : "Subir"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/webp,image/gif,image/jpeg"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
        </div>
        {stickers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Sube tus stickers (PNG/WebP/GIF) y úsalos como en WhatsApp.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {stickers.map((s) => (
              <div key={s.id} className="relative group">
                <button
                  onClick={() => { onPick(s.sticker_url); setOpen(false); }}
                  className="w-full aspect-square rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary"
                >
                  <img src={s.sticker_url} alt="" className="w-full h-full object-contain" />
                </button>
                {s.user_id === user?.id && (
                  <button
                    onClick={() => remove(s)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Eliminar sticker"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
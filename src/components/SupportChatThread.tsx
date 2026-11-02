import { useEffect, useRef, useState } from "react";
import { Send, Mic, Square, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useVoiceRecorder, formatDuration } from "@/lib/voiceRecorder";
import VoiceMessage from "./VoiceMessage";

interface SupportMsg {
  id: string;
  user_id: string;
  sender_id: string;
  is_from_admin: boolean;
  content: string;
  message_type: string;
  audio_url: string | null;
  audio_path: string | null;
  audio_duration_ms: number | null;
  read: boolean;
  created_at: string;
}

export const SupportChatThread = ({
  threadUserId,
  isAdmin = false,
}: {
  threadUserId: string;
  isAdmin?: boolean;
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recorder = useVoiceRecorder();

  const load = async () => {
    const { data } = await supabase
      .from("streak_support_messages")
      .select("*")
      .eq("user_id", threadUserId)
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (data || []) as SupportMsg[];
    setMessages(list);
    // Marca como leídos solo si existen mensajes entrantes no leídos
    if (user) {
      const incomingFromAdmin = !isAdmin ? true : false;
      const hasUnread = list.some((m) => m.is_from_admin === incomingFromAdmin && !m.read);
      if (hasUnread) {
        await supabase
          .from("streak_support_messages")
          .update({ read: true })
          .eq("user_id", threadUserId)
          .eq("is_from_admin", incomingFromAdmin)
          .eq("read", false);
      }
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`support-${threadUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "streak_support_messages", filter: `user_id=eq.${threadUserId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("streak_support_messages").insert({
      user_id: threadUserId,
      sender_id: user.id,
      is_from_admin: isAdmin,
      content: text.trim(),
      message_type: "text",
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar");
      return;
    }
    setText("");
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
      const path = `${user.id}/support-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("voice-notes")
        .upload(path, result.blob, { contentType: result.mimeType });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("voice-notes").getPublicUrl(path);
      const { error } = await supabase.from("streak_support_messages").insert({
        user_id: threadUserId,
        sender_id: user.id,
        is_from_admin: isAdmin,
        content: "",
        message_type: "voice",
        audio_url: publicUrl,
        audio_path: path,
        audio_duration_ms: result.durationMs,
      });
      if (error) throw error;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error de voz");
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {isAdmin ? "Sin mensajes en este chat." : "Escribe tu primer reporte. Un admin te responderá pronto."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {m.message_type === "voice" && m.audio_url ? (
                <VoiceMessage url={m.audio_url} path={m.audio_path} durationMs={m.audio_duration_ms} mine={mine} />
              ) : (
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm break-words ${
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.content}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {m.is_from_admin ? "Admin · " : ""}
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t p-2 flex gap-2 items-center">
        {recorder.recording ? (
          <>
            <Button size="icon" variant="destructive" onClick={() => recorder.cancel()}>
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-sm text-destructive font-mono">
              ● Grabando {formatDuration(recorder.elapsedMs)}
            </div>
            <Button size="icon" onClick={toggleMic} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            </Button>
          </>
        ) : (
          <>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button size="icon" variant="outline" onClick={toggleMic} aria-label="Grabar voz">
              <Mic className="w-4 h-4" />
            </Button>
            <Button size="icon" onClick={send} disabled={sending || !text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SupportChatThread;
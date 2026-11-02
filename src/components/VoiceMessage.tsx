import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatDuration } from "@/lib/voiceRecorder";
import { supabase } from "@/integrations/supabase/client";

export const VoiceMessage = ({
  url,
  path,
  durationMs,
  mine,
}: {
  url?: string | null;
  path?: string | null;
  durationMs?: number | null;
  mine?: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState((durationMs ?? 0) / 1000);
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (path) {
        const { data } = await supabase.storage.from("voice-notes").createSignedUrl(path, 60 * 60);
        if (!cancelled && data?.signedUrl) setSrc(data.signedUrl);
        else if (!cancelled && url) setSrc(url);
      } else if (url) {
        setSrc(url);
      }
    })();
    return () => { cancelled = true; };
  }, [path, url]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const total = duration || (durationMs ?? 0) / 1000 || 0;
  const pct = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[180px] max-w-[260px] ${
        mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      <button onClick={toggle} className="p-1 rounded-full bg-background/20 hover:bg-background/30">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-background/30 rounded-full overflow-hidden">
          <div className="h-full bg-current transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] mt-1 opacity-80">{formatDuration((total - progress) * 1000)}</p>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};

export default VoiceMessage;
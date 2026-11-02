import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import himnoGuiasMayores from "@/assets/himno-guias-mayores.mp3";
import himnoAventureros from "@/assets/himno-aventureros.mp4";
import himnoConquistadores from "@/assets/himno-conquistadores.mp3";

export interface LyricLine {
  time: number;
  text: string;
}

export interface HymnTrack {
  title: string;
  artist?: string;
  audioUrl: string;
  lyrics: LyricLine[];
}

// Pista oficial — voces inician en el segundo 28
const SAMPLE_TRACKS: HymnTrack[] = [
  {
    title: "Himno de los Guías Mayores",
    artist: "Ministerios Juveniles Adventistas",
    audioUrl: himnoGuiasMayores,
    lyrics: [
      { time: 0, text: "♪ Introducción instrumental ♪" },
      // Estrofa 1 (voces desde 0:28 + intro interna 9.5s = 37.5s)
      { time: 37.5, text: "Avancemos sin temor Guías Mayores" },
      { time: 42.5, text: "Investidos con valor" },
      { time: 47.5, text: "Ayudando a los jóvenes que quieren" },
      { time: 52.5, text: "De Jesús en pos seguir" },
      // Coro 1
      { time: 57.5, text: "Anunciando el mensaje a los perdidos" },
      { time: 62.5, text: "Constreñido el corazón" },
      { time: 67.5, text: "Que en el cielo nos espera una corona" },
      { time: 72.5, text: "Con estrellas que Dios nos dará" },
      // Puente instrumental 78.0 → 81.0
      { time: 78, text: "♪ Interludio ♪" },
      // Estrofa 2
      { time: 81, text: "Esta lucha la inició Lutero Warren" },
      { time: 86, text: "Que el pastor Kern prosiguió" },
      { time: 91, text: "Levantando en alto la gloriosa antorcha" },
      { time: 96, text: "Que a este mundo iluminó" },
      // Coro 2
      { time: 101, text: "Aunque densa oscuridad nos amenace" },
      { time: 106, text: "Caminemos sin temor" },
      { time: 111, text: "En la luz que los pioneros encendieron" },
      { time: 116, text: "Para guiarnos por la senda JA" },
      // Repetición final / tag 121.0 → 153.0
      { time: 121, text: "♪ Para guiarnos por la senda JA ♪" },
      // Outro 153.0 → 160.4
      { time: 153, text: "♪ Final ♪" },
    ],
  },
  {
    title: "Himno de los Aventureros",
    artist: "Ministerios Juveniles Adventistas",
    audioUrl: himnoAventureros,
    lyrics: [
      { time: 0, text: "Somos Aventureros alegres" },
      { time: 0, text: "que confían en Cristo Jesús;" },
      { time: 0, text: "aprendemos que siempre debemos" },
      { time: 0, text: "reflejar para el mundo su luz." },
      { time: 0, text: "" },
      { time: 0, text: "Descubrimos en todo belleza" },
      { time: 0, text: "y el amor de un Dios Creador;" },
      { time: 0, text: "y amando a Cristo haremos" },
      { time: 0, text: "maravillas mostrando su amor." },
    ],
  },
  {
    title: "Himno de los Conquistadores",
    artist: "Ministerios Juveniles Adventistas",
    audioUrl: himnoConquistadores,
    lyrics: [
      { time: 0, text: "Soy Conquistador fuerte y fiel," },
      { time: 0, text: "un siervo de Dios yo soy." },
      { time: 0, text: "Fieles marcharemos ¡sí!" },
      { time: 0, text: "por la senda del deber." },
      { time: 0, text: "" },
      { time: 0, text: "Mensaje tenemos que dar," },
      { time: 0, text: "verdad que libertará:" },
      { time: 0, text: "muy pronto el Señor Jesús" },
      { time: 0, text: "vendrá por ti, por mí." },
    ],
  },
];

interface HymnPlayerProps {
  open: boolean;
  onClose: () => void;
  hymnTitle?: string;
}

const HymnPlayer = ({ open, onClose, hymnTitle }: HymnPlayerProps) => {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const track = SAMPLE_TRACKS[trackIndex];

  // Select track based on hymnTitle when it changes
  useEffect(() => {
    if (!hymnTitle) return;
    const t = hymnTitle.toLowerCase();
    const idx = SAMPLE_TRACKS.findIndex((tr) => {
      const title = tr.title.toLowerCase();
      if (t.includes("aventur")) return title.includes("aventur");
      if (t.includes("conquist")) return title.includes("conquist");
      return title.includes("guías") || title.includes("guias");
    });
    if (idx >= 0) setTrackIndex(idx);
  }, [hymnTitle, open]);

  // Update only progress/time (lyrics are NOT synced with audio anymore)
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (open) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open]);

  // Reset when closed
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [open]);

  // Reload audio element when track changes so the new src is fetched
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audio.load();
  }, [trackIndex]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (shuffle) {
      setTrackIndex(Math.floor(Math.random() * SAMPLE_TRACKS.length));
    } else {
      setTrackIndex((i) => (i - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length);
    }
  };

  const handleNext = () => {
    if (shuffle) {
      setTrackIndex(Math.floor(Math.random() * SAMPLE_TRACKS.length));
    } else {
      setTrackIndex((i) => (i + 1) % SAMPLE_TRACKS.length);
    }
  };

  const handleEnded = () => {
    if (repeat) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    } else {
      handleNext();
    }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-3xl h-[90vh] p-0 gap-0 border-0 overflow-hidden flex flex-col"
        style={{ background: "hsl(222 60% 8%)" }}
      >
        <audio
          ref={audioRef}
          key={track.audioUrl}
          src={track.audioUrl}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">Reproduciendo</p>
            <h2 className="text-lg font-bold text-white">{hymnTitle || track.title}</h2>
            {track.artist && <p className="text-xs text-white/60">{track.artist}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Lyrics */}
        <div
          ref={lyricsContainerRef}
          className="flex-1 overflow-y-auto px-6 py-16 scroll-smooth"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.2) transparent",
          }}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {track.lyrics.map((line, i) => (
              <p
                key={i}
                className="block w-full text-left rounded-lg px-3 py-2 text-white/90 text-xl font-medium leading-relaxed"
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>

        {/* Player controls */}
        <div className="border-t border-white/10 px-6 py-4 space-y-3" style={{ background: "hsl(222 65% 6%)" }}>
          {/* Progress bar */}
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span>{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                handleSeek(pct * duration);
              }}
            >
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShuffle((s) => !s)}
              className={cn("text-white/60 hover:bg-white/10", shuffle && "text-white")}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrev} className="text-white hover:bg-white/10">
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              onClick={togglePlay}
              className="h-12 w-12 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="text-white hover:bg-white/10">
              <SkipForward className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRepeat((r) => !r)}
              className={cn("text-white/60 hover:bg-white/10", repeat && "text-white")}
            >
              <Repeat className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HymnPlayer;
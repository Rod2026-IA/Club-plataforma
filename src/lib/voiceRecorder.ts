import { useRef, useState, useCallback } from "react";

export interface VoiceRecorderState {
  recording: boolean;
  elapsedMs: number;
  start: () => Promise<void>;
  stop: () => Promise<{ blob: Blob; durationMs: number; mimeType: string } | null>;
  cancel: () => void;
}

export function useVoiceRecorder(): VoiceRecorderState {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const cleanup = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];
  };

  const start = useCallback(async () => {
    if (recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start();
    mediaRef.current = mr;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setRecording(true);
    tickRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
  }, [recording]);

  const stop = useCallback(async () => {
    const mr = mediaRef.current;
    if (!mr) return null;
    return new Promise<{ blob: Blob; durationMs: number; mimeType: string } | null>((resolve) => {
      mr.onstop = () => {
        const dur = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        cleanup();
        setRecording(false);
        setElapsedMs(0);
        resolve({ blob, durationMs: dur, mimeType: mr.mimeType });
      };
      mr.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = () => {
        cleanup();
      };
      mr.stop();
    } else {
      cleanup();
    }
    setRecording(false);
    setElapsedMs(0);
  }, []);

  return { recording, elapsedMs, start, stop, cancel };
}

export const formatDuration = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
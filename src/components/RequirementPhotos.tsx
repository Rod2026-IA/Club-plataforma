import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PhotoRow } from "@/hooks/useGuiaMayorData";

interface Props {
  photos: PhotoRow[];
  onUpload: (file: File) => Promise<void> | void;
  onDelete: (photo: PhotoRow) => Promise<void> | void;
  compact?: boolean;
  readOnly?: boolean;
}

const RequirementPhotos = ({ photos, onUpload, onDelete, compact, readOnly }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(0, photos.length - 1));
  const current = photos[safeIndex];

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      setIndex(photos.length); // saltar al recién subido
    } finally {
      setUploading(false);
    }
  };

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  return (
    <div className={`mt-2 rounded-xl border border-border/60 bg-muted/30 p-2 ${compact ? "" : ""}`}>
      {photos.length > 0 ? (
        <div className="relative w-full overflow-hidden rounded-lg bg-background/40">
          <div className="relative w-full aspect-video">
            <a href={current?.photo_url} target="_blank" rel="noreferrer">
              <img
                src={current?.photo_url}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
              />
            </a>
            {!readOnly && current && (
              <button
                onClick={() => onDelete(current)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive transition"
                title="Eliminar foto"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/70 hover:bg-background text-foreground"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/70 hover:bg-background text-foreground"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition ${
                        i === safeIndex ? "bg-primary" : "bg-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="absolute top-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-background/70 text-foreground">
                  {safeIndex + 1}/{photos.length}
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center py-3">Sin fotos aún</p>
      )}

      {!readOnly && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handle(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handle(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={uploading}
              onClick={() => camRef.current?.click()}
              className="flex-1 h-8 text-xs"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> Tomar foto
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex-1 h-8 text-xs"
            >
              <ImagePlus className="w-3.5 h-3.5 mr-1.5" /> Subir
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default RequirementPhotos;
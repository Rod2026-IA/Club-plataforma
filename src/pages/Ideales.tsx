import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Image as ImageIcon, Sparkles, Music2, Play, GripVertical } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import HymnPlayer from "@/components/HymnPlayer";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmptyState from "@/components/EmptyState";
import { Star } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Category = "guias_mayores" | "conquistadores" | "aventureros";

interface Ideal {
  id: string;
  category: Category;
  title: string;
  body: string;
  icon_url: string | null;
  display_order: number;
}

const CATEGORIES: { key: Category; label: string; glow: string }[] = [
  { key: "guias_mayores", label: "Guías Mayores", glow: "neon-glow-cyan" },
  { key: "conquistadores", label: "Conquistadores", glow: "neon-glow-pink" },
  { key: "aventureros", label: "Aventureros", glow: "neon-glow-green" },
];

const Ideales = () => {
  const { role } = useAuth();
  const canEdit = ["super_admin", "director", "subdirector"].includes(role || "");

  const [ideales, setIdeales] = useState<Ideal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category>("guias_mayores");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ideal | null>(null);
  const [form, setForm] = useState({ title: "", body: "", icon_url: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerTitle, setPlayerTitle] = useState<string>("");
  const [detailIdeal, setDetailIdeal] = useState<Ideal | null>(null);

  const fetchIdeales = async () => {
    const { data, error } = await supabase
      .from("ideales")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast.error("Error al cargar ideales");
    } else {
      setIdeales((data || []) as Ideal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIdeales();
    const channel = supabase
      .channel("ideales-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ideales" }, () => fetchIdeales())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", body: "", icon_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (ideal: Ideal) => {
    setEditing(ideal);
    setForm({ title: ideal.title, body: ideal.body, icon_url: ideal.icon_url || "" });
    setDialogOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${activeTab}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ideales-icons").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Error al subir el ícono");
    } else {
      const { data } = supabase.storage.from("ideales-icons").getPublicUrl(path);
      setForm((f) => ({ ...f, icon_url: data.publicUrl }));
      toast.success("Ícono subido");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("ideales")
        .update({ title: form.title, body: form.body, icon_url: form.icon_url })
        .eq("id", editing.id);
      if (error) toast.error("Error al actualizar");
      else toast.success("Ideal actualizado");
    } else {
      const max = Math.max(0, ...ideales.filter((i) => i.category === activeTab).map((i) => i.display_order));
      const { error } = await supabase.from("ideales").insert({
        category: activeTab,
        title: form.title,
        body: form.body,
        icon_url: form.icon_url,
        display_order: max + 1,
      });
      if (error) toast.error("Error al crear");
      else toast.success("Ideal creado");
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("ideales").delete().eq("id", deleteId);
    if (error) toast.error("Error al eliminar");
    else toast.success("Ideal eliminado");
    setDeleteId(null);
  };

  const isHymn = (title: string) => title.trim().toLowerCase().startsWith("himno");

  const openPlayer = (title: string) => {
    // Compose with active category so the player picks the right track
    // even if the ideal title doesn't include the keyword
    const catLabel =
      activeTab === "aventureros" ? "aventureros" :
      activeTab === "conquistadores" ? "conquistadores" : "guias mayores";
    setPlayerTitle(`${title} — ${catLabel}`);
    setPlayerOpen(true);
  };

  const openDetail = (ideal: Ideal) => {
    setDetailIdeal(ideal);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (cat: Category, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = ideales.filter((i) => i.category === cat).sort((a, b) => a.display_order - b.display_order);
    const oldIndex = list.findIndex((i) => i.id === active.id);
    const newIndex = list.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    // optimistic update
    const others = ideales.filter((i) => i.category !== cat);
    const updated = reordered.map((it, idx) => ({ ...it, display_order: idx + 1 }));
    setIdeales([...others, ...updated]);
    // persist
    const updates = await Promise.all(
      updated.map((it) =>
        supabase.from("ideales").update({ display_order: it.display_order }).eq("id", it.id)
      )
    );
    if (updates.some((r) => r.error)) {
      toast.error("Error al guardar el nuevo orden");
      fetchIdeales();
    } else {
      toast.success("Orden actualizado");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Ideales" subtitle="Voto, Blanco, Lema e Himno" />

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="text-xs sm:text-sm">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => {
            const list = ideales.filter((i) => i.category === cat.key);
            return (
              <TabsContent key={cat.key} value={cat.key} className="space-y-4">
                {canEdit && (
                  <Button onClick={openCreate} className={`w-full ${cat.glow}`}>
                    <Plus className="w-4 h-4" /> Añadir ideal a {cat.label}
                  </Button>
                )}

                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Cargando...</p>
                ) : list.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title="Sin ideales registrados"
                    description="Los ideales de este grupo aparecerán aquí cuando sean agregados."
                  />
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(cat.key, e)}
                  >
                    <SortableContext items={list.map((i) => i.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map((ideal, i) => (
                          <SortableIdealCard
                            key={ideal.id}
                            ideal={ideal}
                            index={i}
                            glow={cat.glow}
                            canEdit={canEdit}
                            isHymn={isHymn(ideal.title)}
                            onEdit={() => openEdit(ideal)}
                            onDelete={() => setDeleteId(ideal.id)}
                            onPlay={() => openPlayer(ideal.title)}
                            onOpen={() => openDetail(ideal)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ideal" : "Nuevo ideal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Cuerpo de texto</Label>
              <Textarea
                rows={6}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div>
              <Label>Ícono</Label>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                  {form.icon_url ? (
                    <img src={form.icon_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                  <span className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent">
                    {uploading ? "Subiendo..." : "Subir ícono"}
                  </span>
                </label>
                {form.icon_url && (
                  <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, icon_url: "" })}>
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este ideal?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HymnPlayer
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        hymnTitle={playerTitle}
      />

      <Dialog open={!!detailIdeal} onOpenChange={(o) => !o && setDetailIdeal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-3">
              {detailIdeal?.icon_url ? (
                <img
                  src={detailIdeal.icon_url}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : detailIdeal && isHymn(detailIdeal.title) ? (
                <Music2 className="w-6 h-6 text-primary" />
              ) : (
                <Sparkles className="w-6 h-6 text-primary" />
              )}
              <span>{detailIdeal?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] px-6 pb-4">
            <p className="text-base text-foreground font-body leading-relaxed whitespace-pre-wrap py-2">
              {detailIdeal?.body}
            </p>
          </ScrollArea>
          {detailIdeal && isHymn(detailIdeal.title) && (
            <div className="px-6 pb-6">
              <Button
                onClick={() => {
                  openPlayer(detailIdeal.title);
                  setDetailIdeal(null);
                }}
                className="w-full"
              >
                <Play className="w-4 h-4" /> Reproducir himno
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ideales;

interface SortableIdealCardProps {
  ideal: Ideal;
  index: number;
  glow: string;
  canEdit: boolean;
  isHymn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPlay: () => void;
  onOpen: () => void;
}

const SortableIdealCard = ({
  ideal,
  index,
  glow,
  canEdit,
  isHymn,
  onEdit,
  onDelete,
  onPlay,
  onOpen,
}: SortableIdealCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ideal.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onOpen}
      className="glass-card rounded-2xl p-5 space-y-3 relative group cursor-pointer hover:scale-[1.01] transition-transform"
    >
      {canEdit && (
        <>
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 left-3 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing touch-none"
            aria-label="Reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </>
      )}
      <div className={`w-14 h-14 rounded-2xl gradient-neon flex items-center justify-center overflow-hidden ${glow}`}>
        {ideal.icon_url ? (
          <img src={ideal.icon_url} alt={ideal.title} className="w-full h-full object-cover" />
        ) : isHymn ? (
          <Music2 className="w-7 h-7 text-primary-foreground" />
        ) : (
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        )}
      </div>
      <h2 className="text-lg font-bold text-foreground">{ideal.title}</h2>
      {ideal.body && (
        <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-4">
          {ideal.body}
        </p>
      )}
      {isHymn && (
        <Button onClick={(e) => { e.stopPropagation(); onPlay(); }} className={`w-full mt-2 ${glow}`} size="sm">
          <Play className="w-4 h-4" /> Reproducir himno
        </Button>
      )}
    </motion.div>
  );
};

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLASS_DATA, type CardType, type ClassId } from "@/data/classCardsData";
import type { Section, CompletionInfo } from "@/data/guiaMayorData";
import { toast } from "sonner";

export interface PhotoRow {
  id: string;
  section_id: string;
  req_id: string;
  sub_id: string;
  photo_url: string;
  storage_path: string;
}

const photoKey = (sectionId: string, reqId: string, subId?: string) =>
  `${sectionId}::${reqId}::${subId || ""}`;

export function useClassCardData(
  targetUserId: string | null,
  classId: ClassId,
  cardType: CardType
) {
  const initial = CLASS_DATA[classId][cardType];
  const [sections, setSections] = useState<Section[]>(initial);
  const [photosMap, setPhotosMap] = useState<Record<string, PhotoRow[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    const base = CLASS_DATA[classId][cardType];

    const [progressRes, photosRes] = await Promise.all([
      supabase
        .from("class_card_progress")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("class_id", classId)
        .eq("card_type", cardType),
      supabase
        .from("class_card_photos")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("class_id", classId)
        .eq("card_type", cardType),
    ]);

    const map = new Map<string, any>();
    (progressRes.data || []).forEach((r: any) =>
      map.set(`${r.section_id}::${r.req_id}::${r.sub_id || ""}`, r)
    );

    const merged = base.map((sec) => ({
      ...sec,
      requirements: sec.requirements.map((r) => {
        const row = map.get(`${sec.id}::${r.id}::`);
        return {
          ...r,
          completed: row?.completed || false,
          completionInfo: row?.completed
            ? { date: row.completion_date || "", instructor: row.instructor || "" }
            : undefined,
        };
      }),
    }));
    setSections(merged);

    const pMap: Record<string, PhotoRow[]> = {};
    (photosRes.data || []).forEach((p: any) => {
      const k = photoKey(p.section_id, p.req_id, p.sub_id);
      (pMap[k] = pMap[k] || []).push(p);
    });
    setPhotosMap(pMap);
    setLoading(false);
  }, [targetUserId, classId, cardType]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertProgress = async (
    sectionId: string,
    reqId: string,
    subId: string,
    completed: boolean,
    info?: CompletionInfo
  ) => {
    if (!targetUserId) return;
    const { error } = await supabase
      .from("class_card_progress")
      .upsert(
        {
          user_id: targetUserId,
          class_id: classId,
          card_type: cardType,
          section_id: sectionId,
          req_id: reqId,
          sub_id: subId || "",
          completed,
          completion_date: info?.date || null,
          instructor: info?.instructor || null,
        },
        { onConflict: "user_id,class_id,card_type,section_id,req_id,sub_id" }
      );
    if (error) {
      toast.error("Error al guardar: " + error.message);
      return;
    }
    await load();
  };

  const uploadPhoto = async (
    sectionId: string,
    reqId: string,
    subId: string | undefined,
    file: File
  ) => {
    if (!targetUserId) return;
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${targetUserId}/${classId}/${cardType}/${sectionId}/${reqId}/${subId || "main"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("class-cards").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("class-cards").getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("class_card_photos").insert({
        user_id: targetUserId,
        class_id: classId,
        card_type: cardType,
        section_id: sectionId,
        req_id: reqId,
        sub_id: subId || "",
        photo_url: publicUrl,
        storage_path: path,
        uploaded_by: user?.id,
      });
      if (insErr) throw insErr;
      toast.success("Foto guardada");
      await load();
    } catch (e: any) {
      toast.error("Error al subir foto: " + e.message);
    }
  };

  const deletePhoto = async (photo: PhotoRow) => {
    try {
      await supabase.storage.from("class-cards").remove([photo.storage_path]);
      await supabase.from("class_card_photos").delete().eq("id", photo.id);
      toast.success("Foto eliminada");
      await load();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return { sections, photosMap, loading, upsertProgress, uploadPhoto, deletePhoto, photoKey, reload: load };
}
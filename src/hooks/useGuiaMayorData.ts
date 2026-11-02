import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initialSections, type Section, type CompletionInfo } from "@/data/guiaMayorData";
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

export function useGuiaMayorData(targetUserId: string | null) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [photosMap, setPhotosMap] = useState<Record<string, PhotoRow[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    const [progressRes, photosRes] = await Promise.all([
      supabase.from("guia_mayor_progress").select("*").eq("user_id", targetUserId),
      supabase.from("guia_mayor_photos").select("*").eq("user_id", targetUserId),
    ]);

    const progressRows = progressRes.data || [];
    const progressMap = new Map<string, any>();
    progressRows.forEach((r: any) => {
      progressMap.set(`${r.section_id}::${r.req_id}::${r.sub_id || ""}`, r);
    });

    const merged = initialSections.map((sec) => ({
      ...sec,
      requirements: sec.requirements.map((r) => {
        const reqRow = progressMap.get(`${sec.id}::${r.id}::`);
        return {
          ...r,
          completed: reqRow?.completed || false,
          completionInfo: reqRow?.completed
            ? { date: reqRow.completion_date || "", instructor: reqRow.instructor || "" }
            : undefined,
          selectedShareOptions: reqRow?.share_options || r.selectedShareOptions || [],
          subitems: r.subitems?.map((s) => {
            const subRow = progressMap.get(`${sec.id}::${r.id}::${s.id}`);
            return {
              ...s,
              completed: subRow?.completed || false,
              completionInfo: subRow?.completed
                ? { date: subRow.completion_date || "", instructor: subRow.instructor || "" }
                : undefined,
            };
          }),
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
  }, [targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertProgress = async (
    sectionId: string,
    reqId: string,
    subId: string,
    completed: boolean,
    info?: CompletionInfo,
    shareOptions?: string[]
  ) => {
    if (!targetUserId) return;
    const payload: any = {
      user_id: targetUserId,
      section_id: sectionId,
      req_id: reqId,
      sub_id: subId || "",
      completed,
      completion_date: info?.date || null,
      instructor: info?.instructor || null,
    };
    if (shareOptions !== undefined) payload.share_options = shareOptions;

    const { error } = await supabase
      .from("guia_mayor_progress")
      .upsert(payload, { onConflict: "user_id,section_id,req_id,sub_id" });
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
      const path = `${targetUserId}/${sectionId}/${reqId}/${subId || "main"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("guia-mayor").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("guia-mayor").getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("guia_mayor_photos").insert({
        user_id: targetUserId,
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
      await supabase.storage.from("guia-mayor").remove([photo.storage_path]);
      await supabase.from("guia_mayor_photos").delete().eq("id", photo.id);
      toast.success("Foto eliminada");
      await load();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return { sections, photosMap, loading, upsertProgress, uploadPhoto, deletePhoto, photoKey, reload: load };
}

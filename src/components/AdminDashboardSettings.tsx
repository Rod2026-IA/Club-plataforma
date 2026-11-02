import { useState, useRef, useEffect } from "react";
import { Settings, Upload, Eye, EyeOff, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DashboardSetting {
  id: string;
  section_key: string;
  enabled: boolean;
  custom_icon_url: string;
  audience: "aspirante" | "investido";
}

interface Props {
  settings: DashboardSetting[];
  onSettingsUpdated: () => void;
}

const sectionLabels: Record<string, string> = {
  "guia-mayor": "Tarjeta de Guía Mayor",
  "clases-progresivas": "Clases Progresivas",
  "clases-avanzadas": "Clases Avanzadas",
  "ano-biblico": "Año Bíblico",
  "mi-unidad": "Mi Unidad",
  "ideales": "Ideales",
  "conqui-kash": "Conqui Kash",
};

const AdminDashboardSettings = ({ settings, onSettingsUpdated }: Props) => {
  const { role, user } = useAuth();
  const { branding, refresh: refreshBranding } = usePlatformBranding();
  const [localSettings, setLocalSettings] = useState<DashboardSetting[]>(settings);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"aspirante" | "investido">("aspirante");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const brandingFileRef = useRef<HTMLInputElement | null>(null);
  const [brandName, setBrandName] = useState(branding.name);
  const [brandDesc, setBrandDesc] = useState(branding.description);
  const [brandIcon, setBrandIcon] = useState(branding.icon_url);
  const [welcomeEnabled, setWelcomeEnabled] = useState(branding.welcome_enabled);
  const [uploadingBrand, setUploadingBrand] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setBrandName(branding.name);
    setBrandDesc(branding.description);
    setBrandIcon(branding.icon_url);
    setWelcomeEnabled(branding.welcome_enabled);
  }, [branding.name, branding.description, branding.icon_url, branding.welcome_enabled]);

  const isSuperAdmin = role === "super_admin";
  const canToggle = ["super_admin", "director", "subdirector"].includes(role || "");

  if (!canToggle) return null;

  const handleToggle = (id: string, enabled: boolean) => {
    setLocalSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s))
    );
  };

  const handleBrandIconUpload = async (file: File) => {
    setUploadingBrand(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `platform/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("icons").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("icons").getPublicUrl(path);
      setBrandIcon(publicUrl);
      toast({ title: "Ícono cargado" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploadingBrand(false);
    }
  };

  const handleIconUpload = async (id: string, key: string, file: File) => {
    if (!user) return;
    try {
      const ext = file.name.split(".").pop();
      const path = `${key}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("icons").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("icons").getPublicUrl(path);
      setLocalSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, custom_icon_url: publicUrl } : s))
      );
      toast({ title: "Ícono subido" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of localSettings) {
        await supabase
          .from("dashboard_settings")
          .update({ enabled: s.enabled, custom_icon_url: s.custom_icon_url })
          .eq("id", s.id);
      }
      // Save platform branding (single row)
      if (branding.id) {
        await supabase
          .from("platform_branding")
          .update({ name: brandName.trim() || "ConquiControl", description: brandDesc.trim(), icon_url: brandIcon, welcome_enabled: welcomeEnabled })
          .eq("id", branding.id);
      } else {
        await supabase
          .from("platform_branding")
          .insert({ name: brandName.trim() || "ConquiControl", description: brandDesc.trim(), icon_url: brandIcon, welcome_enabled: welcomeEnabled });
      }
      await refreshBranding();
      toast({ title: "Configuración guardada" });
      onSettingsUpdated();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-border/50 bg-card/50 backdrop-blur-sm">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Panel</DialogTitle>
        </DialogHeader>
        {isSuperAdmin && (
          <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/20">
            <p className="text-sm font-semibold text-foreground">Identidad de la plataforma</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {brandIcon ? (
                  <img src={brandIcon} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin ícono</span>
                )}
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => brandingFileRef.current?.click()}
                  disabled={uploadingBrand}
                >
                  <Upload className="w-3 h-3 inline mr-1" />
                  {uploadingBrand ? "Subiendo…" : "Cambiar ícono"}
                </button>
                <input
                  ref={brandingFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBrandIconUpload(f);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="ConquiControl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} placeholder="Plataforma de Control de Actividades" className="min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Mensaje de bienvenida diaria</p>
                <p className="text-xs text-muted-foreground">Mostrar el sobre animado al iniciar sesión cada día.</p>
              </div>
              <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} />
            </div>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="aspirante">Aspirantes GM</TabsTrigger>
            <TabsTrigger value="investido">GM Investidos</TabsTrigger>
          </TabsList>
          {(["aspirante", "investido"] as const).map((aud) => (
            <TabsContent key={aud} value={aud} className="space-y-3 max-h-[55vh] overflow-y-auto mt-3">
              {localSettings
                .filter((s) => s.audience === aud)
                .map((s) => {
                  const refKey = `${s.audience}-${s.section_key}`;
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {s.custom_icon_url ? (
                          <img src={s.custom_icon_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sectionLabels[s.section_key] || s.section_key}
                        </p>
                        {isSuperAdmin && (
                          <>
                            <button
                              className="text-xs text-primary hover:underline mt-0.5"
                              onClick={() => fileRefs.current[refKey]?.click()}
                            >
                              <Upload className="w-3 h-3 inline mr-1" />
                              Cambiar ícono
                            </button>
                            <input
                              ref={(el) => { fileRefs.current[refKey] = el; }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleIconUpload(s.id, s.section_key, f);
                              }}
                            />
                          </>
                        )}
                      </div>
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={(v) => handleToggle(s.id, v)}
                      />
                    </div>
                  );
                })}
            </TabsContent>
          ))}
        </Tabs>
        <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDashboardSettings;

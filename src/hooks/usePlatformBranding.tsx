import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformBranding {
  id?: string;
  name: string;
  description: string;
  icon_url: string;
  welcome_enabled: boolean;
}

const DEFAULTS: PlatformBranding = {
  name: "ConquiControl",
  description: "Plataforma de Control de Actividades",
  icon_url: "",
  welcome_enabled: true,
};

interface Ctx {
  branding: PlatformBranding;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<Ctx>({ branding: DEFAULTS, loading: true, refresh: async () => {} });

export const PlatformBrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<PlatformBranding>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Race the request against a timeout so a slow/504 backend never freezes the UI.
      const fetchPromise = supabase
        .from("platform_branding")
        .select("id,name,description,icon_url,welcome_enabled")
        .limit(1)
        .maybeSingle();
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 6000)
      );
      const { data } = (await Promise.race([fetchPromise, timeoutPromise])) as any;
      if (data) {
        setBranding({
          id: data.id,
          name: data.name,
          description: data.description,
          icon_url: data.icon_url || "",
          welcome_enabled: (data as any).welcome_enabled ?? true,
        });
      }
    } catch (e) {
      // Silent fallback to defaults — never block the app on branding.
      console.warn("platform_branding fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (branding.name) document.title = branding.name;
  }, [branding.name]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const usePlatformBranding = () => useContext(BrandingContext);

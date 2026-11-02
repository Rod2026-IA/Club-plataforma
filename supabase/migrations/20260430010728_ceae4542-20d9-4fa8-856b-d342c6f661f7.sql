CREATE TABLE public.platform_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'ConquiControl',
  description text NOT NULL DEFAULT 'Plataforma de Control de Actividades',
  icon_url text NOT NULL DEFAULT '',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view branding"
ON public.platform_branding FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert branding"
ON public.platform_branding FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
  OR has_role(auth.uid(), 'subdirector'::app_role)
);

CREATE POLICY "Admins can update branding"
ON public.platform_branding FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
  OR has_role(auth.uid(), 'subdirector'::app_role)
);

CREATE TRIGGER update_platform_branding_updated_at
BEFORE UPDATE ON public.platform_branding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_branding (name, description, icon_url) VALUES ('ConquiControl', 'Plataforma de Control de Actividades', '');
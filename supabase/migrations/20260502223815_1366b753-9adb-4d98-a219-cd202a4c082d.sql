
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-logos', 'unit-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view unit logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'unit-logos');

CREATE POLICY "Admins can upload unit logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'unit-logos' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'director'::app_role) OR
    public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

CREATE POLICY "Admins can update unit logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'unit-logos' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'director'::app_role) OR
    public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

CREATE POLICY "Admins can delete unit logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'unit-logos' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'director'::app_role) OR
    public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

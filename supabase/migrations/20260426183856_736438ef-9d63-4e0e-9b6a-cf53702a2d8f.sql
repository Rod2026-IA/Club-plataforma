
-- 1. Progress table
CREATE TABLE IF NOT EXISTS public.guia_mayor_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  req_id TEXT NOT NULL,
  sub_id TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  completion_date DATE,
  instructor TEXT,
  share_options TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_id, req_id, sub_id)
);

ALTER TABLE public.guia_mayor_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own gm progress" ON public.guia_mayor_progress
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

CREATE POLICY "Users insert own gm progress" ON public.guia_mayor_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

CREATE POLICY "Users update own gm progress" ON public.guia_mayor_progress
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

CREATE POLICY "Users delete own gm progress" ON public.guia_mayor_progress
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

CREATE TRIGGER update_gm_progress_updated_at
  BEFORE UPDATE ON public.guia_mayor_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Photos table
CREATE TABLE IF NOT EXISTS public.guia_mayor_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  req_id TEXT NOT NULL,
  sub_id TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gm_photos_user ON public.guia_mayor_photos(user_id, section_id, req_id, sub_id);

ALTER TABLE public.guia_mayor_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own gm photos" ON public.guia_mayor_photos
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

CREATE POLICY "Users insert own gm photos" ON public.guia_mayor_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

CREATE POLICY "Users delete own gm photos" ON public.guia_mayor_photos
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'subdirector'::app_role)
  );

-- 3. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('guia-mayor', 'guia-mayor', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (files are stored under {user_id}/...)
CREATE POLICY "GM photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guia-mayor');

CREATE POLICY "GM photos owner or admin can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'guia-mayor'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'subdirector'::app_role)
    )
  );

CREATE POLICY "GM photos owner or admin can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'guia-mayor'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'subdirector'::app_role)
    )
  );

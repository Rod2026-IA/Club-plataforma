
-- Add avatar and banner to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';

-- Dashboard settings table
CREATE TABLE public.dashboard_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  custom_icon_url TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view dashboard settings"
  ON public.dashboard_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage dashboard settings"
  ON public.dashboard_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'director'::app_role) OR has_role(auth.uid(), 'subdirector'::app_role));

-- Seed default settings for each section
INSERT INTO public.dashboard_settings (section_key, enabled) VALUES
  ('guia-mayor', true),
  ('clases-progresivas', true),
  ('clases-avanzadas', true),
  ('ano-biblico', true),
  ('mi-unidad', true),
  ('ideales', true),
  ('conqui-kash', true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('icons', 'icons', true);

-- Avatars policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Banners policies
CREATE POLICY "Banner images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Users can upload their own banner" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own banner" ON storage.objects FOR UPDATE USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own banner" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Icons policies (only super_admin)
CREATE POLICY "Icon images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'icons');
CREATE POLICY "Super admin can upload icons" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'icons' AND public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can update icons" ON storage.objects FOR UPDATE USING (bucket_id = 'icons' AND public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can delete icons" ON storage.objects FOR DELETE USING (bucket_id = 'icons' AND public.has_role(auth.uid(), 'super_admin'::app_role));

-- Enable realtime on evaluations
ALTER PUBLICATION supabase_realtime ADD TABLE public.evaluations;

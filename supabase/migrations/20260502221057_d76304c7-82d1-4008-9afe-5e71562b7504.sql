
-- Create tables for Class Cards (Amigo, Compañero, Explorador, Orientador, Viajero, Guía)
-- Reuses the same pattern as guia_mayor_progress / guia_mayor_photos

CREATE TABLE public.class_card_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id TEXT NOT NULL,            -- amigo | companero | explorador | orientador | viajero | guia
  card_type TEXT NOT NULL,           -- progresiva | avanzada
  section_id TEXT NOT NULL,
  req_id TEXT NOT NULL,
  sub_id TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  completion_date DATE,
  instructor TEXT,
  share_options TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_id, card_type, section_id, req_id, sub_id)
);

ALTER TABLE public.class_card_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own class progress"
ON public.class_card_progress FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

CREATE POLICY "Users insert own class progress"
ON public.class_card_progress FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

CREATE POLICY "Users update own class progress"
ON public.class_card_progress FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

CREATE POLICY "Users delete own class progress"
ON public.class_card_progress FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

CREATE TRIGGER update_class_card_progress_updated_at
BEFORE UPDATE ON public.class_card_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.class_card_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id TEXT NOT NULL,
  card_type TEXT NOT NULL,
  section_id TEXT NOT NULL,
  req_id TEXT NOT NULL,
  sub_id TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.class_card_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own class photos"
ON public.class_card_photos FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

CREATE POLICY "Users insert own class photos"
ON public.class_card_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

CREATE POLICY "Users delete own class photos"
ON public.class_card_photos FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'director') OR has_role(auth.uid(),'subdirector'));

-- Storage bucket for class card photos
INSERT INTO storage.buckets (id, name, public) VALUES ('class-cards','class-cards', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read class cards"
ON storage.objects FOR SELECT
USING (bucket_id = 'class-cards');

CREATE POLICY "Users upload to class cards"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'class-cards');

CREATE POLICY "Users delete own class cards"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'class-cards');

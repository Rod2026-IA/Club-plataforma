
CREATE TYPE public.ideal_category AS ENUM ('guias_mayores', 'conquistadores', 'aventureros');

CREATE TABLE public.ideales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category public.ideal_category NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  icon_url TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ideales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ideales"
ON public.ideales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ideales"
ON public.ideales FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'director'::app_role)
  OR public.has_role(auth.uid(), 'subdirector'::app_role)
);

CREATE TRIGGER update_ideales_updated_at
BEFORE UPDATE ON public.ideales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('ideales-icons', 'ideales-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ideales icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'ideales-icons');

CREATE POLICY "Admins upload ideales icons"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ideales-icons' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

CREATE POLICY "Admins update ideales icons"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ideales-icons' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

CREATE POLICY "Admins delete ideales icons"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ideales-icons' AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

INSERT INTO public.ideales (category, title, body, display_order) VALUES
('guias_mayores', 'Voto', 'Por amor al Señor Jesús, prometo tomar parte activa en la obra de los Ministerios Juveniles Adventistas, haciendo cuanto pueda para ayudar a otros, y para terminar la obra del evangelio en todo el mundo.', 1),
('guias_mayores', 'Blanco', 'El mensaje del advenimiento a todo el mundo en mi generación.', 2),
('guias_mayores', 'Lema', 'El amor de Cristo me motiva.', 3),
('guias_mayores', 'Himno', 'Avancemos sin temor Guías Mayores, investidos con valor, ayudando a los jóvenes que quieren de Jesús en pos seguir...', 4);

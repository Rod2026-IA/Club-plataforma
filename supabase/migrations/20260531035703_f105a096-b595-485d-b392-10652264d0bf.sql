
CREATE TABLE public.user_class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track text NOT NULL CHECK (track IN ('progresiva','avanzada','guia_mayor')),
  class_id text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_class_enrollments TO authenticated;
GRANT ALL ON public.user_class_enrollments TO service_role;

ALTER TABLE public.user_class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view enrollments"
  ON public.user_class_enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage enrollments insert"
  ON public.user_class_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'director'::app_role)
    OR has_role(auth.uid(),'subdirector'::app_role)
  );

CREATE POLICY "Admins manage enrollments update"
  ON public.user_class_enrollments FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'director'::app_role)
    OR has_role(auth.uid(),'subdirector'::app_role)
  );

CREATE POLICY "Admins manage enrollments delete"
  ON public.user_class_enrollments FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'director'::app_role)
    OR has_role(auth.uid(),'subdirector'::app_role)
  );

CREATE TRIGGER trg_user_class_enrollments_updated
  BEFORE UPDATE ON public.user_class_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

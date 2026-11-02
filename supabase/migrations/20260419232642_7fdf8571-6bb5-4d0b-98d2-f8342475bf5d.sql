
-- Add registered_by and total_score
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS registered_by uuid,
  ADD COLUMN IF NOT EXISTS total_score integer NOT NULL DEFAULT 0;

-- Auto-compute total_score
CREATE OR REPLACE FUNCTION public.compute_evaluation_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_score := COALESCE(NEW.asistencia,0) + COALESCE(NEW.puntualidad,0) + COALESCE(NEW.cuota,0)
                   + COALESCE(NEW.matutina,0) + COALESCE(NEW.tareas,0) + COALESCE(NEW.uniforme,0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluations_compute_total ON public.evaluations;
CREATE TRIGGER evaluations_compute_total
BEFORE INSERT OR UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.compute_evaluation_total();

-- Prevent duplicates per user/date
CREATE UNIQUE INDEX IF NOT EXISTS evaluations_user_date_unique
  ON public.evaluations (user_id, evaluation_date);

-- Helper: is user captain or secretary of a given unit
CREATE OR REPLACE FUNCTION public.is_unit_leader(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unit_members
    WHERE user_id = _user_id
      AND unit_id = _unit_id
      AND position IN ('capitan','secretario')
  );
$$;

-- Helper: prevent evaluating directors/subdirectors
CREATE OR REPLACE FUNCTION public.is_evaluable_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT (public.has_role(_user_id, 'director'::app_role)
              OR public.has_role(_user_id, 'subdirector'::app_role));
$$;

-- Drop old broad policy and recreate granular ones
DROP POLICY IF EXISTS "Directors can manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Authenticated can view evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Members can view own evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Scanners can insert evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Scanners can update evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Admins can delete evaluations" ON public.evaluations;

-- Members see their own; admins/directors/leaders see all
CREATE POLICY "Members can view own evaluations"
ON public.evaluations FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'director'::app_role)
  OR public.has_role(auth.uid(), 'subdirector'::app_role)
  OR public.is_unit_leader(auth.uid(), unit_id)
);

-- Insert: admins/directors/subdirectors anywhere; capitan/secretario only in their unit; never for director/subdirector
CREATE POLICY "Scanners can insert evaluations"
ON public.evaluations FOR INSERT TO authenticated
WITH CHECK (
  public.is_evaluable_member(user_id)
  AND registered_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.has_role(auth.uid(), 'subdirector'::app_role)
    OR public.is_unit_leader(auth.uid(), unit_id)
  )
);

CREATE POLICY "Scanners can update evaluations"
ON public.evaluations FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'director'::app_role)
  OR public.has_role(auth.uid(), 'subdirector'::app_role)
  OR public.is_unit_leader(auth.uid(), unit_id)
);

CREATE POLICY "Admins can delete evaluations"
ON public.evaluations FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'director'::app_role)
);

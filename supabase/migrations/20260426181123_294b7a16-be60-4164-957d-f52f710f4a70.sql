-- 1. Add security question fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_question TEXT,
  ADD COLUMN IF NOT EXISTS security_answer TEXT;

-- 2. Create pin_records table
CREATE TABLE IF NOT EXISTS public.pin_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  assigned_by UUID,
  source TEXT NOT NULL DEFAULT 'registration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_records ENABLE ROW LEVEL SECURITY;

-- RLS: super_admin sees all
CREATE POLICY "Super admin can view all pins"
  ON public.pin_records FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: user can view own pin
CREATE POLICY "Users can view own pin"
  ON public.pin_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: user inserts own pin record at registration
CREATE POLICY "Users can insert own pin record"
  ON public.pin_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS: super_admin can insert any
CREATE POLICY "Super admin can insert pin records"
  ON public.pin_records FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: super_admin can update any
CREATE POLICY "Super admin can update pin records"
  ON public.pin_records FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: user updates own pin record (when they change it themselves)
CREATE POLICY "Users can update own pin record"
  ON public.pin_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: super_admin can delete
CREATE POLICY "Super admin can delete pin records"
  ON public.pin_records FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_pin_records_updated_at
  BEFORE UPDATE ON public.pin_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Function: super admin resets a user's PIN
CREATE OR REPLACE FUNCTION public.admin_reset_user_pin(_user_id UUID, _new_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admin can reset pins';
  END IF;

  IF _new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be 4 digits';
  END IF;

  INSERT INTO public.pin_records (user_id, pin, assigned_by, source)
  VALUES (_user_id, _new_pin, auth.uid(), 'admin_reset')
  ON CONFLICT (user_id) DO UPDATE
    SET pin = EXCLUDED.pin,
        assigned_by = EXCLUDED.assigned_by,
        source = 'admin_reset',
        updated_at = now();
END;
$$;

-- 4. Function: recover PIN using security question (callable from edge function with service role)
CREATE OR REPLACE FUNCTION public.verify_security_answer(_phone TEXT, _answer TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT user_id INTO _user_id
  FROM public.profiles
  WHERE phone = _phone
    AND security_answer IS NOT NULL
    AND lower(trim(security_answer)) = lower(trim(_answer))
  LIMIT 1;

  RETURN _user_id;
END;
$$;
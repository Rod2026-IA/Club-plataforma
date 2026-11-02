CREATE OR REPLACE FUNCTION public.is_evaluable_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;
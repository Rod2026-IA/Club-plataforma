CREATE OR REPLACE FUNCTION public.get_admin_role_counts()
RETURNS TABLE(director_count integer, subdirector_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.user_roles WHERE role = 'director'),
    (SELECT COUNT(*)::int FROM public.user_roles WHERE role = 'subdirector');
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_role_counts() TO anon, authenticated;
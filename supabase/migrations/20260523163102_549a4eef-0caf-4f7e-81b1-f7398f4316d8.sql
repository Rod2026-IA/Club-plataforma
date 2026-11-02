
-- Restore previous broad profile read so app keeps working
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP VIEW IF EXISTS public.profiles_public;
DROP FUNCTION IF EXISTS public.get_public_profiles();

-- Re-grant SELECT on profiles to authenticated for all columns EXCEPT security_question/security_answer
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, user_id, first_name, second_name, first_last_name, second_last_name,
  phone, email, birthday, avatar_url, banner_url,
  banner_scale, avatar_scale, banner_position_x, avatar_position_x,
  banner_position_y, avatar_position_y, created_at, updated_at
) ON public.profiles TO authenticated;
-- security_question and security_answer NOT granted to authenticated/anon
REVOKE SELECT (security_question, security_answer) ON public.profiles FROM authenticated, anon;

CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

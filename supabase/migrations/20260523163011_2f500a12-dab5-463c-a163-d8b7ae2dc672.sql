
-- 1) profiles: split into "own full row" + "public display fields"
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Create a public view exposing only safe display fields, used by client code
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS SELECT
  user_id, first_name, second_name, first_last_name, second_last_name,
  avatar_url, banner_url, avatar_scale, banner_scale,
  avatar_position_x, avatar_position_y, banner_position_x, banner_position_y
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Allow authenticated users to read non-sensitive columns of OTHER profiles via a permissive policy
-- but block sensitive columns at the column-grant level.
CREATE POLICY "Users view public profile fields"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Revoke broad column grants and grant only safe columns to authenticated
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  user_id, first_name, second_name, first_last_name, second_last_name,
  avatar_url, banner_url, avatar_scale, banner_scale,
  avatar_position_x, avatar_position_y, banner_position_x, banner_position_y,
  created_at, updated_at
) ON public.profiles TO authenticated;
-- Sensitive columns: only the owner can read them (own-row policy + column grants combined)
GRANT SELECT (email, phone, birthday, security_question, security_answer) ON public.profiles TO authenticated;
-- The RLS will restrict the sensitive read to own row because "Users view public profile fields"
-- runs alongside "Users view own profile"; column-level + RLS doesn't natively block sensitive cols
-- for other users. To enforce, we change the public-view policy to exclude sensitive read access via
-- a SECURITY BARRIER view above, and keep the broad policy off. We'll instead restrict completely
-- and force clients to use profiles_public for others:
DROP POLICY "Users view public profile fields" ON public.profiles;

-- Final: only own row is readable directly; other users must query profiles_public view
-- (which selects only safe columns and runs as invoker — but the underlying table only allows own row).
-- So profiles_public needs its own data source. Replace it with a SECURITY DEFINER function-backed view.

DROP VIEW IF EXISTS public.profiles_public;

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  second_name text,
  first_last_name text,
  second_last_name text,
  avatar_url text,
  banner_url text,
  avatar_scale numeric,
  banner_scale numeric,
  avatar_position_x numeric,
  avatar_position_y numeric,
  banner_position_x numeric,
  banner_position_y numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id, first_name, second_name, first_last_name, second_last_name,
         avatar_url, banner_url, avatar_scale, banner_scale,
         avatar_position_x, avatar_position_y, banner_position_x, banner_position_y
  FROM public.profiles;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;

CREATE VIEW public.profiles_public WITH (security_invoker = true) AS
  SELECT * FROM public.get_public_profiles();
GRANT SELECT ON public.profiles_public TO authenticated;

-- 2) user_roles: prevent privilege escalation on self-insert
DROP POLICY IF EXISTS "Users can insert own role at registration" ON public.user_roles;
CREATE POLICY "Users can insert own default role at registration"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'integrante'::app_role);

-- 3) is_evaluable_member: enforce real ownership
CREATE OR REPLACE FUNCTION public.is_evaluable_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unit_members um
    WHERE um.user_id = _user_id
      AND (
        public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.has_role(auth.uid(), 'director'::app_role)
        OR public.has_role(auth.uid(), 'subdirector'::app_role)
        OR public.is_unit_leader(auth.uid(), um.unit_id)
      )
  );
$$;

-- 4) class-cards storage policies: enforce path ownership
DROP POLICY IF EXISTS "Users upload to class cards" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own class cards" ON storage.objects;
DROP POLICY IF EXISTS "Users read class cards" ON storage.objects;

CREATE POLICY "Class cards: read own or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'class-cards'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

CREATE POLICY "Class cards: insert own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'class-cards'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Class cards: delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'class-cards'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.has_role(auth.uid(), 'subdirector'::app_role)
  )
);

-- Make class-cards bucket private (still accessible via the app via authenticated reads)
UPDATE storage.buckets SET public = false WHERE id = 'class-cards';

-- 5) voice-notes: make private + restrict reads
UPDATE storage.buckets SET public = false WHERE id = 'voice-notes';

DROP POLICY IF EXISTS "Voice notes public read" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes upload own folder" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes delete own folder" ON storage.objects;

CREATE POLICY "Voice notes: read own or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.audio_path = storage.objects.name
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.streak_support_messages s
      WHERE s.audio_path = storage.objects.name
        AND s.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Voice notes: upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Voice notes: delete own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 6) webauthn_challenges: explicit deny SELECT for all client roles (service-role-only)
REVOKE ALL ON public.webauthn_challenges FROM anon, authenticated;
CREATE POLICY "Deny all client reads on webauthn_challenges"
ON public.webauthn_challenges FOR SELECT TO authenticated
USING (false);

-- 7) Revoke EXECUTE from anon on sensitive admin functions
REVOKE EXECUTE ON FUNCTION public.admin_adjust_streak(uuid, integer, integer, date) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reset_user_pin(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_all_streaks() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_support_threads() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_streaks() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_my_streak(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.use_streak_life(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_streaks() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_conversation_streak(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_security_answer(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_role_counts() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_global_streaks() FROM anon, PUBLIC;

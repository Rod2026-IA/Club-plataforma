
CREATE OR REPLACE FUNCTION public.get_global_streaks()
RETURNS TABLE(
  conversation_id uuid,
  user1_id uuid,
  user2_id uuid,
  user1_name text,
  user2_name text,
  user1_avatar text,
  user2_avatar text,
  streak_count integer,
  last_interaction_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id,
         c.user1_id,
         c.user2_id,
         TRIM(COALESCE(p1.first_name,'') || ' ' || COALESCE(p1.first_last_name,'')),
         TRIM(COALESCE(p2.first_name,'') || ' ' || COALESCE(p2.first_last_name,'')),
         p1.avatar_url,
         p2.avatar_url,
         c.streak_count,
         c.last_interaction_date
    FROM public.conversations c
    LEFT JOIN public.profiles p1 ON p1.user_id = c.user1_id
    LEFT JOIN public.profiles p2 ON p2.user_id = c.user2_id
   WHERE c.streak_count > 0
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = c.user1_id AND role = 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = c.user2_id AND role = 'super_admin')
   ORDER BY c.streak_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_streak(_partner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _u1 uuid;
  _u2 uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() < _partner THEN _u1 := auth.uid(); _u2 := _partner;
  ELSE _u1 := _partner; _u2 := auth.uid(); END IF;

  DELETE FROM public.conversations
   WHERE user1_id = _u1 AND user2_id = _u2;
END;
$$;

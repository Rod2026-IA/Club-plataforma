CREATE OR REPLACE FUNCTION public.admin_get_streak_activity(_conversation_id uuid)
RETURNS TABLE(day date, user_id uuid, first_at timestamptz, last_at timestamptz, message_count int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _u1 uuid;
  _u2 uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admin';
  END IF;

  SELECT c.user1_id, c.user2_id INTO _u1, _u2
  FROM public.conversations c WHERE c.id = _conversation_id;

  IF _u1 IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    public.message_streak_day(m.created_at) AS day,
    m.sender_id AS user_id,
    MIN(m.created_at) AS first_at,
    MAX(m.created_at) AS last_at,
    COUNT(*)::int AS message_count
  FROM public.messages m
  WHERE LEAST(m.sender_id, m.receiver_id) = _u1
    AND GREATEST(m.sender_id, m.receiver_id) = _u2
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_streak_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_streak_activity(uuid) TO authenticated;
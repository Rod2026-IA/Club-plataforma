
-- ===== messages: edit + voice =====
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

-- Allow sender to update their own message (for editing)
DROP POLICY IF EXISTS "Senders can edit own messages" ON public.messages;
CREATE POLICY "Senders can edit own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- ===== streak_support_messages =====
CREATE TABLE IF NOT EXISTS public.streak_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,            -- owner of the thread (the member)
  sender_id uuid NOT NULL,          -- who actually sent it (member or admin)
  is_from_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  audio_url text,
  audio_path text,
  audio_duration_ms integer,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.streak_support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or admin can view support" ON public.streak_support_messages;
CREATE POLICY "Owner or admin can view support"
  ON public.streak_support_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Owner sends own support" ON public.streak_support_messages;
CREATE POLICY "Owner sends own support"
  ON public.streak_support_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND auth.uid() = sender_id AND is_from_admin = false
  );

DROP POLICY IF EXISTS "Admin sends to any support" ON public.streak_support_messages;
CREATE POLICY "Admin sends to any support"
  ON public.streak_support_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    AND sender_id = auth.uid()
    AND is_from_admin = true
  );

DROP POLICY IF EXISTS "Owner or admin update support read" ON public.streak_support_messages;
CREATE POLICY "Owner or admin update support read"
  ON public.streak_support_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_streak_support_user ON public.streak_support_messages(user_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.streak_support_messages;
ALTER TABLE public.streak_support_messages REPLICA IDENTITY FULL;

-- ===== voice-notes bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Voice notes public read" ON storage.objects;
CREATE POLICY "Voice notes public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "Users upload own voice notes" ON storage.objects;
CREATE POLICY "Users upload own voice notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own voice notes" ON storage.objects;
CREATE POLICY "Users delete own voice notes"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===== admin streak RPCs =====

CREATE OR REPLACE FUNCTION public.admin_list_all_streaks()
RETURNS TABLE(
  conversation_id uuid,
  user1_id uuid,
  user2_id uuid,
  user1_name text,
  user2_name text,
  user1_avatar text,
  user2_avatar text,
  streak_count integer,
  lives integer,
  last_interaction_date date,
  start_date date,
  week_report text,
  week_has_issue boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _week_start date := (public.current_streak_day() - ((EXTRACT(ISODOW FROM public.current_streak_day())::int - 1)) );
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admin';
  END IF;

  RETURN QUERY
  WITH conv AS (
    SELECT c.id, c.user1_id, c.user2_id, c.streak_count, c.lives, c.last_interaction_date
    FROM public.conversations c
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = c.user1_id AND ur.role = 'super_admin')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = c.user2_id AND ur.role = 'super_admin')
  ),
  week_days AS (
    SELECT c.id,
      array_agg(DISTINCT public.message_streak_day(m.created_at) ORDER BY public.message_streak_day(m.created_at)) AS days,
      array_agg(DISTINCT m.sender_id) AS senders
    FROM conv c
    LEFT JOIN public.messages m
      ON LEAST(m.sender_id, m.receiver_id) = c.user1_id
     AND GREATEST(m.sender_id, m.receiver_id) = c.user2_id
     AND public.message_streak_day(m.created_at) >= _week_start
    GROUP BY c.id
  ),
  start_day AS (
    SELECT c.id, MIN(public.message_streak_day(m.created_at)) AS sd
    FROM conv c
    LEFT JOIN public.messages m
      ON LEAST(m.sender_id, m.receiver_id) = c.user1_id
     AND GREATEST(m.sender_id, m.receiver_id) = c.user2_id
    GROUP BY c.id
  )
  SELECT
    c.id,
    c.user1_id,
    c.user2_id,
    TRIM(COALESCE(p1.first_name,'') || ' ' || COALESCE(p1.first_last_name,'')),
    TRIM(COALESCE(p2.first_name,'') || ' ' || COALESCE(p2.first_last_name,'')),
    p1.avatar_url,
    p2.avatar_url,
    c.streak_count,
    c.lives,
    c.last_interaction_date,
    CASE
      WHEN c.streak_count > 0 AND c.last_interaction_date IS NOT NULL
        THEN c.last_interaction_date - (c.streak_count - 1)
      ELSE sd.sd
    END AS start_date,
    (
      'Semana del ' || to_char(_week_start, 'DD/MM') || ' al ' || to_char(_week_start + 6, 'DD/MM') || ': '
      || CASE
        WHEN wd.days IS NULL OR array_length(wd.days,1) IS NULL
          THEN 'Sin mensajes esta semana. Posible falla o inactividad de la pareja.'
        ELSE
          array_length(wd.days,1)::text || ' día(s) con actividad. '
          || CASE WHEN array_length(wd.senders,1) < 2
               THEN 'Solo uno de los dos ha escrito esta semana.'
               ELSE 'Ambos han participado.'
             END
          || CASE WHEN c.lives < 5 THEN ' Se han usado ' || (5 - c.lives)::text || ' corazón(es).' ELSE '' END
          || CASE WHEN c.streak_count = 0 THEN ' ⚠ La racha está reiniciada.' ELSE '' END
      END
    )::text AS week_report,
    (
      c.streak_count = 0
      OR c.lives < 5
      OR wd.days IS NULL
      OR array_length(wd.days,1) IS NULL
      OR array_length(wd.senders,1) < 2
    ) AS week_has_issue
  FROM conv c
  LEFT JOIN public.profiles p1 ON p1.user_id = c.user1_id
  LEFT JOIN public.profiles p2 ON p2.user_id = c.user2_id
  LEFT JOIN week_days wd ON wd.id = c.id
  LEFT JOIN start_day sd ON sd.id = c.id
  ORDER BY c.streak_count DESC, c.last_interaction_date DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_streak(
  _conversation_id uuid,
  _streak_count integer,
  _lives integer,
  _start_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := public.current_streak_day();
  _last_int date;
  _has_today boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admin';
  END IF;
  IF _streak_count < 0 OR _lives < 0 OR _lives > 5 THEN
    RAISE EXCEPTION 'Invalid values';
  END IF;

  IF _streak_count = 0 THEN
    UPDATE public.conversations
       SET streak_count = 0, lives = _lives, last_interaction_date = NULL,
           has_today_interaction = false, today_date = _today, updated_at = now()
     WHERE id = _conversation_id;
    RETURN;
  END IF;

  IF _start_date IS NULL THEN
    _last_int := _today;
  ELSE
    _last_int := _start_date + (_streak_count - 1);
    IF _last_int > _today THEN _last_int := _today; END IF;
  END IF;
  _has_today := _last_int = _today;

  UPDATE public.conversations
     SET streak_count = _streak_count,
         lives = _lives,
         last_interaction_date = _last_int,
         has_today_interaction = _has_today,
         today_date = _today,
         updated_at = now()
   WHERE id = _conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_support_threads()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admin';
  END IF;

  RETURN QUERY
  WITH last_per AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.content, s.message_type, s.created_at
    FROM public.streak_support_messages s
    ORDER BY s.user_id, s.created_at DESC
  ),
  unread AS (
    SELECT s.user_id, COUNT(*)::int AS c
    FROM public.streak_support_messages s
    WHERE s.is_from_admin = false AND s.read = false
    GROUP BY s.user_id
  )
  SELECT
    lp.user_id,
    TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.first_last_name,'')),
    p.avatar_url,
    CASE WHEN lp.message_type = 'voice' THEN '🎤 Mensaje de voz' ELSE lp.content END,
    lp.created_at,
    COALESCE(u.c, 0)
  FROM last_per lp
  LEFT JOIN public.profiles p ON p.user_id = lp.user_id
  LEFT JOIN unread u ON u.user_id = lp.user_id
  ORDER BY lp.created_at DESC;
END;
$$;

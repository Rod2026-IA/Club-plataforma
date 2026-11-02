CREATE OR REPLACE FUNCTION public.current_streak_day()
RETURNS date
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT ((now() AT TIME ZONE 'America/Tegucigalpa') - interval '1 hour')::date;
$$;

CREATE OR REPLACE FUNCTION public.message_streak_day(_created_at timestamp with time zone)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT ((_created_at AT TIME ZONE 'America/Tegucigalpa') - interval '1 hour')::date;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_conversation_streak(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv public.conversations%ROWTYPE;
  _today date := public.current_streak_day();
  _last_day date;
  _streak_count integer := 0;
  _has_today boolean := false;
  _missing_days integer := 0;
  _new_lives integer := 5;
  _new_last_day date;
BEGIN
  SELECT * INTO _conv
  FROM public.conversations
  WHERE id = _conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  WITH pair_days AS (
    SELECT DISTINCT public.message_streak_day(m.created_at) AS streak_day
    FROM public.messages m
    WHERE LEAST(m.sender_id, m.receiver_id) = _conv.user1_id
      AND GREATEST(m.sender_id, m.receiver_id) = _conv.user2_id
  ), ordered_days AS (
    SELECT streak_day
    FROM pair_days
    ORDER BY streak_day DESC
  ), latest AS (
    SELECT MAX(streak_day) AS last_day FROM pair_days
  ), consecutive AS (
    SELECT od.streak_day,
           (SELECT last_day FROM latest) - od.streak_day AS expected_offset,
           ROW_NUMBER() OVER (ORDER BY od.streak_day DESC) - 1 AS actual_offset
    FROM ordered_days od
    CROSS JOIN latest
    WHERE od.streak_day <= latest.last_day
  )
  SELECT COUNT(*)::int, MAX(streak_day)
    INTO _streak_count, _last_day
  FROM consecutive
  WHERE expected_offset = actual_offset;

  IF _last_day IS NULL OR _streak_count <= 0 THEN
    UPDATE public.conversations
       SET streak_count = 0,
           last_interaction_date = NULL,
           has_today_interaction = false,
           today_date = _today,
           lives = 5,
           updated_at = now()
     WHERE id = _conv.id;
    RETURN;
  END IF;

  _missing_days := GREATEST(_today - _last_day - 1, 0);
  _has_today := (_last_day = _today);
  _new_last_day := _last_day;
  _new_lives := GREATEST(5 - _missing_days, 0);

  IF _missing_days > 0 AND _missing_days <= 5 THEN
    _streak_count := _streak_count + _missing_days;
    _new_last_day := _last_day + _missing_days;
  ELSIF _missing_days > 5 THEN
    _streak_count := 0;
    _new_last_day := NULL;
    _has_today := false;
  END IF;

  UPDATE public.conversations
     SET streak_count = _streak_count,
         last_interaction_date = _new_last_day,
         has_today_interaction = _has_today,
         today_date = _today,
         lives = _new_lives,
         updated_at = now()
   WHERE id = _conv.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_streak_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  _conv_id := public.get_or_create_conversation(NEW.sender_id, NEW.receiver_id);

  UPDATE public.conversations
     SET last_sender_id = NEW.sender_id
   WHERE id = _conv_id;

  PERFORM public.recalculate_conversation_streak(_conv_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_streaks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH target_conversations AS (
    SELECT id FROM public.conversations
  )
  SELECT public.recalculate_conversation_streak(id)
  FROM target_conversations;
$$;

CREATE OR REPLACE FUNCTION public.use_streak_life(_partner uuid)
RETURNS TABLE(out_streak_count integer, out_lives integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _u1 uuid;
  _u2 uuid;
  _conv public.conversations%ROWTYPE;
  _today date := public.current_streak_day();
  _missing_days integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() < _partner THEN
    _u1 := auth.uid();
    _u2 := _partner;
  ELSE
    _u1 := _partner;
    _u2 := auth.uid();
  END IF;

  SELECT * INTO _conv
  FROM public.conversations
  WHERE user1_id = _u1 AND user2_id = _u2
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  PERFORM public.recalculate_conversation_streak(_conv.id);

  SELECT * INTO _conv
  FROM public.conversations
  WHERE id = _conv.id
  FOR UPDATE;

  IF _conv.last_interaction_date IS NULL OR _conv.streak_count <= 0 THEN
    out_streak_count := 0;
    out_lives := GREATEST(_conv.lives, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  _missing_days := GREATEST(_today - _conv.last_interaction_date - 1, 0);

  IF _missing_days <= 0 THEN
    out_streak_count := _conv.streak_count;
    out_lives := _conv.lives;
    RETURN NEXT;
    RETURN;
  END IF;

  IF _conv.lives <= 0 THEN
    UPDATE public.conversations
       SET streak_count = 0,
           last_interaction_date = NULL,
           has_today_interaction = false,
           today_date = _today,
           last_sender_id = NULL,
           updated_at = now()
     WHERE id = _conv.id
     RETURNING conversations.streak_count, conversations.lives
       INTO out_streak_count, out_lives;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.conversations
     SET lives = GREATEST(lives - 1, 0),
         streak_count = streak_count + 1,
         last_interaction_date = last_interaction_date + 1,
         has_today_interaction = false,
         today_date = _today,
         updated_at = now()
   WHERE id = _conv.id
   RETURNING conversations.streak_count, conversations.lives
     INTO out_streak_count, out_lives;

  RETURN NEXT;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_streak ON public.messages;
CREATE TRIGGER messages_update_streak
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_streak_on_message();
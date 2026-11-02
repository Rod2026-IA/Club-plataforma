
-- 1) Trigger usando timezone Honduras
CREATE OR REPLACE FUNCTION public.update_streak_on_message()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _conv_id UUID;
  _conv public.conversations%ROWTYPE;
  _today DATE := (NEW.created_at AT TIME ZONE 'America/Tegucigalpa')::date;
  _diff INT;
  _mutual BOOLEAN := false;
BEGIN
  _conv_id := public.get_or_create_conversation(NEW.sender_id, NEW.receiver_id);
  SELECT * INTO _conv FROM public.conversations WHERE id = _conv_id FOR UPDATE;

  IF _conv.today_date IS DISTINCT FROM _today THEN
    _conv.has_today_interaction := false;
    _conv.today_date := _today;
  END IF;

  IF _conv.last_sender_id IS NOT NULL
     AND _conv.last_sender_id <> NEW.sender_id THEN
    _mutual := true;
  END IF;

  IF _mutual AND NOT _conv.has_today_interaction THEN
    IF _conv.last_interaction_date IS NULL THEN
      _conv.streak_count := 1;
    ELSE
      _diff := _today - _conv.last_interaction_date;
      IF _diff = 0 THEN
        NULL;
      ELSE
        _conv.streak_count := _conv.streak_count + 1;
      END IF;
    END IF;
    _conv.last_interaction_date := _today;
    _conv.has_today_interaction := true;
    _conv.lives := 5;
  END IF;

  _conv.last_sender_id := NEW.sender_id;

  UPDATE public.conversations
     SET streak_count = _conv.streak_count,
         last_interaction_date = _conv.last_interaction_date,
         last_sender_id = _conv.last_sender_id,
         has_today_interaction = _conv.has_today_interaction,
         today_date = _conv.today_date,
         lives = _conv.lives
   WHERE id = _conv_id;

  RETURN NEW;
END;
$function$;

-- 2) Cleanup también con timezone Honduras
CREATE OR REPLACE FUNCTION public.cleanup_expired_streaks()
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  UPDATE public.conversations
     SET streak_count = 0,
         lives = 5,
         last_interaction_date = NULL,
         has_today_interaction = false
   WHERE last_interaction_date IS NOT NULL
     AND (((now() AT TIME ZONE 'America/Tegucigalpa')::date) - last_interaction_date) > 1
     AND streak_count > 0
     AND lives <= 0;
$function$;

-- 3) use_streak_life con timezone Honduras
CREATE OR REPLACE FUNCTION public.use_streak_life(_partner uuid)
 RETURNS TABLE(out_streak_count integer, out_lives integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _u1 uuid;
  _u2 uuid;
  _conv public.conversations%ROWTYPE;
  _today date := (now() AT TIME ZONE 'America/Tegucigalpa')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() < _partner THEN _u1 := auth.uid(); _u2 := _partner;
  ELSE _u1 := _partner; _u2 := auth.uid(); END IF;

  SELECT * INTO _conv FROM public.conversations
   WHERE user1_id = _u1 AND user2_id = _u2 FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF _conv.lives > 1 THEN
    UPDATE public.conversations
       SET lives = lives - 1,
           last_interaction_date = _today,
           has_today_interaction = false,
           today_date = _today,
           last_sender_id = NULL
     WHERE id = _conv.id
     RETURNING conversations.streak_count, conversations.lives
       INTO out_streak_count, out_lives;
  ELSE
    UPDATE public.conversations
       SET lives = 5,
           streak_count = 0,
           last_interaction_date = NULL,
           has_today_interaction = false,
           today_date = NULL,
           last_sender_id = NULL
     WHERE id = _conv.id
     RETURNING conversations.streak_count, conversations.lives
       INTO out_streak_count, out_lives;
  END IF;

  RETURN NEXT;
END;
$function$;

-- 4) Compensación: restaurar corazones a 5 para todos
UPDATE public.conversations SET lives = 5 WHERE lives < 5;

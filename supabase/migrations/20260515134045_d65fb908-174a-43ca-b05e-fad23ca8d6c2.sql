CREATE OR REPLACE FUNCTION public.update_streak_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _conv_id uuid;
  _conv public.conversations%ROWTYPE;
  _today date := (NEW.created_at AT TIME ZONE 'America/Tegucigalpa')::date;
  _diff integer;
BEGIN
  _conv_id := public.get_or_create_conversation(NEW.sender_id, NEW.receiver_id);
  SELECT * INTO _conv FROM public.conversations WHERE id = _conv_id FOR UPDATE;

  IF _conv.last_interaction_date IS NULL THEN
    _conv.streak_count := 1;
    _conv.last_interaction_date := _today;
  ELSE
    _diff := _today - _conv.last_interaction_date;

    IF _diff = 0 THEN
      NULL;
    ELSIF _diff = 1 THEN
      _conv.streak_count := GREATEST(_conv.streak_count, 0) + 1;
      _conv.last_interaction_date := _today;
    ELSE
      _conv.streak_count := 1;
      _conv.last_interaction_date := _today;
    END IF;
  END IF;

  _conv.has_today_interaction := (_conv.last_interaction_date = _today);
  _conv.today_date := _today;
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

CREATE OR REPLACE FUNCTION public.cleanup_expired_streaks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.conversations
     SET streak_count = 0,
         last_interaction_date = NULL,
         has_today_interaction = false,
         today_date = (now() AT TIME ZONE 'America/Tegucigalpa')::date,
         last_sender_id = NULL
   WHERE last_interaction_date IS NOT NULL
     AND (((now() AT TIME ZONE 'America/Tegucigalpa')::date) - last_interaction_date) > 1
     AND streak_count > 0
     AND lives <= 0;
$function$;

CREATE OR REPLACE FUNCTION public.use_streak_life(_partner uuid)
RETURNS TABLE(out_streak_count integer, out_lives integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _u1 uuid;
  _u2 uuid;
  _conv public.conversations%ROWTYPE;
  _today date := (now() AT TIME ZONE 'America/Tegucigalpa')::date;
  _yesterday date := ((now() AT TIME ZONE 'America/Tegucigalpa')::date - 1);
  _covered_date date;
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

  SELECT * INTO _conv FROM public.conversations
   WHERE user1_id = _u1 AND user2_id = _u2 FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  IF _conv.last_interaction_date IS NULL OR _conv.streak_count <= 0 THEN
    out_streak_count := GREATEST(_conv.streak_count, 0);
    out_lives := GREATEST(_conv.lives, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  IF _conv.last_interaction_date >= _yesterday THEN
    UPDATE public.conversations
       SET today_date = _today,
           has_today_interaction = (_conv.last_interaction_date = _today)
     WHERE id = _conv.id
     RETURNING conversations.streak_count, conversations.lives
       INTO out_streak_count, out_lives;
    RETURN NEXT;
    RETURN;
  END IF;

  IF _conv.lives <= 0 THEN
    UPDATE public.conversations
       SET streak_count = 0,
           last_interaction_date = NULL,
           has_today_interaction = false,
           today_date = _today,
           last_sender_id = NULL
     WHERE id = _conv.id
     RETURNING conversations.streak_count, conversations.lives
       INTO out_streak_count, out_lives;
    RETURN NEXT;
    RETURN;
  END IF;

  _covered_date := _conv.last_interaction_date + 1;

  UPDATE public.conversations
     SET lives = GREATEST(lives - 1, 0),
         streak_count = streak_count + 1,
         last_interaction_date = _covered_date,
         has_today_interaction = (_covered_date = _today),
         today_date = _today,
         last_sender_id = NULL
   WHERE id = _conv.id
   RETURNING conversations.streak_count, conversations.lives
     INTO out_streak_count, out_lives;

  RETURN NEXT;
END;
$function$;
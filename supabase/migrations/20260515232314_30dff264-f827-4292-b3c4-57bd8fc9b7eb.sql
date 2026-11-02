CREATE OR REPLACE FUNCTION public.recalculate_conversation_streak(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv public.conversations%ROWTYPE;
  _today date := public.current_streak_day();
  _active_days date[];
  _first_day date;
  _cursor date;
  _streak int := 0;
  _lives_used int := 0;
  _has_today boolean := false;
  _last_int date;
BEGIN
  SELECT * INTO _conv FROM public.conversations WHERE id = _conversation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT array_agg(d ORDER BY d) INTO _active_days
  FROM (
    SELECT DISTINCT public.message_streak_day(m.created_at) AS d
    FROM public.messages m
    WHERE LEAST(m.sender_id, m.receiver_id) = _conv.user1_id
      AND GREATEST(m.sender_id, m.receiver_id) = _conv.user2_id
  ) sub;

  IF _active_days IS NULL OR array_length(_active_days,1) = 0 THEN
    UPDATE public.conversations
       SET streak_count=0, last_interaction_date=NULL,
           has_today_interaction=false, today_date=_today,
           lives=5, updated_at=now()
     WHERE id=_conv.id;
    RETURN;
  END IF;

  _first_day := _active_days[1];
  _has_today := _today = ANY(_active_days);

  IF _has_today THEN
    _cursor := _today;
    _last_int := _today;
  ELSE
    _cursor := _today - 1;
    _last_int := _today - 1;
  END IF;

  WHILE _cursor >= _first_day LOOP
    IF _cursor = ANY(_active_days) THEN
      _streak := _streak + 1;
    ELSE
      IF _lives_used >= 5 THEN EXIT; END IF;
      _lives_used := _lives_used + 1;
      _streak := _streak + 1;
    END IF;
    _cursor := _cursor - 1;
  END LOOP;

  IF _streak <= 0 THEN
    UPDATE public.conversations
       SET streak_count=0, last_interaction_date=NULL,
           has_today_interaction=false, today_date=_today,
           lives=5, updated_at=now()
     WHERE id=_conv.id;
    RETURN;
  END IF;

  UPDATE public.conversations
     SET streak_count=_streak,
         last_interaction_date=_last_int,
         has_today_interaction=_has_today,
         today_date=_today,
         lives=GREATEST(5 - _lives_used, 0),
         updated_at=now()
   WHERE id=_conv.id;
END;
$$;

SELECT public.cleanup_expired_streaks();
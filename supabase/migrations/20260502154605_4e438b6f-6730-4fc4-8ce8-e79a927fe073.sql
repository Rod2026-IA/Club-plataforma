-- 1. Tabla conversations
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_date DATE,
  last_sender_id UUID,
  has_today_interaction BOOLEAN NOT NULL DEFAULT false,
  today_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_users_order CHECK (user1_id < user2_id),
  CONSTRAINT conversations_unique_pair UNIQUE (user1_id, user2_id)
);

CREATE INDEX idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON public.conversations(user2_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS: solo participantes ven la conversación
CREATE POLICY "Participants can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Helper: obtiene/crea conversación entre dos usuarios (orden canónico)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_a UUID, _b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u1 UUID;
  _u2 UUID;
  _id UUID;
BEGIN
  IF _a = _b THEN
    RAISE EXCEPTION 'Cannot create conversation with self';
  END IF;
  IF _a < _b THEN _u1 := _a; _u2 := _b; ELSE _u1 := _b; _u2 := _a; END IF;

  SELECT id INTO _id FROM public.conversations
   WHERE user1_id = _u1 AND user2_id = _u2;

  IF _id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (_u1, _u2)
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- 3. Trigger sobre messages: actualiza la racha al enviar mensaje
CREATE OR REPLACE FUNCTION public.update_streak_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id UUID;
  _conv public.conversations%ROWTYPE;
  _today DATE := (NEW.created_at AT TIME ZONE 'UTC')::date;
  _diff INT;
  _mutual BOOLEAN := false;
BEGIN
  _conv_id := public.get_or_create_conversation(NEW.sender_id, NEW.receiver_id);
  SELECT * INTO _conv FROM public.conversations WHERE id = _conv_id FOR UPDATE;

  -- Reset diario del flag has_today_interaction
  IF _conv.today_date IS DISTINCT FROM _today THEN
    _conv.has_today_interaction := false;
    _conv.today_date := _today;
  END IF;

  -- Detectar interacción mutua hoy:
  -- Si el último emisor es DIFERENTE al actual y envió hoy (o ya estaba marcado), es mutua.
  IF _conv.last_sender_id IS NOT NULL
     AND _conv.last_sender_id <> NEW.sender_id THEN
    _mutual := true;
  END IF;

  IF _mutual AND NOT _conv.has_today_interaction THEN
    -- Evaluar racha
    IF _conv.last_interaction_date IS NULL THEN
      _conv.streak_count := 1;
    ELSE
      _diff := _today - _conv.last_interaction_date;
      IF _diff = 0 THEN
        -- Ya contó hoy (defensivo): no cambiar
        NULL;
      ELSIF _diff = 1 THEN
        _conv.streak_count := _conv.streak_count + 1;
      ELSE
        _conv.streak_count := 1;
      END IF;
    END IF;
    _conv.last_interaction_date := _today;
    _conv.has_today_interaction := true;
  END IF;

  -- Limpieza: si pasó más de 1 día sin interacción mutua
  IF _conv.last_interaction_date IS NOT NULL
     AND (_today - _conv.last_interaction_date) > 1 THEN
    _conv.streak_count := 0;
  END IF;

  _conv.last_sender_id := NEW.sender_id;

  UPDATE public.conversations
     SET streak_count = _conv.streak_count,
         last_interaction_date = _conv.last_interaction_date,
         last_sender_id = _conv.last_sender_id,
         has_today_interaction = _conv.has_today_interaction,
         today_date = _conv.today_date
   WHERE id = _conv_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_update_streak
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_streak_on_message();

-- 4. Función de limpieza diaria invocable desde la app
CREATE OR REPLACE FUNCTION public.cleanup_expired_streaks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conversations
     SET streak_count = 0
   WHERE last_interaction_date IS NOT NULL
     AND (CURRENT_DATE - last_interaction_date) > 1
     AND streak_count > 0;
$$;

-- 5. Vista helper para listar conversaciones del usuario actual con el "otro"
CREATE OR REPLACE FUNCTION public.get_my_streaks()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  streak_count INTEGER,
  last_interaction_date DATE,
  has_today_interaction BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END,
         c.streak_count,
         c.last_interaction_date,
         c.has_today_interaction
    FROM public.conversations c
   WHERE auth.uid() IN (c.user1_id, c.user2_id);
$$;
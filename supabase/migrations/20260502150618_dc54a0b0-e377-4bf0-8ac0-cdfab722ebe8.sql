ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS part_devocional integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS asistencia_ja integer NOT NULL DEFAULT 0;
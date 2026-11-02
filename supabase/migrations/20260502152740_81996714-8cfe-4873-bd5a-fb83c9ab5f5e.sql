ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_asistencia_check,
  DROP CONSTRAINT IF EXISTS evaluations_cuota_check,
  DROP CONSTRAINT IF EXISTS evaluations_matutina_check,
  DROP CONSTRAINT IF EXISTS evaluations_puntualidad_check,
  DROP CONSTRAINT IF EXISTS evaluations_tareas_check,
  DROP CONSTRAINT IF EXISTS evaluations_uniforme_check;

ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_asistencia_check CHECK (asistencia >= 0 AND asistencia <= 25),
  ADD CONSTRAINT evaluations_puntualidad_check CHECK (puntualidad >= 0 AND puntualidad <= 20),
  ADD CONSTRAINT evaluations_uniforme_check CHECK (uniforme >= 0 AND uniforme <= 20),
  ADD CONSTRAINT evaluations_part_devocional_check CHECK (part_devocional >= 0 AND part_devocional <= 20),
  ADD CONSTRAINT evaluations_asistencia_ja_check CHECK (asistencia_ja >= 0 AND asistencia_ja <= 25),
  ADD CONSTRAINT evaluations_tareas_check CHECK (tareas >= 0 AND tareas <= 20),
  ADD CONSTRAINT evaluations_cuota_check CHECK (cuota >= 0 AND cuota <= 20);
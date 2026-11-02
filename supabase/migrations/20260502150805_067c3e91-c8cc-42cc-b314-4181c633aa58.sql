CREATE OR REPLACE FUNCTION public.compute_evaluation_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.total_score := COALESCE(NEW.asistencia,0)
                   + COALESCE(NEW.puntualidad,0)
                   + COALESCE(NEW.uniforme,0)
                   + COALESCE(NEW.part_devocional,0)
                   + COALESCE(NEW.asistencia_ja,0)
                   + COALESCE(NEW.tareas,0)
                   + COALESCE(NEW.cuota,0);
  RETURN NEW;
END;
$function$;
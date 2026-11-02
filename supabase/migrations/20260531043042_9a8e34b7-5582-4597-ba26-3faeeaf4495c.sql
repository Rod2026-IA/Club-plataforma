ALTER TABLE public.user_class_enrollments DROP CONSTRAINT IF EXISTS user_class_enrollments_user_id_track_key;

CREATE UNIQUE INDEX IF NOT EXISTS user_class_enrollments_user_track_class_uniq
ON public.user_class_enrollments (user_id, track, COALESCE(class_id, ''));
REVOKE ALL ON FUNCTION public.recalculate_conversation_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_streak_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_streaks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.use_streak_life(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_streaks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_streak_life(uuid) TO authenticated;

-- 1) Remove conflicting public SELECT on private class-cards bucket
DROP POLICY IF EXISTS "Public read class cards" ON storage.objects;

-- 2) Remove duplicate INSERT policy on voice-notes
DROP POLICY IF EXISTS "Users upload own voice notes" ON storage.objects;

-- 3) Lock down security_question / security_answer at the column level.
-- RLS allows row-wide SELECT to all authenticated users; revoke column SELECT
-- so these two columns can only be read via SECURITY DEFINER functions
-- (verify_security_answer) and by the owner through a dedicated policy.
REVOKE SELECT (security_question, security_answer) ON public.profiles FROM anon, authenticated;

-- Allow each user to read ONLY their own security_question / security_answer
GRANT SELECT (security_question, security_answer) ON public.profiles TO authenticated;
REVOKE SELECT (security_question, security_answer) ON public.profiles FROM authenticated;

-- Instead expose own values through a safe view
CREATE OR REPLACE VIEW public.my_security_qa
WITH (security_invoker = true) AS
SELECT user_id, security_question, security_answer
FROM public.profiles
WHERE user_id = auth.uid();

GRANT SELECT ON public.my_security_qa TO authenticated;

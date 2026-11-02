-- conversations: add INSERT/UPDATE/DELETE policies (only participants)
CREATE POLICY "Participants can insert conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Participants can delete conversations"
ON public.conversations FOR DELETE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- voice-notes bucket: explicit UPDATE policy (owner-only)
CREATE POLICY "Voice notes: update own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voice-notes' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'voice-notes' AND (auth.uid())::text = (storage.foldername(name))[1]);

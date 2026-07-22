
-- public read for all three (buckets are public but object-level SELECT still needs a policy for signed URLs / listing)
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "public read gallery" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "public read project-files" ON storage.objects FOR SELECT USING (bucket_id = 'project-files');

-- avatars: user uploads own file (path prefixed with their uid)
CREATE POLICY "user upload avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user update avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user delete avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- gallery: admins/leads
CREATE POLICY "admins/leads upload gallery" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lead')));
CREATE POLICY "admins delete gallery objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND public.has_role(auth.uid(),'admin'));

-- project-files: any authenticated user uploads under uid folder
CREATE POLICY "user upload project file" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user delete own project file" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

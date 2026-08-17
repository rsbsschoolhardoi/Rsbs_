INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'quiz-images', 'quiz-images', true, false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'quiz-images');

CREATE POLICY quiz_images_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'quiz-images' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'quiz-images' AND public.is_admin_user(auth.uid()));

CREATE POLICY quiz_images_public_select ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'quiz-images');

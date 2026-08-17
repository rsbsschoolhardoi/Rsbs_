-- Create storage bucket for Study AI attachments (images, PDFs, docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-ai-attachments',
  'study-ai-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Students can upload/read their own attachments
CREATE POLICY "Students can upload study ai attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study-ai-attachments');

CREATE POLICY "Anyone can read study ai attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'study-ai-attachments');

CREATE POLICY "Students can delete their own study ai attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study-ai-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
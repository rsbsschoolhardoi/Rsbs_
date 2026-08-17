-- Insert into modules first
INSERT INTO public.modules (id, label)
VALUES 
  ('certificate_download', 'Certificate Download Control'),
  ('id_card_download', 'ID Card Download Control')
ON CONFLICT (id) DO NOTHING;

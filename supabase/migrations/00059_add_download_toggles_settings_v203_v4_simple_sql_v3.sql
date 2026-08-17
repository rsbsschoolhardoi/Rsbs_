-- Now insert into module_settings
INSERT INTO public.module_settings (module_id, is_enabled, state)
VALUES 
  ('certificate_download', true, 'enabled'),
  ('id_card_download', true, 'enabled')
ON CONFLICT (module_id) WHERE role IS NULL AND user_id IS NULL DO NOTHING;

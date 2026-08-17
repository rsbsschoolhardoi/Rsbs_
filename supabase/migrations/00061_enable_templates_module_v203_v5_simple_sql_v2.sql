-- Enable templates module by default
INSERT INTO public.module_settings (module_id, is_enabled, state)
VALUES ('templates', true, 'enabled')
ON CONFLICT (module_id) WHERE role IS NULL AND user_id IS NULL DO NOTHING;

INSERT INTO public.modules (id, label) 
VALUES ('magic_link_login', 'Magic Link Login (Passwordless)')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- By default, enable it
INSERT INTO public.module_settings (module_id, is_enabled, state)
VALUES ('magic_link_login', true, 'enabled')
ON CONFLICT (module_id) DO UPDATE SET is_enabled = true, state = 'enabled';

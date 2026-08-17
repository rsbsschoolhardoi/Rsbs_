-- Add individual admin requirement toggle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS require_email_verification boolean DEFAULT true;

-- Update existing admins to have it true
UPDATE public.profiles SET require_email_verification = true WHERE role = 'admin';

-- Insert global setting for email verification enforcement
-- module_id: email_verification_enforcement
-- is_enabled: true (Strict), false (Bypass)
INSERT INTO public.module_settings (module_id, is_enabled, state)
VALUES ('email_verification_enforcement', true, 'enabled')
ON CONFLICT (module_id) WHERE role IS NULL AND user_id IS NULL DO NOTHING;

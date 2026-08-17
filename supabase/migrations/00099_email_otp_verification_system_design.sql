-- 1. Create email_otp_verifications table for secure OTP storage
CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Required Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_otp_verifications_user_id ON public.email_otp_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otp_verifications_expires_at ON public.email_otp_verifications(expires_at);

-- 2. Create system_config table for global settings
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial configuration for role-based OTP enabling/disabling
INSERT INTO public.system_config (config_key, config_value)
VALUES ('email_otp_settings', '{"otp_student_enabled": true, "otp_teacher_enabled": true, "otp_parent_enabled": false, "otp_admin_enabled": true}')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- 3. Update profiles table with necessary verification columns
-- Ensure email_verified column exists and has default false
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN email_verified SET DEFAULT false;
    END IF;
END $$;

-- Add email_otp_enabled column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_otp_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN email_otp_enabled BOOLEAN DEFAULT false;
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN email_otp_enabled SET DEFAULT false;
    END IF;
END $$;

-- 4. Enforce Email Constraints (Mandatory for Student/Teacher/Admin, UNIQUE)
-- Ensure email is UNIQUE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Enforce NOT NULL for specific roles via Check Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_role_email_mandatory;
ALTER TABLE public.profiles ADD CONSTRAINT check_role_email_mandatory CHECK (
    (role::text IN ('student', 'teacher', 'admin') AND email IS NOT NULL) OR 
    (role::text = 'parent')
);

-- 5. RLS Policies
-- Enable RLS for the new tables
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- email_otp_verifications: Users can only see their own records, Service Role can do anything
DROP POLICY IF EXISTS "Users can view their own OTP verifications" ON public.email_otp_verifications;
CREATE POLICY "Users can view their own OTP verifications" ON public.email_otp_verifications
    FOR SELECT USING (auth.uid() = user_id);

-- system_config: Public can read for configuration check, Only Admins can update
DROP POLICY IF EXISTS "Anyone can read system configuration" ON public.system_config;
CREATE POLICY "Anyone can read system configuration" ON public.system_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify system configuration" ON public.system_config;
CREATE POLICY "Only admins can modify system configuration" ON public.system_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

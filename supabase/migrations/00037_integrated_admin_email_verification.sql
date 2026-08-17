-- Ensure uniqueness for admin emails
-- First, clean up any NULL emails that might conflict if we were to apply unique (though unique allows multiple nulls)
-- But we want admins to have unique emails if they have one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_admin_email ON public.profiles (email) WHERE role = 'admin';

-- Modify email_verification_otps to make profile_id optional (for new admin creation)
ALTER TABLE public.email_verification_otps ALTER COLUMN profile_id DROP NOT NULL;

-- Add index for email lookup in email_verification_otps
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_email ON public.email_verification_otps(email);

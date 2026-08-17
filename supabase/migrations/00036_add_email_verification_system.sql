-- 1. Add email_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 2. Create email_verification_otps table for temporary storage
CREATE TABLE IF NOT EXISTS public.email_verification_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_resend_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Policy for email_verification_otps (Read/Write only via Edge Functions / Service Role)
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;
-- No public/authenticated user access needed for this table if we use service_role in Edge Functions

-- 4. Simple index for cleanup and fast lookup
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_profile_email ON public.email_verification_otps(profile_id, email);

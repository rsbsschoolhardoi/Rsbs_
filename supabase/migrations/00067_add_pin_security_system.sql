-- Add PIN related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pin TEXT,
ADD COLUMN IF NOT EXISTS pin_setup_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS pin_attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_lockout_until TIMESTAMP WITH TIME ZONE;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.pin IS 'Hashed 4-digit numeric PIN for secondary authentication';
COMMENT ON COLUMN public.profiles.pin_setup_required IS 'Whether the user is forced to change their PIN on next login';
COMMENT ON COLUMN public.profiles.pin_attempt_count IS 'Number of consecutive failed PIN attempts';
COMMENT ON COLUMN public.profiles.pin_lockout_until IS 'Timestamp until which PIN verification is locked';

-- Create a function to increment pin attempts and handle lockout
CREATE OR REPLACE FUNCTION public.handle_pin_failure(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET pin_attempt_count = pin_attempt_count + 1
    WHERE id = user_id;

    UPDATE public.profiles
    SET pin_lockout_until = NOW() + INTERVAL '24 hours',
        pin_attempt_count = 0
    WHERE id = user_id AND pin_attempt_count >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to reset pin attempts on success
CREATE OR REPLACE FUNCTION public.reset_pin_attempts(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET pin_attempt_count = 0,
        pin_lockout_until = NULL
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

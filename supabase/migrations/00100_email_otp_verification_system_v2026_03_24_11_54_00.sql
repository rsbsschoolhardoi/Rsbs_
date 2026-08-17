-- 1. Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update profiles with OTP-specific fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS otp_cooldown_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- 3. Stored Procedure for OTP verification
CREATE OR REPLACE FUNCTION verify_user_email_otp(p_user_id UUID, p_otp_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_otp RECORD;
    v_input_hash TEXT;
BEGIN
    -- Get most recent OTP record for this user
    SELECT * INTO r_otp FROM email_otp_verifications 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No valid OTP found. Please request a new one.');
    END IF;

    -- Check attempt limit (Requirement 5.2)
    IF r_otp.attempt_count >= 5 THEN
        DELETE FROM email_otp_verifications WHERE id = r_otp.id;
        RETURN jsonb_build_object('success', false, 'message', 'Maximum attempts reached. Please request a new OTP.');
    END IF;

    -- Check expiry (Requirement 5.1: 5 minutes)
    IF r_otp.expires_at < now() THEN
        DELETE FROM email_otp_verifications WHERE id = r_otp.id;
        RETURN jsonb_build_object('success', false, 'message', 'OTP has expired. Please request a new one.');
    END IF;

    -- Hashing the input for comparison (Requirement 4.3)
    v_input_hash := encode(digest(p_otp_input, 'sha256'), 'hex');

    IF r_otp.otp_hash = v_input_hash THEN
        -- Success Case
        UPDATE profiles SET 
            email_verified = true,
            otp_verified_at = now()
        WHERE id = p_user_id;

        -- Cleanup (Requirement 8.1)
        DELETE FROM email_otp_verifications WHERE user_id = p_user_id;

        RETURN jsonb_build_object('success', true, 'message', 'OTP verified successfully.');
    ELSE
        -- Failure Case
        UPDATE email_otp_verifications 
        SET attempt_count = attempt_count + 1 
        WHERE id = r_otp.id;

        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Invalid OTP code.', 
            'remaining_attempts', 5 - (r_otp.attempt_count + 1)
        );
    END IF;
END;
$$;

-- 4. Stored Procedure to handle OTP generation and cleanup logic
-- This will be called by the Edge Function or backend before sending the email
CREATE OR REPLACE FUNCTION generate_user_email_otp(p_user_id UUID, p_otp_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
    v_cooldown_until TIMESTAMPTZ;
BEGIN
    -- 1. Check if user exists and get their email
    SELECT email, otp_cooldown_until INTO v_email, v_cooldown_until FROM profiles WHERE id = p_user_id;
    
    IF v_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No registered email found for this account.');
    END IF;

    -- 2. Check Cooldown (Requirement 6.2: 30 seconds)
    IF v_cooldown_until IS NOT NULL AND v_cooldown_until > now() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Please wait before requesting a new code.',
            'cooldown_remaining', extract(epoch from (v_cooldown_until - now()))
        );
    END IF;

    -- 3. Cleanup existing OTPs (Requirement 8.2)
    DELETE FROM email_otp_verifications WHERE user_id = p_user_id;

    -- 4. Insert new OTP record (Requirement 4.3)
    INSERT INTO email_otp_verifications (
        user_id,
        email,
        otp_hash,
        expires_at
    ) VALUES (
        p_user_id,
        v_email,
        p_otp_hash,
        now() + interval '5 minutes'
    );

    -- 5. Set Cooldown (30 seconds)
    UPDATE profiles SET otp_cooldown_until = now() + interval '30 seconds' WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

-- 5. Daily Cleanup Job (Requirement 8.4)
-- This can be run as a cron job if pg_cron is available, otherwise it's just the logic
CREATE OR REPLACE FUNCTION cleanup_stale_otps()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM email_otp_verifications 
    WHERE expires_at < now() 
    OR attempt_count >= 5;
END;
$$;

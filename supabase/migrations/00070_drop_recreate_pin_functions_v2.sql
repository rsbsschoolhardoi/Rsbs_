-- Drop existing functions to allow for parameter changes
DROP FUNCTION IF EXISTS public.handle_pin_failure(uuid);
DROP FUNCTION IF EXISTS public.reset_pin_attempts(uuid);
DROP FUNCTION IF EXISTS public.verify_user_pin(uuid, text);
DROP FUNCTION IF EXISTS public.update_user_pin(uuid, text);

-- Re-create functions with standardized parameter naming
CREATE OR REPLACE FUNCTION public.handle_pin_failure(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_attempts INTEGER;
BEGIN
    UPDATE public.profiles
    SET pin_attempt_count = COALESCE(pin_attempt_count, 0) + 1
    WHERE id = p_user_id
    RETURNING pin_attempt_count INTO v_attempts;

    -- Lock if 6 or more attempts (Requirement 6: 6th incorrect attempt locks)
    IF v_attempts >= 6 THEN
        UPDATE public.profiles
        SET pin_lockout_until = NOW() + INTERVAL '24 hours'
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reset_pin_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET pin_attempt_count = 0,
        pin_lockout_until = NULL
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.verify_user_pin(p_user_id UUID, p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
    v_stored_pin TEXT;
    v_lockout_until TIMESTAMP WITH TIME ZONE;
    v_attempt_count INTEGER;
BEGIN
    SELECT pin, pin_lockout_until, pin_attempt_count 
    INTO v_stored_pin, v_lockout_until, v_attempt_count
    FROM public.profiles 
    WHERE id = p_user_id;

    -- Requirement 7: While locked, user cannot proceed even with correct PIN
    IF v_lockout_until IS NOT NULL AND v_lockout_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'PIN access is locked. Please contact an admin.',
            'lockout_until', v_lockout_until,
            'status', 'locked'
        );
    END IF;

    -- Safety check if PIN is not set (Requirement 11 logic: "Not Set")
    IF v_stored_pin IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'PIN is not set. Please create your PIN first.',
            'status', 'not_set'
        );
    END IF;

    -- Verify PIN
    IF v_stored_pin = p_pin THEN
        -- Success: reset attempts
        PERFORM public.reset_pin_attempts(p_user_id);
        RETURN jsonb_build_object('success', true);
    ELSE
        -- Failure: increment and check lockout
        PERFORM public.handle_pin_failure(p_user_id);
        
        -- Re-fetch for accurate response
        SELECT pin_lockout_until, pin_attempt_count 
        INTO v_lockout_until, v_attempt_count
        FROM public.profiles 
        WHERE id = p_user_id;

        IF v_lockout_until IS NOT NULL AND v_lockout_until > NOW() THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Maximum attempts reached. Access locked for 24 hours.',
                'lockout_until', v_lockout_until,
                'status', 'locked'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Incorrect PIN. ' || (6 - COALESCE(v_attempt_count, 0)) || ' attempts remaining.',
                'remaining_attempts', 6 - COALESCE(v_attempt_count, 0),
                'status', 'incorrect'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_pin(p_user_id UUID, p_new_pin TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET pin = p_new_pin,
        pin_setup_required = FALSE,
        pin_attempt_count = 0,
        pin_lockout_until = NULL
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

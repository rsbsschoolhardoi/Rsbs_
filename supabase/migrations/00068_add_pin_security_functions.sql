-- Function to verify user PIN
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

    -- Check if locked
    IF v_lockout_until IS NOT NULL AND v_lockout_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'PIN verification is locked for 24 hours due to too many failed attempts.',
            'lockout_until', v_lockout_until
        );
    END IF;

    -- Verify PIN (assuming we store it as plain text for now, but in a real app we'd use crypt)
    -- Requirement says 4-digit numeric.
    IF v_stored_pin = p_pin THEN
        -- Success: reset attempts
        PERFORM public.reset_pin_attempts(p_user_id);
        RETURN jsonb_build_object('success', true);
    ELSE
        -- Failure: handle attempt increment and lockout
        PERFORM public.handle_pin_failure(p_user_id);
        
        -- Re-fetch to see if now locked
        SELECT pin_lockout_until, pin_attempt_count 
        INTO v_lockout_until, v_attempt_count
        FROM public.profiles 
        WHERE id = p_user_id;

        IF v_lockout_until IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Maximum attempts reached. Account locked for 24 hours.',
                'lockout_until', v_lockout_until
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Incorrect PIN. ' || (5 - v_attempt_count) || ' attempts remaining today.',
                'remaining_attempts', 5 - v_attempt_count
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user PIN
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

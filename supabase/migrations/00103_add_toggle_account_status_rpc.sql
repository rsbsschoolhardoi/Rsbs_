create or replace function public.toggle_account_status(p_user_id uuid, p_status text)
returns void as $$
DECLARE
    v_current_status text;
BEGIN
    -- 1. Authorization: Only Master Admins can toggle account status
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_master = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only Master Admins can change account status.';
    END IF;

    -- 2. Self-protection: An admin cannot restrict themselves
    IF p_user_id = auth.uid() AND p_status = 'restricted' THEN
        RAISE EXCEPTION 'You cannot restrict your own account status.';
    END IF;

    -- 3. Validate status values
    IF p_status NOT IN ('active', 'restricted') THEN
        RAISE EXCEPTION 'Invalid account status value.';
    END IF;

    -- 4. Update the status
    UPDATE public.profiles
    SET account_status = p_status,
        updated_at = now()
    WHERE id = p_user_id;

    -- 5. Log the action
    INSERT INTO public.verification_logs (user_id, email, event_type, metadata)
    SELECT id, email, 'account_status_changed', jsonb_build_object('new_status', p_status, 'action_by', auth.uid())
    FROM public.profiles
    WHERE id = p_user_id;
END;
$$ language plpgsql security definer;

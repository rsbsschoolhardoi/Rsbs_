-- Update toggle_master_status to automatically grant all permissions when promoting to master
CREATE OR REPLACE FUNCTION public.toggle_master_status(p_user_id uuid, p_status boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_all_perms text[];
BEGIN
    -- Check if current user is master (SECURITY DEFINER context needs auth check)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_master = TRUE
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only Master Admins can toggle master status.';
    END IF;

    -- Requirement 3: An active master_admin cannot downgrade their own role.
    IF p_user_id = auth.uid() AND p_status = FALSE THEN
        RAISE EXCEPTION 'Cannot downgrade your own master status.';
    END IF;

    -- Update the status
    IF p_status = TRUE THEN
        -- Get all current permissions
        SELECT array_agg(id) INTO v_all_perms FROM public.modules;
        
        UPDATE public.profiles
        SET is_master = TRUE,
            permissions = v_all_perms
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET is_master = FALSE
        WHERE id = p_user_id;
    END IF;
END;
$function$;

-- Create trigger function to automatically grant new module permissions to all master admins
CREATE OR REPLACE FUNCTION public.sync_new_module_to_masters()
RETURNS TRIGGER AS $$
BEGIN
    -- Add the new module ID to the permissions array of all Master Admins
    -- only if it's not already present
    UPDATE public.profiles
    SET permissions = array_append(permissions, NEW.id)
    WHERE is_master = TRUE 
      AND (permissions IS NULL OR NOT (NEW.id = ANY(permissions)));
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run when a new module is added
DROP TRIGGER IF EXISTS trigger_sync_new_module_to_masters ON public.modules;
CREATE TRIGGER trigger_sync_new_module_to_masters
AFTER INSERT ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.sync_new_module_to_masters();

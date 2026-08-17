-- Trigger function to ensure new or promoted Master Admins get all permissions
CREATE OR REPLACE FUNCTION public.ensure_master_admin_full_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_all_perms text[];
BEGIN
    -- Only act if is_master is true AND (either it's a new record OR it was previously false)
    IF NEW.is_master = TRUE AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_master = FALSE)) THEN
        -- Get all available module IDs
        SELECT array_agg(id) INTO v_all_perms FROM public.modules;
        
        -- Assign all permissions to the account
        NEW.permissions := v_all_perms;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run before a profile is inserted or updated
DROP TRIGGER IF EXISTS trigger_ensure_master_admin_full_permissions ON public.profiles;
CREATE TRIGGER trigger_ensure_master_admin_full_permissions
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_master_admin_full_permissions();

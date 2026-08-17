-- Create trigger function to prevent deletion of Master Admin profiles
CREATE OR REPLACE FUNCTION public.prevent_master_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- If the profile being deleted is a Master Admin, raise an exception
    IF OLD.is_master = TRUE THEN
        RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Deletion of Master Admin accounts is strictly prohibited by system security policy.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run before a profile is deleted
DROP TRIGGER IF EXISTS trigger_prevent_master_admin_deletion ON public.profiles;
CREATE TRIGGER trigger_prevent_master_admin_deletion
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_master_admin_deletion();

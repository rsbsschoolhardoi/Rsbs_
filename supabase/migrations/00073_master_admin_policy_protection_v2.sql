-- Add policy to prevent self-downgrade of master status
CREATE POLICY "Master admins cannot downgrade themselves"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow update if:
  -- 1. User is not updating their own is_master field, OR
  -- 2. User is not a master admin, OR
  -- 3. User is not trying to set is_master to false
  (auth.uid() != id) OR 
  (NOT (SELECT is_master FROM public.profiles WHERE id = auth.uid())) OR
  (is_master = TRUE)
)
WITH CHECK (
  (auth.uid() != id) OR 
  (NOT (SELECT is_master FROM public.profiles WHERE id = auth.uid())) OR
  (is_master = TRUE)
);

COMMENT ON POLICY "Master admins cannot downgrade themselves" ON public.profiles IS 
'Requirement 3: An active master_admin cannot downgrade their own role.';

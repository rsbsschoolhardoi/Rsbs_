-- Ensure uniqueness of email for admins
DROP INDEX IF EXISTS idx_unique_admin_email;
CREATE UNIQUE INDEX idx_unique_admin_email ON profiles (email) WHERE role = 'admin';

-- Create a view for username resolution
-- This view allows us to find the email for a given username during login
-- Only for admins who have a verified email
CREATE OR REPLACE VIEW public.admin_username_lookup AS
SELECT username, email
FROM public.profiles
WHERE role = 'admin' AND email_verified = true;

-- Grant access to the view
GRANT SELECT ON public.admin_username_lookup TO anon, authenticated;

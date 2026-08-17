ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_custom_tag text;
COMMENT ON COLUMN profiles.admin_custom_tag IS 'Requirement 2: Admin custom role tag to replace standard System Administrator label';

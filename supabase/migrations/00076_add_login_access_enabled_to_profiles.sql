ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_access_enabled boolean DEFAULT true;
COMMENT ON COLUMN profiles.login_access_enabled IS 'Requirement 1: System-wide login access control (Enabled/Disabled)';

-- Ensure existing users have it set to true
UPDATE profiles SET login_access_enabled = true WHERE login_access_enabled IS NULL;

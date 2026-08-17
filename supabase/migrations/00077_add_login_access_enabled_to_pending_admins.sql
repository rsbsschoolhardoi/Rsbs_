ALTER TABLE pending_admins ADD COLUMN IF NOT EXISTS login_access_enabled boolean DEFAULT true;
COMMENT ON COLUMN pending_admins.login_access_enabled IS 'Requirement 4: Persistent login access state during verification';

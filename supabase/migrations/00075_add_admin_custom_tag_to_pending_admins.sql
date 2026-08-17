ALTER TABLE pending_admins ADD COLUMN IF NOT EXISTS admin_custom_tag text;
COMMENT ON COLUMN pending_admins.admin_custom_tag IS 'Requirement 4: Admin custom role tag to be assigned after verification';

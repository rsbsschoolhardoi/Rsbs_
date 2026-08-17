-- Ensure email_verified defaults to false
ALTER TABLE profiles ALTER COLUMN email_verified SET DEFAULT false;

-- Update existing profiles where email_verified is null
UPDATE profiles SET email_verified = false WHERE email_verified IS NULL;

-- Remove the global toggle from module_settings if it exists
DELETE FROM module_settings WHERE module_id = 'email_verification_enforcement';

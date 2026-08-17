-- Remove the custom OTP system
DROP TABLE IF EXISTS email_verification_otps;

-- Ensure uniqueness of email for admins
-- This index already exists but let's make sure it's correct
DROP INDEX IF EXISTS idx_unique_admin_email;
CREATE UNIQUE INDEX idx_unique_admin_email ON profiles (email) WHERE role = 'admin';

-- Add columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS verification_id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS verification_id TEXT;

-- Populate existing students with unique IDs
UPDATE students 
SET verification_id = 'RSBS0' || 
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1) ||
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1) ||
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1) ||
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1)
WHERE verification_id IS NULL;

-- Populate existing teachers with unique IDs
UPDATE teachers 
SET verification_id = 'RSBS0' || 
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1) ||
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1) ||
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1) ||
  substring('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' FROM floor(random()*36+1)::int FOR 1)
WHERE verification_id IS NULL;

-- Enforce constraints
ALTER TABLE students ALTER COLUMN verification_id SET NOT NULL;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_verification_id_key;
ALTER TABLE students ADD CONSTRAINT students_verification_id_key UNIQUE (verification_id);
DROP INDEX IF EXISTS students_verification_id_idx;
CREATE INDEX students_verification_id_idx ON students (verification_id);

ALTER TABLE teachers ALTER COLUMN verification_id SET NOT NULL;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_verification_id_key;
ALTER TABLE teachers ADD CONSTRAINT teachers_verification_id_key UNIQUE (verification_id);
DROP INDEX IF EXISTS teachers_verification_id_idx;
CREATE INDEX teachers_verification_id_idx ON teachers (verification_id);

-- Update public_student_verification view to include verification_id
DROP VIEW IF EXISTS public_student_verification;
CREATE OR REPLACE VIEW public_student_verification AS
SELECT 
  s.login_id,
  s.verification_id,
  s.name,
  s.class,
  s.section,
  s.session_info,
  s.profile_picture_url,
  CASE WHEN s.is_blocked THEN 'Blocked' ELSE 'Active' END as status,
  b.school_name,
  b.school_logo_url
FROM students s
CROSS JOIN (SELECT school_name, school_logo_url FROM branding_settings LIMIT 1) b;

-- Grant access to the updated view
ALTER VIEW public_student_verification OWNER TO postgres;
GRANT SELECT ON public_student_verification TO anon, authenticated;

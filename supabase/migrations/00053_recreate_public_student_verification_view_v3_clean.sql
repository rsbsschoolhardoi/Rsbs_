-- Drop the old view if it exists
DROP VIEW IF EXISTS public_student_verification;

-- Create the secure public view for student verification with more fields
CREATE OR REPLACE VIEW public_student_verification AS
SELECT 
  s.login_id,
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

-- Grant access to the view
ALTER VIEW public_student_verification OWNER TO postgres;
GRANT SELECT ON public_student_verification TO anon, authenticated;

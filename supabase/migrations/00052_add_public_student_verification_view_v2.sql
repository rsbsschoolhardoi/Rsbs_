-- Create a secure public view for student verification
CREATE OR REPLACE VIEW public_student_verification AS
SELECT 
  s.login_id,
  s.name,
  s.class,
  s.section,
  CASE WHEN s.is_blocked THEN 'Blocked' ELSE 'Active' END as status,
  (SELECT school_name FROM branding_settings LIMIT 1) as school_name
FROM students s;

-- Grant access to the view
ALTER VIEW public_student_verification OWNER TO postgres;
GRANT SELECT ON public_student_verification TO anon, authenticated;

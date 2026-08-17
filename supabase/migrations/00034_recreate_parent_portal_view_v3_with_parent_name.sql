DROP VIEW IF EXISTS public.parent_portal_students CASCADE;

CREATE VIEW public.parent_portal_students AS
SELECT 
    p.id as parent_profile_id,
    p.parent_id as parent_login_id,
    p.full_name as parent_full_name,
    s.id as student_id,
    s.name as student_name,
    s.class as student_class,
    s.section as student_section,
    s.login_id as student_login_id,
    s.dob as student_dob,
    s.gender as student_gender,
    s.student_type,
    s.fee_status,
    s.profile_picture_url
FROM parents p
JOIN parent_student_links psl ON p.id = psl.parent_id
JOIN students s ON psl.student_id = s.id;

-- Re-grant permissions
GRANT SELECT ON public.parent_portal_students TO authenticated;

-- Re-create the function
CREATE OR REPLACE FUNCTION get_parent_linked_students(p_profile_id uuid)
RETURNS SETOF parent_portal_students
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM parent_portal_students WHERE parent_profile_id = (
    SELECT parent_profile_id FROM profiles WHERE id = p_profile_id
  );
$$;

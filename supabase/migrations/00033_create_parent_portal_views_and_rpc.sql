-- Create a secure view for parents to see their linked students
CREATE OR REPLACE VIEW public.parent_portal_students AS
SELECT 
    p.id as parent_profile_id,
    p.parent_id as parent_login_id,
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

-- Ensure RLS or permissions for the view
ALTER VIEW public.parent_portal_students OWNER TO postgres;
GRANT SELECT ON public.parent_portal_students TO authenticated;

-- Policy for the view (using the profile link)
-- Since it's a view, we mainly control access via the API or specific RLS if supported, 
-- but better to define a function for the API to call.

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

-- Function to get student attendance for parent
CREATE OR REPLACE FUNCTION get_student_attendance_for_parent(p_student_id uuid, p_parent_profile_id uuid)
RETURNS TABLE (
    date date,
    status text,
    remarks text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check: Is this student linked to this parent?
    IF EXISTS (
        SELECT 1 FROM parent_student_links psl
        JOIN profiles prof ON prof.parent_profile_id = psl.parent_id
        WHERE psl.student_id = p_student_id AND prof.id = p_parent_profile_id
    ) THEN
        RETURN QUERY 
        SELECT a.date, a.status, a.remarks 
        FROM attendance a 
        WHERE a.student_id = p_student_id
        ORDER BY a.date DESC;
    ELSE
        RETURN;
    END IF;
END;
$$;

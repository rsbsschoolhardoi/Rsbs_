DROP FUNCTION IF EXISTS get_parent_linked_students(uuid);
DROP VIEW IF EXISTS parent_portal_students;

CREATE VIEW parent_portal_students AS
 SELECT p.id AS parent_profile_id,
    p.parent_id AS parent_login_id,
    p.full_name AS parent_full_name,
    s.id AS student_id,
    s.name AS student_name,
    s.class AS student_class,
    s.section AS student_section,
    s.login_id AS student_login_id,
    s.verification_id AS student_verification_id,
    s.dob AS student_dob,
    s.gender AS student_gender,
    s.student_type,
    s.fee_status,
    s.profile_picture_url,
    s.id_card_visible,
    s.certificate_visible
   FROM parents p
     JOIN parent_student_links psl ON p.id = psl.parent_id
     JOIN students s ON psl.student_id = s.id;

CREATE OR REPLACE FUNCTION get_parent_linked_students(p_profile_id uuid)
RETURNS SETOF parent_portal_students
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM parent_portal_students WHERE parent_profile_id = (
    SELECT parent_profile_id FROM profiles WHERE id = p_profile_id
  );
$$;

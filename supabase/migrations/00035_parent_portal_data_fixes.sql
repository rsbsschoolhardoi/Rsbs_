-- Fix Parent Portal Data Fetching & Permissions

-- 1. Ensure parent role can select their own profile and links
-- (Already mostly covered, but making it explicit for the 'parent' role)

-- 2. Update/Add RPCs for secure data access

-- Get notices relevant to a student (for parent portal)
CREATE OR REPLACE FUNCTION public.get_notices_for_parent(p_student_id uuid, p_parent_profile_id uuid)
RETURNS SETOF notices
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
        SELECT n.* 
        FROM notices n, students s
        WHERE s.id = p_student_id
        AND (
            n.target_type = 'all'
            OR (n.target_type = 'class' AND n.target_id = s.class_id)
            OR (n.target_type = 'section' AND n.target_id = s.section_id)
            OR (n.target_type = 'student' AND n.target_id = s.id)
        )
        ORDER BY n.created_at DESC;
    ELSE
        RETURN;
    END IF;
END;
$$;

-- Get timetable relevant to a student (for parent portal)
CREATE OR REPLACE FUNCTION public.get_timetable_for_parent(p_student_id uuid, p_parent_profile_id uuid)
RETURNS TABLE(
    id uuid,
    day_of_week text,
    period_number integer,
    start_time text,
    end_time text,
    subject_name text,
    teacher_name text,
    class_name text,
    section_name text
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
        SELECT 
            te.id,
            te.day_of_week,
            te.period_number,
            te.start_time,
            te.end_time,
            sub.name as subject_name,
            t.name as teacher_name,
            c.name as class_name,
            sec.name as section_name
        FROM timetable_entries te
        JOIN timetable_sessions ts ON te.session_id = ts.id
        JOIN students s ON s.id = p_student_id
        LEFT JOIN subjects sub ON te.subject_id = sub.id
        LEFT JOIN teachers t ON te.teacher_id = t.id
        LEFT JOIN classes c ON te.class_id = c.id
        LEFT JOIN sections sec ON te.section_id = sec.id
        WHERE ts.is_active = true
        AND te.class_id = s.class_id
        AND te.section_id = s.section_id
        ORDER BY 
            CASE te.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
            END,
            te.period_number;
    ELSE
        RETURN;
    END IF;
END;
$$;

-- 3. Add RLS Policies for parent role on relevant tables
-- Note: Using the helper is_admin if needed, but here we focus on parent links.

-- Students table: Parents can view linked students
CREATE POLICY "Parents can view linked students" ON students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN profiles prof ON prof.parent_profile_id = psl.parent_id
      WHERE psl.student_id = students.id AND prof.id = auth.uid()
    )
  );

-- Attendance table: Parents can view linked student attendance
CREATE POLICY "Parents can view linked student attendance" ON attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN profiles prof ON prof.parent_profile_id = psl.parent_id
      WHERE psl.student_id = attendance.student_id AND prof.id = auth.uid()
    )
  );

-- Notices table: Parents can view notices
-- (Already has 'Everyone can view notices' policy, but we can add a specific one if needed)

-- Timetable table: Parents can view timetable entries
CREATE POLICY "Parents can view timetable for their students" ON timetable_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN profiles prof ON prof.parent_profile_id = psl.parent_id
      JOIN students s ON psl.student_id = s.id
      WHERE s.class_id = timetable_entries.class_id 
      AND s.section_id = timetable_entries.section_id
      AND prof.id = auth.uid()
    )
  );

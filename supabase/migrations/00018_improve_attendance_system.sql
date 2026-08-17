-- Add class_id and section_id to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE;

-- Backfill data (optional but good practice)
UPDATE attendance a
SET 
  class_id = s.class_id,
  section_id = s.section_id
FROM students s
WHERE a.student_id = s.id AND (a.class_id IS NULL OR a.section_id IS NULL);

-- Add unique constraint for (student_id, date)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;
ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);

-- Ensure marked_by refers to profiles (admins) or teachers
-- (Implicitly works with UUID, but let's check policies if needed)

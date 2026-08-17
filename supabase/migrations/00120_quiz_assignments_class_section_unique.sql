CREATE UNIQUE INDEX IF NOT EXISTS quiz_assignments_class_section_unique
  ON public.quiz_assignments (quiz_id, target_type, target_id)
  WHERE target_type IN ('class', 'section');

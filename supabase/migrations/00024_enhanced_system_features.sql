-- Enhanced Messaging (Student Queries)
ALTER TABLE public.student_queries ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'admin';
ALTER TABLE public.student_queries ADD COLUMN IF NOT EXISTS target_teacher_id UUID REFERENCES public.teachers(id);

-- Teacher Notices with Visibility Controls
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'admin';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS visibility_scope TEXT DEFAULT 'all'; -- 'all', 'class', 'section'
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id);

-- Global Module Toggle & Access Control
ALTER TABLE public.module_settings ADD COLUMN IF NOT EXISTS role TEXT; -- 'student', 'teacher', 'admin'
ALTER TABLE public.module_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.module_settings ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'enabled'; -- 'enabled', 'disabled', 'deactivated'

-- Add setting for teacher public notice control
INSERT INTO public.module_settings (module_id, is_enabled, state)
VALUES ('allow_teacher_public_notices', true, 'enabled')
ON CONFLICT (module_id) DO NOTHING;

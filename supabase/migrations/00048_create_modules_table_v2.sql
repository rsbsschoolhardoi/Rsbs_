CREATE TABLE IF NOT EXISTS public.modules (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with ALL modules found in module_settings + the hardcoded list
INSERT INTO public.modules (id, label) VALUES
('dashboard', 'Dashboard'),
('students', 'Student Management'),
('classes', 'Class & Section'),
('fees', 'Fees'),
('attendance', 'Attendance'),
('exams', 'Exams'),
('notices', 'Notices'),
('gallery', 'Gallery'),
('school_home', 'School Home Content'),
('push_notifications', 'Push Notifications'),
('queries', 'Queries & Communication'),
('certificates', 'Certificate Generator'),
('parents', 'Parents Management'),
('parent_portal_visibility', 'Parent Portal Visibility'),
('parent_help_desk', 'Parent Help Desk'),
('parent_feedback', 'Parent Feedback'),
('parent_appointments', 'Parent Appointments'),
('admin_management', 'Admin Management'),
('timetable', 'Timetable'),
('appointments', 'Public Appointments'),
('admissions', 'Public Admissions'),
('allow_teacher_public_notices', 'Teacher Public Notices'),
('teachers', 'Teacher Management')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- Add foreign key reference (this should pass now)
ALTER TABLE public.module_settings 
DROP CONSTRAINT IF EXISTS fk_module_id,
ADD CONSTRAINT fk_module_id FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;

-- RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can read modules" ON public.modules;
CREATE POLICY "Everyone can read modules" ON public.modules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

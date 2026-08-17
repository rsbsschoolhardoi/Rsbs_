-- 1. Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create sections table
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(class_id, name)
);

-- 3. Modify students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- 4. Modify notices table for targeting
ALTER TABLE public.notices
ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'class', 'section', 'student')),
ADD COLUMN IF NOT EXISTS target_id UUID;

-- 5. Modify exams table for targeting
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'class', 'section', 'student')),
ADD COLUMN IF NOT EXISTS target_id UUID;

-- Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;

-- Basic RLS for classes and sections
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view classes" ON public.classes FOR SELECT TO public USING (true);
CREATE POLICY "Public can view sections" ON public.sections FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL TO authenticated USING (true);

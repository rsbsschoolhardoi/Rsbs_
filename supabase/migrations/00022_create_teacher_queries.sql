CREATE TABLE IF NOT EXISTS public.teacher_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied')),
    reply_content TEXT,
    replied_at TIMESTAMPTZ,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.teacher_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own queries" ON public.teacher_queries
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE teacher_id = teacher_queries.teacher_id));

CREATE POLICY "Teachers can insert their own queries" ON public.teacher_queries
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE teacher_id = teacher_queries.teacher_id));

CREATE POLICY "Admins can view all teacher queries" ON public.teacher_queries
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Admins can update teacher queries (reply)" ON public.teacher_queries
    FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

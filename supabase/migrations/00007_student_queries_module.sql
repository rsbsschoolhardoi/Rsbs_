-- Create queries table
CREATE TABLE IF NOT EXISTS public.student_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied')),
    reply_content TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_queries;

-- RLS
ALTER TABLE public.student_queries ENABLE ROW LEVEL SECURITY;

-- Students can view public queries and their own private ones
CREATE POLICY "Students can view appropriate queries" ON public.student_queries
    FOR SELECT TO authenticated
    USING (is_public = true OR (auth.uid() IN (SELECT id FROM profiles WHERE student_id = student_queries.student_id)));

-- Students can create queries
CREATE POLICY "Students can create queries" ON public.student_queries
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE student_id = student_queries.student_id));

-- Admins can do everything
CREATE POLICY "Admins have full access to queries" ON public.student_queries
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

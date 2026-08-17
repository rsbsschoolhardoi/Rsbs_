-- 1. Create leadership table
CREATE TABLE IF NOT EXISTS public.leadership (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('principal', 'teacher')),
    name TEXT NOT NULL,
    designation TEXT,
    image_url TEXT,
    message TEXT,
    years_of_service TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leadership;

-- RLS
ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view leadership" ON public.leadership FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage leadership" ON public.leadership FOR ALL TO authenticated USING (true);

-- 2. Insert placeholders for history if they don't exist
INSERT INTO public.school_info (section_key, title, content, is_visible, order_index)
VALUES 
('foundation_story', 'School Foundation Story', 'Founded in 1995 with a single classroom and a handful of students...', true, 10),
('growth_journey', 'Our Growth Journey', 'Over the years, we have expanded to include state-of-the-art labs...', true, 11)
ON CONFLICT (section_key) DO NOTHING;

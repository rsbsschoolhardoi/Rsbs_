-- School Info Table for Homepage Content
CREATE TABLE public.school_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT UNIQUE NOT NULL, -- 'introduction', 'contact', 'highlights', etc.
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_info;

-- RLS Policies
ALTER TABLE public.school_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view school info" ON public.school_info FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "Admins full access to school info" ON public.school_info FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Seed School Info
INSERT INTO public.school_info (section_key, title, content, order_index, is_visible)
VALUES 
('introduction', 'Welcome to RSBS School', 'RSBS School is a premier educational institution committed to excellence in academics, character development, and holistic growth. With state-of-the-art facilities and dedicated faculty, we nurture young minds to become future leaders.', 1, true),
('mission', 'Our Mission', 'To provide quality education that empowers students with knowledge, skills, and values to excel in a rapidly changing world.', 2, true),
('contact', 'Contact Us', 'Address: 123 Education Street, Knowledge City\nPhone: +1 (555) 123-4567\nEmail: info@rsbs-school.edu\nOffice Hours: Mon-Fri 8:00 AM - 4:00 PM', 3, true),
('highlights', 'School Highlights', '✓ Award-winning faculty\n✓ Modern laboratories and libraries\n✓ Sports and extracurricular programs\n✓ 95% university placement rate\n✓ Safe and nurturing environment', 4, true);

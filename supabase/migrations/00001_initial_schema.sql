-- Enum for roles
CREATE TYPE public.user_role AS ENUM ('student', 'admin');

-- Students Table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    student_type TEXT NOT NULL, -- Regular / Scholarship / etc.
    gender TEXT NOT NULL,
    dob DATE NOT NULL,
    contact TEXT NOT NULL,
    fee_details JSONB DEFAULT '[]'::jsonb, -- Array of objects: { amount, description, due_date }
    fee_status TEXT DEFAULT 'Pending', -- Paid / Pending / Overdue
    rank INTEGER DEFAULT 0,
    promotion_date DATE,
    session_info TEXT NOT NULL,
    profile_picture_url TEXT,
    login_id TEXT UNIQUE NOT NULL, -- Used as username
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table (Synced with auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'student',
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- Present / Absent / Late
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- Exams Table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notices Table
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_blue_tag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Table
CREATE TABLE public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery;

-- Sync auth.users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_count int;
    student_record record;
BEGIN
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    -- Check if username is a student login_id
    SELECT * INTO student_record FROM public.students WHERE login_id = NEW.raw_user_meta_data->>'username';

    INSERT INTO public.profiles (id, username, role, student_id)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        CASE 
            WHEN user_count = 0 THEN 'admin'::public.user_role 
            WHEN student_record.id IS NOT NULL THEN 'student'::public.user_role
            ELSE 'student'::public.user_role -- Default to student if no student record found
        END,
        student_record.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
    EXECUTE FUNCTION handle_new_user();

-- Helper to check if admin
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid AND p.role = 'admin'::user_role
    );
$$;

-- RLS Policies
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to students" ON public.students FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Students can view their own record" ON public.students FOR SELECT TO authenticated USING (
    id = (SELECT student_id FROM profiles WHERE id = auth.uid())
);

-- Attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to attendance" ON public.attendance FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Students can view their own attendance" ON public.attendance FOR SELECT TO authenticated USING (
    student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
);

-- Exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access to exams" ON public.exams FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Notices
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view notices" ON public.notices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins full access to notices" ON public.notices FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Gallery
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view gallery" ON public.gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins full access to gallery" ON public.gallery FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Storage Bucket for Images
INSERT INTO storage.buckets (id, name, public) VALUES ('app_aho9bv0iqbr5_school_images', 'app_aho9bv0iqbr5_school_images', true);

-- Storage Policies
CREATE POLICY "Admins can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app_aho9bv0iqbr5_school_images' AND is_admin(auth.uid()));
CREATE POLICY "Admins can update images" ON storage.objects FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'app_aho9bv0iqbr5_school_images' AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'app_aho9bv0iqbr5_school_images' AND is_admin(auth.uid()));
CREATE POLICY "Public can view images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'app_aho9bv0iqbr5_school_images');

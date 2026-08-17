-- Alter students table for blocking (in case the previous failed)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='is_blocked') THEN
        ALTER TABLE public.students ADD COLUMN is_blocked boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='block_reason') THEN
        ALTER TABLE public.students ADD COLUMN block_reason text;
    END IF;
END $$;

-- Create student_sessions table if not exists
CREATE TABLE IF NOT EXISTS public.student_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_id text NOT NULL,
    student_name text NOT NULL,
    device_info text,
    ip_address text,
    login_time timestamptz DEFAULT now(),
    last_activity timestamptz DEFAULT now(),
    status text DEFAULT 'active' CHECK (status IN ('active', 'forced_logout', 'expired')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;

-- Master Admins have full access to student_sessions
DROP POLICY IF EXISTS "Master admins have full access to student_sessions" ON public.student_sessions;
CREATE POLICY "Master admins have full access to student_sessions"
ON public.student_sessions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_master = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_master = true
    )
);

-- Students can read their own sessions
DROP POLICY IF EXISTS "Students can read their own sessions" ON public.student_sessions;
CREATE POLICY "Students can read their own sessions"
ON public.student_sessions
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Students can create their own sessions
DROP POLICY IF EXISTS "Students can create their own sessions" ON public.student_sessions;
CREATE POLICY "Students can create their own sessions"
ON public.student_sessions
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Update Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE student_sessions;

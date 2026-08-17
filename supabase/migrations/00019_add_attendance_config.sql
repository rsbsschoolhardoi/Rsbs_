CREATE TABLE IF NOT EXISTS public.attendance_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time TIME NOT NULL DEFAULT '08:30:00',
    end_time TIME NOT NULL DEFAULT '09:00:00',
    is_restriction_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default configuration if not exists
INSERT INTO public.attendance_config (id, start_time, end_time, is_restriction_enabled)
SELECT gen_random_uuid(), '08:30:00', '09:00:00', true
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_config);

-- RLS
ALTER TABLE public.attendance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to attendance_config" 
ON public.attendance_config 
FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view attendance_config" 
ON public.attendance_config 
FOR SELECT 
TO authenticated 
USING (true);

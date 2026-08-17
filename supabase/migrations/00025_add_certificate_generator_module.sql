-- Add certificate_visible to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS certificate_visible BOOLEAN DEFAULT false;

-- Create branding_settings table
CREATE TABLE IF NOT EXISTS public.branding_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL DEFAULT 'RSBS School',
    school_logo_url TEXT,
    principal_name TEXT NOT NULL DEFAULT 'Principal Name',
    principal_signature_url TEXT,
    school_seal_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for branding_settings
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Policies for branding_settings
CREATE POLICY "Public read branding settings" ON public.branding_settings
    FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage branding settings" ON public.branding_settings
    FOR ALL TO authenticated
    USING (has_permission(auth.uid(), 'certificates'))
    WITH CHECK (has_permission(auth.uid(), 'certificates'));

-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id)
);

-- Enable RLS for certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Policies for certificates
CREATE POLICY "Students view their own certificates" ON public.certificates
    FOR SELECT TO authenticated
    USING (
        student_id = (SELECT s.id FROM public.students s WHERE s.id = certificates.student_id AND s.certificate_visible = true)
        OR has_permission(auth.uid(), 'certificates')
    );

CREATE POLICY "Admins manage certificates" ON public.certificates
    FOR ALL TO authenticated
    USING (has_permission(auth.uid(), 'certificates'))
    WITH CHECK (has_permission(auth.uid(), 'certificates'));

-- Insert default row into branding_settings if not exists
INSERT INTO public.branding_settings (school_name)
SELECT 'RSBS School'
WHERE NOT EXISTS (SELECT 1 FROM public.branding_settings);

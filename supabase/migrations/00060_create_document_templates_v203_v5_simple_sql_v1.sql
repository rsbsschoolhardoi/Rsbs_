-- Create document templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('Certificate', 'ID Card', 'Admission Certificate', 'Result')),
    layout_config JSONB NOT NULL DEFAULT '{"header_enabled": true, "body_enabled": true, "footer_enabled": true}',
    content_config JSONB NOT NULL DEFAULT '{"header": [], "body": [], "footer": []}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can do everything with document_templates" 
ON public.document_templates 
FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add to modules if needed (assuming there's a modules table)
INSERT INTO public.modules (id, label)
VALUES ('templates', 'Document Templates')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to existing admins (optional, depends on how your system works)
-- Assuming all admins should have access to templates by default or master admin manages it

-- Create api_configs table
CREATE TABLE IF NOT EXISTS public.api_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    headers JSONB DEFAULT '[]'::JSONB,
    variables JSONB DEFAULT '[]'::JSONB,
    bodies JSONB DEFAULT '[]'::JSONB,
    response_field TEXT,
    auth_type TEXT DEFAULT 'none',
    api_key TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_applied TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Create chatbots table (initial state with single api_id)
CREATE TABLE IF NOT EXISTS public.chatbots (
    id TEXT PRIMARY KEY, -- Module ID like 'ai-chat', 'study-ai'
    name TEXT NOT NULL,
    api_id UUID REFERENCES public.api_configs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage api_configs" ON public.api_configs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage chatbots" ON public.chatbots
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed initial chatbots (modules)
INSERT INTO public.chatbots (id, name)
VALUES 
('ai-chat', 'AI Chat'),
('study-ai', 'Study AI'),
('dashboard', 'User Dashboard')
ON CONFLICT (id) DO NOTHING;

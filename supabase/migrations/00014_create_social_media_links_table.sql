CREATE TABLE public.social_media_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform text NOT NULL,
    url text NOT NULL,
    is_visible boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_links ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins have full access to social_media_links"
ON public.social_media_links
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Public access to read visible links
CREATE POLICY "Anyone can read visible social_media_links"
ON public.social_media_links
FOR SELECT
TO anon, authenticated
USING (is_visible = true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE social_media_links;

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all';
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS target_classes UUID[];
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ DEFAULT (now() + interval '7 days');

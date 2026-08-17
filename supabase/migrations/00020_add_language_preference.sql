-- Add language preference column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'en';

-- Add check constraint for valid languages
ALTER TABLE public.profiles ADD CONSTRAINT valid_language CHECK (language_preference IN ('en', 'hi'));

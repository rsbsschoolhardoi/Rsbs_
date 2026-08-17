-- Add profile_tag column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_tag TEXT;
ALTER TABLE public.students ADD CONSTRAINT valid_student_tag CHECK (profile_tag IN ('blue', 'black', 'grey') OR profile_tag IS NULL);

-- Add profile_tag column to teachers table
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS profile_tag TEXT;
ALTER TABLE public.teachers ADD CONSTRAINT valid_teacher_tag CHECK (profile_tag IN ('blue', 'black', 'grey') OR profile_tag IS NULL);

-- Add profile_tag column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_tag TEXT;
ALTER TABLE public.profiles ADD CONSTRAINT valid_profile_tag CHECK (profile_tag IN ('blue', 'black', 'grey') OR profile_tag IS NULL);

-- Migrate existing is_blue_tag data to profile_tag for students
UPDATE public.students SET profile_tag = 'blue' WHERE is_blue_tag = true AND profile_tag IS NULL;

-- Migrate existing is_blue_tag data to profile_tag for profiles
UPDATE public.profiles SET profile_tag = 'blue' WHERE is_blue_tag = true AND profile_tag IS NULL;

-- Create index for faster tag queries
CREATE INDEX IF NOT EXISTS idx_students_profile_tag ON public.students(profile_tag);
CREATE INDEX IF NOT EXISTS idx_teachers_profile_tag ON public.teachers(profile_tag);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_tag ON public.profiles(profile_tag);

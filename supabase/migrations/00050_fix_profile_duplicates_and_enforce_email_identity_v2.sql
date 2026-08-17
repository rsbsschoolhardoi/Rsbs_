-- 0. Fix duplicates in profiles
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rnum
    FROM public.profiles
    WHERE email = 'azadpremium119@gmail.com'
)
UPDATE public.profiles p
SET email = LOWER(TRIM(p.username)) || '@rsbs-school.com'
FROM duplicates d
WHERE p.id = d.id AND d.rnum > 1;

-- 1. Add email column to students if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'email') THEN
        ALTER TABLE public.students ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Fill missing emails with unique placeholders
UPDATE public.students SET email = LOWER(TRIM(login_id)) || '@rsbs-school.com' WHERE email IS NULL OR email = '';
UPDATE public.teachers SET email = LOWER(TRIM(login_id)) || '@rsbs-school.com' WHERE email IS NULL OR email = '';
UPDATE public.parents SET email = LOWER(TRIM(parent_id)) || '@rsbs-school.com' WHERE email IS NULL OR email = '';
UPDATE public.profiles SET email = LOWER(TRIM(username)) || '@rsbs-school.com' WHERE email IS NULL OR email = '';

-- Normalize existing emails
UPDATE public.students SET email = LOWER(TRIM(email));
UPDATE public.teachers SET email = LOWER(TRIM(email));
UPDATE public.parents SET email = LOWER(TRIM(email));
UPDATE public.profiles SET email = LOWER(TRIM(email));

-- Ensure uniqueness after normalization
UPDATE public.profiles p SET email = LOWER(TRIM(username)) || '@rsbs-school.com' WHERE email IN (SELECT email FROM public.profiles GROUP BY email HAVING COUNT(*) > 1);
UPDATE public.students p SET email = LOWER(TRIM(login_id)) || '@rsbs-school.com' WHERE email IN (SELECT email FROM public.students GROUP BY email HAVING COUNT(*) > 1);
UPDATE public.teachers p SET email = LOWER(TRIM(login_id)) || '@rsbs-school.com' WHERE email IN (SELECT email FROM public.teachers GROUP BY email HAVING COUNT(*) > 1);
UPDATE public.parents p SET email = LOWER(TRIM(parent_id)) || '@rsbs-school.com' WHERE email IN (SELECT email FROM public.parents GROUP BY email HAVING COUNT(*) > 1);

-- 3. Set NOT NULL constraint
ALTER TABLE public.students ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.parents ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- 4. Add individual UNIQUE indexes
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_email_unique;
ALTER TABLE public.students ADD CONSTRAINT students_email_unique UNIQUE (email);

ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_email_unique;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_email_unique UNIQUE (email);

ALTER TABLE public.parents DROP CONSTRAINT IF EXISTS parents_email_unique;
ALTER TABLE public.parents ADD CONSTRAINT parents_email_unique UNIQUE (email);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- 5. Cross-table uniqueness validation function
CREATE OR REPLACE FUNCTION public.validate_global_email_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
    email_exists BOOLEAN;
BEGIN
    NEW.email = LOWER(TRIM(NEW.email));
    
    -- Check uniqueness across all user tables
    SELECT (
        EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND id != NEW.id) OR
        EXISTS (SELECT 1 FROM public.students WHERE email = NEW.email AND id != NEW.id) OR
        EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email AND id != NEW.id) OR
        EXISTS (SELECT 1 FROM public.parents WHERE email = NEW.email AND id != NEW.id)
    ) INTO email_exists;

    IF email_exists THEN
        RAISE EXCEPTION 'Email % is already linked to another account in the system.', NEW.email;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS trg_validate_student_email ON public.students;
CREATE TRIGGER trg_validate_student_email
BEFORE INSERT OR UPDATE OF email ON public.students
FOR EACH ROW EXECUTE FUNCTION public.validate_global_email_uniqueness();

DROP TRIGGER IF EXISTS trg_validate_teacher_email ON public.teachers;
CREATE TRIGGER trg_validate_teacher_email
BEFORE INSERT OR UPDATE OF email ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.validate_global_email_uniqueness();

DROP TRIGGER IF EXISTS trg_validate_parent_email ON public.parents;
CREATE TRIGGER trg_validate_parent_email
BEFORE INSERT OR UPDATE OF email ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.validate_global_email_uniqueness();

DROP TRIGGER IF EXISTS trg_validate_profile_email ON public.profiles;
CREATE TRIGGER trg_validate_profile_email
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_global_email_uniqueness();

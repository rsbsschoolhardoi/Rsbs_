-- Modify the validation function to account for linked profiles/entities
CREATE OR REPLACE FUNCTION public.validate_global_email_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
    email_exists BOOLEAN;
    linked_profile_id UUID;
    linked_student_id UUID;
    linked_teacher_id UUID;
    linked_parent_id UUID;
BEGIN
    NEW.email = LOWER(TRIM(NEW.email));
    
    -- Identify linked IDs to exclude from uniqueness check for this specific user
    IF TG_TABLE_NAME = 'profiles' THEN
        linked_student_id := NEW.student_id;
        linked_teacher_id := NEW.teacher_id;
        linked_parent_id := NEW.parent_profile_id;
    ELSIF TG_TABLE_NAME = 'students' THEN
        SELECT id INTO linked_profile_id FROM public.profiles WHERE student_id = NEW.id;
    ELSIF TG_TABLE_NAME = 'teachers' THEN
        SELECT id INTO linked_profile_id FROM public.profiles WHERE teacher_id = NEW.id;
    ELSIF TG_TABLE_NAME = 'parents' THEN
        SELECT id INTO linked_profile_id FROM public.profiles WHERE parent_profile_id = NEW.id;
    END IF;

    -- Check uniqueness across all user tables, excluding itself and its linked entity
    SELECT (
        EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND id != NEW.id AND (linked_profile_id IS NULL OR id != linked_profile_id)) OR
        EXISTS (SELECT 1 FROM public.students WHERE email = NEW.email AND id != NEW.id AND (linked_student_id IS NULL OR id != linked_student_id)) OR
        EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email AND id != NEW.id AND (linked_teacher_id IS NULL OR id != linked_teacher_id)) OR
        EXISTS (SELECT 1 FROM public.parents WHERE email = NEW.email AND id != NEW.id AND (linked_parent_id IS NULL OR id != linked_parent_id))
    ) INTO email_exists;

    IF email_exists THEN
        RAISE EXCEPTION 'Email % is already linked to another account in the system.', NEW.email;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

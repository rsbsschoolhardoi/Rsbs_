CREATE OR REPLACE FUNCTION public.validate_global_email_uniqueness()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Normalize email: lowercase and trim
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
  END IF;

  -- Block email and Identity modification (Immutable identity check)
  IF (TG_OP = 'UPDATE') THEN
    -- Email check
    IF (OLD.email IS NOT NULL AND NEW.email IS NOT NULL AND OLD.email != NEW.email) THEN
      RAISE EXCEPTION 'Identity Violation: Email is a permanent secondary login ID and cannot be modified once set.';
    END IF;
    
    -- Identity check (Unified to primary key 'id' to avoid 'record old has no field' errors in shared trigger)
    IF TG_TABLE_NAME = 'profiles' AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'Identity Violation: Account ID is a permanent primary ID and cannot be modified once set.';
    END IF;

    IF TG_TABLE_NAME = 'students' AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'Identity Violation: Student ID is a permanent primary ID and cannot be modified once set.';
    END IF;

    IF TG_TABLE_NAME = 'teachers' AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'Identity Violation: Teacher ID is a permanent primary ID and cannot be modified once set.';
    END IF;

    IF TG_TABLE_NAME = 'parents' AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'Identity Violation: Parent ID is a permanent primary ID and cannot be modified once set.';
    END IF;
  END IF;

  -- Uniqueness checks (unchanged but re-verifying)
  IF NEW.email IS NOT NULL THEN
    IF TG_TABLE_NAME = 'profiles' THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.students WHERE email = NEW.email AND id != COALESCE(NEW.student_id, '00000000-0000-0000-0000-000000000000'::uuid)) OR
         EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email AND id != COALESCE(NEW.teacher_id, '00000000-0000-0000-0000-000000000000'::uuid)) OR
         EXISTS (SELECT 1 FROM public.parents WHERE email = NEW.email AND id != COALESCE(NEW.parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
      THEN
        RAISE EXCEPTION 'Email already linked to another account: %', NEW.email;
      END IF;
    ELSIF TG_TABLE_NAME = 'students' THEN
      IF EXISTS (SELECT 1 FROM public.students WHERE email = NEW.email AND id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND student_id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email) OR
         EXISTS (SELECT 1 FROM public.parents WHERE email = NEW.email)
      THEN
        RAISE EXCEPTION 'Email already linked to another account: %', NEW.email;
      END IF;
    ELSIF TG_TABLE_NAME = 'teachers' THEN
      IF EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email AND id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND teacher_id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.students WHERE email = NEW.email) OR
         EXISTS (SELECT 1 FROM public.parents WHERE email = NEW.email)
      THEN
        RAISE EXCEPTION 'Email already linked to another account: %', NEW.email;
      END IF;
    ELSIF TG_TABLE_NAME = 'parents' THEN
      IF EXISTS (SELECT 1 FROM public.parents WHERE email = NEW.email AND id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND parent_id != NEW.id) OR
         EXISTS (SELECT 1 FROM public.students WHERE email = NEW.email) OR
         EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email)
      THEN
        RAISE EXCEPTION 'Email already linked to another account: %', NEW.email;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
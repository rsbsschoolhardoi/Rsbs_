-- 1. Update the handle_new_user function to support the new ID format RSBSPXXXX
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_count int;
    student_record record;
    teacher_record record;
    parent_record record;
    meta_is_admin boolean;
    final_role public.user_role;
    final_permissions text[];
    final_is_master boolean;
BEGIN
    -- Safely get user count
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- Safely parse is_admin from metadata, defaulting to false if null or invalid
    BEGIN
        meta_is_admin := COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false);
    EXCEPTION WHEN others THEN
        meta_is_admin := false;
    END;
    
    -- Find related records if username matches
    SELECT * INTO student_record FROM public.students WHERE login_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
    SELECT * INTO teacher_record FROM public.teachers WHERE login_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
    SELECT * INTO parent_record FROM public.parents WHERE parent_id = NEW.raw_user_meta_data->>'username' LIMIT 1;

    -- Determine Role
    IF user_count = 0 OR meta_is_admin = true THEN
        final_role := 'admin'::public.user_role;
    ELSIF teacher_record.id IS NOT NULL THEN
        final_role := 'teacher'::public.user_role;
    ELSIF parent_record.parent_id IS NOT NULL OR (NEW.raw_user_meta_data->>'username' LIKE 'RSBSP%') THEN
        final_role := 'parent'::public.user_role;
    ELSE
        final_role := 'student'::public.user_role;
    END IF;

    -- Determine Permissions
    IF final_role = 'admin'::public.user_role THEN
        final_permissions := ARRAY['dashboard', 'students', 'classes', 'fees', 'attendance', 'exams', 'notices', 'gallery', 'school_home', 'queries', 'admin_management', 'teachers', 'parents'];
    ELSIF final_role = 'teacher'::public.user_role THEN
        final_permissions := ARRAY['dashboard', 'attendance', 'students'];
    ELSIF final_role = 'parent'::public.user_role THEN
        final_permissions := ARRAY['dashboard', 'students']; 
    ELSE
        final_permissions := ARRAY[]::text[];
    END IF;

    -- Determine Master Status
    final_is_master := (user_count = 0);

    INSERT INTO public.profiles (id, username, role, student_id, teacher_id, parent_profile_id, permissions, is_master, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.id::text),
        final_role,
        student_record.id,
        teacher_record.id,
        parent_record.id,
        final_permissions,
        final_is_master,
        NEW.email
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        student_id = EXCLUDED.student_id,
        teacher_id = EXCLUDED.teacher_id,
        parent_profile_id = EXCLUDED.parent_profile_id,
        permissions = EXCLUDED.permissions,
        is_master = EXCLUDED.is_master,
        email = EXCLUDED.email;
        
    RETURN NEW;
END;
$function$;

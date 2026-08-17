CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count int;
    student_record record;
    teacher_record record;
    parent_record record;
    meta_is_admin boolean;
    meta_initial_pin text;
    final_role public.user_role;
    final_permissions text[];
    final_is_master boolean;
    target_username text;
    target_email text;
    is_oauth boolean;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    target_email := LOWER(TRIM(NEW.email));
    is_oauth := (NEW.raw_app_meta_data->>'provider' = 'google');
    
    BEGIN
        meta_is_admin := COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false);
        meta_initial_pin := NEW.raw_user_meta_data->>'initial_pin';
    EXCEPTION WHEN others THEN
        meta_is_admin := false;
        meta_initial_pin := NULL;
    END;
    
    -- Find related records
    SELECT * INTO student_record FROM public.students WHERE LOWER(TRIM(email)) = target_email LIMIT 1;
    SELECT * INTO teacher_record FROM public.teachers WHERE LOWER(TRIM(email)) = target_email LIMIT 1;
    SELECT * INTO parent_record FROM public.parents WHERE LOWER(TRIM(email)) = target_email LIMIT 1;

    IF student_record.id IS NULL AND teacher_record.id IS NULL AND parent_record.id IS NULL THEN
        SELECT * INTO student_record FROM public.students WHERE login_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
        SELECT * INTO teacher_record FROM public.teachers WHERE login_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
        SELECT * INTO parent_record FROM public.parents WHERE parent_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
    END IF;

    -- Determine Role
    IF user_count = 0 OR meta_is_admin = true THEN
        final_role := 'admin'::public.user_role;
    ELSIF teacher_record.id IS NOT NULL THEN
        final_role := 'teacher'::public.user_role;
    ELSIF parent_record.parent_id IS NOT NULL OR (NEW.raw_user_meta_data->>'username' LIKE 'RSBSP%') THEN
        final_role := 'parent'::public.user_role;
    ELSIF student_record.id IS NOT NULL THEN
        final_role := 'student'::public.user_role;
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

    final_is_master := (user_count = 0);

    target_username := COALESCE(
        student_record.login_id, 
        teacher_record.login_id, 
        parent_record.parent_id, 
        NEW.raw_user_meta_data->>'username', 
        split_part(NEW.email, '@', 1),
        NEW.id::text
    );

    INSERT INTO public.profiles (
        id, 
        username, 
        role, 
        student_id, 
        teacher_id, 
        parent_profile_id, 
        permissions, 
        is_master, 
        email,
        email_verified,
        pin,
        pin_setup_required
    )
    VALUES (
        NEW.id,
        target_username,
        final_role,
        student_record.id,
        teacher_record.id,
        parent_record.id,
        final_permissions,
        final_is_master,
        NEW.email,
        (NEW.email_confirmed_at IS NOT NULL OR is_oauth),
        meta_initial_pin, -- Admin optional PIN (Requirement 3)
        (meta_initial_pin IS NOT NULL OR final_role != 'admin') -- Non-admins must set/change PIN if role requires (Requirement 4)
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        student_id = EXCLUDED.student_id,
        teacher_id = EXCLUDED.teacher_id,
        parent_profile_id = EXCLUDED.parent_profile_id,
        permissions = EXCLUDED.permissions,
        is_master = EXCLUDED.is_master,
        email = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        pin = EXCLUDED.pin,
        pin_setup_required = EXCLUDED.pin_setup_required;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

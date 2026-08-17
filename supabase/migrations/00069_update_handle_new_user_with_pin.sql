CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count int;
    student_record record;
    teacher_record record;
    parent_record record;
    meta_is_admin boolean;
    final_role public.user_role;
    final_permissions text[];
    final_is_master boolean;
    target_username text;
    target_email text;
    is_oauth boolean;
BEGIN
    -- Safely get user count to check if first user (Master Admin)
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- Normalize email: lowercase and trim
    target_email := LOWER(TRIM(NEW.email));
    
    -- Check if it's OAuth login
    is_oauth := (NEW.raw_app_meta_data->>'provider' = 'google');
    
    -- Safely parse is_admin from metadata, defaulting to false
    BEGIN
        meta_is_admin := COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false);
    EXCEPTION WHEN others THEN
        meta_is_admin := false;
    END;
    
    -- Find related records by email
    SELECT * INTO student_record FROM public.students WHERE LOWER(TRIM(email)) = target_email LIMIT 1;
    SELECT * INTO teacher_record FROM public.teachers WHERE LOWER(TRIM(email)) = target_email LIMIT 1;
    SELECT * INTO parent_record FROM public.parents WHERE LOWER(TRIM(email)) = target_email LIMIT 1;

    -- If no record found by email, try by username from metadata (for standard login)
    IF student_record.id IS NULL AND teacher_record.id IS NULL AND parent_record.id IS NULL THEN
        SELECT * INTO student_record FROM public.students WHERE login_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
        SELECT * INTO teacher_record FROM public.teachers WHERE login_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
        SELECT * INTO parent_record FROM public.parents WHERE parent_id = NEW.raw_user_meta_data->>'username' LIMIT 1;
    END IF;

    -- OAuth Security Enforcement: Terminate if no matching record found (except for first user)
    IF is_oauth AND user_count > 0 AND student_record.id IS NULL AND teacher_record.id IS NULL AND parent_record.id IS NULL THEN
        RAISE EXCEPTION 'No account is associated with this email address: %', target_email;
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

    -- Determine Master Status
    final_is_master := (user_count = 0);

    -- Set target username
    target_username := COALESCE(
        student_record.login_id, 
        teacher_record.login_id, 
        parent_record.parent_id, 
        NEW.raw_user_meta_data->>'username', 
        split_part(NEW.email, '@', 1), -- Fallback for OAuth
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
        '0000',
        TRUE
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
        email_verified = EXCLUDED.email_verified;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

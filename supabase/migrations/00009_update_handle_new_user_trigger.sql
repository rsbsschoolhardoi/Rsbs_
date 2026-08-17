create or replace function public.handle_new_user()
returns trigger as $$
DECLARE
    user_count int;
    student_record record;
    user_role text;
BEGIN
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    -- Check if username is a student login_id
    SELECT * INTO student_record FROM public.students WHERE login_id = NEW.raw_user_meta_data->>'username';

    -- Determine role
    user_role := CASE 
        WHEN user_count = 0 THEN 'admin'
        WHEN NEW.raw_user_meta_data->>'is_admin' = 'true' THEN 'admin'
        WHEN student_record.id IS NOT NULL THEN 'student'
        ELSE 'student'
    END;

    INSERT INTO public.profiles (id, username, role, student_id, is_master, permissions)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        user_role::public.user_role,
        student_record.id,
        CASE WHEN user_role = 'admin' AND user_count = 0 THEN true ELSE false END,
        CASE 
            WHEN user_role = 'admin' AND user_count = 0 THEN '{"dashboard", "students", "classes", "fees", "attendance", "exams", "notices", "gallery", "school_home", "queries", "admin_management"}'::text[]
            WHEN user_role = 'admin' THEN '{"dashboard", "students", "classes", "fees", "attendance", "exams", "notices", "gallery", "school_home", "queries"}'::text[]
            ELSE '{}'::text[]
        END
    )
    ON CONFLICT (id) DO UPDATE
    SET role = excluded.role,
        username = excluded.username,
        student_id = excluded.student_id;
        
    RETURN NEW;
END;
$$ language plpgsql security definer;

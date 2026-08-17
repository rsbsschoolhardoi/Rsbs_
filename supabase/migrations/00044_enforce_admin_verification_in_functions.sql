CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid 
      AND p.role = 'admin'::public.user_role
      AND p.email_verified = true -- ENFORCE VERIFICATION
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(uid uuid, permission_name text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = uid 
          AND (
            (p.role = 'admin'::public.user_role AND p.email_verified = true) OR -- Admins must be verified
            (p.role != 'admin'::public.user_role) -- Non-admins (students/teachers) are exempt for now
          )
          AND (p.is_master = true OR permission_name = ANY(p.permissions))
    );
$function$;

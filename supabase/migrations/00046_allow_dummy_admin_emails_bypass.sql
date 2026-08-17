CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid 
      AND p.role = 'admin'::public.user_role
      AND (p.email_verified = true OR p.email LIKE '%@miaoda.com') -- ALLOW DUMMY EMAILS
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
            (p.role = 'admin'::public.user_role AND (p.email_verified = true OR p.email LIKE '%@miaoda.com')) OR -- Admins must be verified unless dummy email
            (p.role != 'admin'::public.user_role) -- Non-admins are exempt
          )
          AND (p.is_master = true OR permission_name = ANY(p.permissions))
    );
$function$;

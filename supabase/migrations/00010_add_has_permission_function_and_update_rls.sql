create or replace function public.has_permission(uid uuid, permission_name text)
returns boolean as $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid 
          AND (p.is_master = true OR permission_name = ANY(p.permissions))
    );
$$ language sql security definer;

-- Update profiles table policies
drop policy if exists "Admins have full access to profiles" on public.profiles;
create policy "Master admins manage admin profiles" on public.profiles
    for all to authenticated
    using (has_permission(auth.uid(), 'admin_management'))
    with check (has_permission(auth.uid(), 'admin_management'));

create policy "Admins can view all admin profiles" on public.profiles
    for select to authenticated
    using (role = 'admin' and (profiles.id = auth.uid() or has_permission(auth.uid(), 'admin_management')));

-- Update students table policies (students module covers basic info and fees module covers fee_details)
-- Actually, let's simplify: students module allows managing basic student info, fees module allows managing fees.
-- Since they are in the same table, we can use column level RLS or just general check.
-- For now, let's check if user has EITHER students OR fees permission for the students table.
drop policy if exists "Admins full access to students" on public.students;
create policy "Admins manage students" on public.students
    for all to authenticated
    using (has_permission(auth.uid(), 'students') or has_permission(auth.uid(), 'fees'))
    with check (has_permission(auth.uid(), 'students') or has_permission(auth.uid(), 'fees'));

-- Attendance
drop policy if exists "Admins full access to attendance" on public.attendance;
create policy "Admins manage attendance" on public.attendance
    for all to authenticated
    using (has_permission(auth.uid(), 'attendance'))
    with check (has_permission(auth.uid(), 'attendance'));

-- Exams
drop policy if exists "Admins full access to exams" on public.exams;
create policy "Admins manage exams" on public.exams
    for all to authenticated
    using (has_permission(auth.uid(), 'exams'))
    with check (has_permission(auth.uid(), 'exams'));

-- Notices
drop policy if exists "Admins full access to notices" on public.notices;
create policy "Admins manage notices" on public.notices
    for all to authenticated
    using (has_permission(auth.uid(), 'notices'))
    with check (has_permission(auth.uid(), 'notices'));

-- Gallery
drop policy if exists "Admins full access to gallery" on public.gallery;
create policy "Admins manage gallery" on public.gallery
    for all to authenticated
    using (has_permission(auth.uid(), 'gallery'))
    with check (has_permission(auth.uid(), 'gallery'));

-- Classes & Sections
drop policy if exists "Admins can manage classes" on public.classes;
create policy "Admins manage classes" on public.classes
    for all to authenticated
    using (has_permission(auth.uid(), 'classes'))
    with check (has_permission(auth.uid(), 'classes'));

drop policy if exists "Admins can manage sections" on public.sections;
create policy "Admins manage sections" on public.sections
    for all to authenticated
    using (has_permission(auth.uid(), 'classes'))
    with check (has_permission(auth.uid(), 'classes'));

-- School Info (School Home Content)
drop policy if exists "Admins full access to school info" on public.school_info;
create policy "Admins manage school info" on public.school_info
    for all to authenticated
    using (has_permission(auth.uid(), 'school_home'))
    with check (has_permission(auth.uid(), 'school_home'));

-- Leadership & Legacy (part of school_home for simplicity or separate if needed)
drop policy if exists "Admins can manage leadership" on public.leadership;
create policy "Admins manage leadership" on public.leadership
    for all to authenticated
    using (has_permission(auth.uid(), 'school_home'))
    with check (has_permission(auth.uid(), 'school_home'));

-- Student Queries
drop policy if exists "Admins have full access to queries" on public.student_queries;
create policy "Admins manage queries" on public.student_queries
    for all to authenticated
    using (has_permission(auth.uid(), 'queries'))
    with check (has_permission(auth.uid(), 'queries'));

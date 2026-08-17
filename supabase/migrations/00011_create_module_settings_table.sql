create table if not exists public.module_settings (
    id uuid default gen_random_uuid() primary key,
    module_id text not null unique,
    is_enabled boolean default true,
    updated_at timestamp with time zone default now()
);

-- Seed initial modules
insert into public.module_settings (module_id, is_enabled)
values 
    ('students', true),
    ('classes', true),
    ('fees', true),
    ('attendance', true),
    ('exams', true),
    ('notices', true),
    ('gallery', true),
    ('school_home', true),
    ('queries', true),
    ('timetable', true)
on conflict (module_id) do nothing;

-- RLS for module_settings
alter table public.module_settings enable row level security;

create policy "Everyone can view module settings" on public.module_settings
    for select to anon, authenticated
    using (true);

create policy "Master admins can update module settings" on public.module_settings
    for update to authenticated
    using (has_permission(auth.uid(), 'admin_management'))
    with check (has_permission(auth.uid(), 'admin_management'));

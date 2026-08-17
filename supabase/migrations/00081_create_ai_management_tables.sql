-- AI Settings table
create table if not exists public.ai_settings (
    id uuid primary key default gen_random_uuid(),
    global_daily_limit integer not null default 50,
    daily_reset_time time not null default '00:00:00',
    is_system_enabled boolean not null default true,
    limit_reached_message text not null default 'You have reached your daily message limit. Please try again tomorrow.',
    warning_message text not null default 'Our system detected potentially inappropriate content. Please keep questions academic.',
    reset_info_message text not null default 'Your daily limit resets every day at midnight.',
    individual_disabled_message text not null default 'Study AI has been disabled for your account by an administrator.',
    class_disabled_message text not null default 'Study AI is currently disabled for your class.',
    system_unavailable_message text not null default 'Study AI is currently undergoing maintenance. Please check back later.',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Insert default settings
insert into public.ai_settings (id) values (gen_random_uuid()) on conflict do nothing;

-- AI Student Configs (Overrides)
create table if not exists public.ai_student_configs (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade unique,
    is_enabled boolean not null default true,
    daily_limit integer, -- null means use global/class limit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- AI Class Configs (Overrides)
create table if not exists public.ai_class_configs (
    id uuid primary key default gen_random_uuid(),
    class_id uuid not null references public.classes(id) on delete cascade unique,
    is_enabled boolean not null default true,
    daily_limit integer, -- null means use global limit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- AI Usage tracking
create table if not exists public.ai_usage (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade,
    usage_date date not null default current_date,
    message_count integer not null default 0,
    total_historical_usage bigint not null default 0,
    unique(student_id, usage_date),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS Policies
alter table public.ai_settings enable row level security;
alter table public.ai_student_configs enable row level security;
alter table public.ai_class_configs enable row level security;
alter table public.ai_usage enable row level security;

-- Admin policies (Full access)
create policy "Admins have full access to ai_settings" on public.ai_settings
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins have full access to ai_student_configs" on public.ai_student_configs
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins have full access to ai_class_configs" on public.ai_class_configs
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins have full access to ai_usage" on public.ai_usage
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Student policies (Read-only for own data/global settings)
create policy "Students can view global ai_settings" on public.ai_settings
    for select to authenticated using (true);

create policy "Students can view their own ai_student_configs" on public.ai_student_configs
    for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and student_id = ai_student_configs.student_id));

create policy "Students can view their own ai_usage" on public.ai_usage
    for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and student_id = ai_usage.student_id));

-- Realtime
alter publication supabase_realtime add table ai_settings;
alter publication supabase_realtime add table ai_student_configs;
alter publication supabase_realtime add table ai_class_configs;
alter publication supabase_realtime add table ai_usage;

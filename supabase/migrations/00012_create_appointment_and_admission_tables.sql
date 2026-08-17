-- Appointments Table
create table if not exists public.appointments (
    id uuid default gen_random_uuid() primary key,
    student_name text,
    parent_name text not null,
    contact_number text not null,
    email text,
    purpose text not null,
    custom_purpose text,
    preferred_date date not null,
    preferred_time text not null,
    notes text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'rescheduled', 'completed')),
    created_at timestamp with time zone default now()
);

-- Admissions Table
create table if not exists public.admissions (
    id uuid default gen_random_uuid() primary key,
    student_name text not null,
    date_of_birth date not null,
    gender text not null,
    applying_class text not null,
    previous_school text,
    parent_name text not null,
    contact_number text not null,
    address text not null,
    notes text,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
    created_at timestamp with time zone default now()
);

-- RLS for Appointments
alter table public.appointments enable row level security;

create policy "Anyone can create appointments" on public.appointments
    for insert to anon, authenticated
    with check (true);

create policy "Admins can view and manage appointments" on public.appointments
    for all to authenticated
    using (has_permission(auth.uid(), 'queries'))
    with check (has_permission(auth.uid(), 'queries'));

-- RLS for Admissions
alter table public.admissions enable row level security;

create policy "Anyone can create admissions" on public.admissions
    for insert to anon, authenticated
    with check (true);

create policy "Admins can view and manage admissions" on public.admissions
    for all to authenticated
    using (has_permission(auth.uid(), 'students'))
    with check (has_permission(auth.uid(), 'students'));

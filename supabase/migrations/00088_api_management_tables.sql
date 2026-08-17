-- Table for API Keys
create table if not exists public.api_keys (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    key_value text not null unique default encode(gen_random_bytes(32), 'hex'),
    is_active boolean default true,
    rate_limit_minute integer default 60,
    created_at timestamp with time zone default now(),
    last_used_at timestamp with time zone,
    created_by uuid references auth.users(id)
);

-- Table for API Endpoints
create table if not exists public.api_endpoints (
    id uuid primary key default gen_random_uuid(),
    module_name text not null, -- The target table name
    path text not null unique, -- The API path (e.g., /students)
    methods text[] default '{GET}', -- Supported methods: GET, POST, PUT, DELETE
    exposed_fields text[], -- Array of column names exposed (e.g., {id, name, class})
    is_active boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Table for API Logs
create table if not exists public.api_logs (
    id uuid primary key default gen_random_uuid(),
    key_id uuid references public.api_keys(id) on delete set null,
    endpoint_id uuid references public.api_endpoints(id) on delete set null,
    method text not null,
    path text not null,
    status_code integer not null,
    ip_address text,
    request_payload jsonb,
    response_summary text,
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.api_keys enable row level security;
alter table public.api_endpoints enable row level security;
alter table public.api_logs enable row level security;

-- Admin policies
create policy "Admins can manage api_keys" on public.api_keys
    for all to authenticated
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can manage api_endpoints" on public.api_endpoints
    for all to authenticated
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can view api_logs" on public.api_logs
    for select to authenticated
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Seed some initial endpoints
insert into public.api_endpoints (module_name, path, methods, exposed_fields)
values 
('students', '/students', '{GET}', '{id, name, class, section, status, student_type, roll_no, gender, dob, contact}'),
('teachers', '/teachers', '{GET}', '{id, name, designation, subject_role, status, login_id}'),
('attendance', '/attendance', '{GET}', '{id, student_id, date, status, remarks}'),
('notices', '/notices', '{GET}', '{id, title, content, date, is_blue_tag, category}');

-- Seed a master key for testing
insert into public.api_keys (name, key_value) 
values ('Master Dashboard Key', encode(gen_random_bytes(32), 'hex'));

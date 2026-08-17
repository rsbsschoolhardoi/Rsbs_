create table public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  event_type text not null, -- 'link_sent', 'verification_success', 'verification_failure', 'access_denied'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.verification_logs enable row level security;

-- Only admins can read logs
create policy "Admins can read verification logs"
  on public.verification_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- System can insert logs (via Edge Functions or authenticated users if needed)
create policy "Authenticated users can insert own logs"
  on public.verification_logs
  for insert
  with check (auth.uid() = user_id);

-- Master admins can see everything
create policy "Master admins can do everything with logs"
  on public.verification_logs
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.is_master = true
    )
  );

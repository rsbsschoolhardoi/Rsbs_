-- Trusted device / saved account persistence for the Student Portal
-- Accounts are stored server-side, keyed by a device_id cookie managed by
-- the trusted-device Edge Function. No passwords, PINs, or tokens are
-- persisted in the browser.

create table public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.saved_accounts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.trusted_devices(device_id) on delete cascade,
  profile_id uuid not null,
  role text not null,
  full_name text not null,
  verification_id text not null,
  avatar_url text,
  pin_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, profile_id)
);

-- RLS
alter table public.trusted_devices enable row level security;
alter table public.saved_accounts enable row level security;

-- trusted_devices policies
-- anon: no access
create policy "trusted_devices_anon_no_access" on public.trusted_devices
  as permissive for all to anon using (false) with check (false);

-- authenticated: no direct access (managed exclusively by the trusted-device Edge Function)
create policy "trusted_devices_authenticated_no_access" on public.trusted_devices
  as permissive for all to authenticated using (false) with check (false);

-- admin: full access
create policy "trusted_devices_admin_all" on public.trusted_devices
  as permissive for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- saved_accounts policies
-- anon: no access
create policy "saved_accounts_anon_no_access" on public.saved_accounts
  as permissive for all to anon using (false) with check (false);

-- authenticated: no direct access (managed exclusively by the trusted-device Edge Function)
create policy "saved_accounts_authenticated_no_access" on public.saved_accounts
  as permissive for all to authenticated using (false) with check (false);

-- admin: full access
create policy "saved_accounts_admin_all" on public.saved_accounts
  as permissive for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
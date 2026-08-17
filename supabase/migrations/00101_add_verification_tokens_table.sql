create table if not exists public.verification_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz default now(),
    used_at timestamptz
);

-- Index for faster lookup
create index if not exists verification_tokens_token_idx on public.verification_tokens(token);
create index if not exists verification_tokens_user_id_idx on public.verification_tokens(user_id);

-- Add RLS policies
alter table public.verification_tokens enable row level security;

create policy "Admins can view all verification tokens"
    on public.verification_tokens for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and (profiles.role = 'admin' or profiles.is_master = true)
        )
    );

create policy "System can manage verification tokens"
    on public.verification_tokens for all
    to service_role
    using (true)
    with check (true);

-- Update profiles table default for email_verified
alter table public.profiles alter column email_verified set default false;
alter table public.profiles alter column require_email_verification set default false;

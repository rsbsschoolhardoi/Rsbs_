-- Drop old policy
drop policy if exists "Admins can manage pending admins" on public.pending_admins;

-- New policy: Existing admins (verified) can manage all, and unverified admins can manage their own entry
create policy "Admins can manage pending admins"
  on public.pending_admins
  for all
  using (
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and email_verified = true)) OR
    (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and email = pending_admins.email))
  );

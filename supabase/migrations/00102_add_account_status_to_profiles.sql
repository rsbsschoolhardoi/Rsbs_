-- Add account_status column
alter table public.profiles 
add column if not exists account_status text check (account_status in ('active', 'restricted')) default 'restricted';

-- Set existing admins to active so we don't lock them out
update public.profiles 
set account_status = 'active' 
where role = 'admin';

-- Ensure students/teachers/parents are active by default
update public.profiles 
set account_status = 'active' 
where role != 'admin';

-- Update the default value for new rows
alter table public.profiles alter column account_status set default 'restricted';

-- Add is_master, permissions, and theme_preference to profiles table
alter table profiles add column if not exists is_master boolean default false;
alter table profiles add column if not exists permissions text[] default '{}';
alter table profiles add column if not exists theme_preference text default 'system';

-- Update the first admin to be a master admin if any exist
update profiles 
set is_master = true, 
    permissions = '{"dashboard", "students", "classes", "fees", "attendance", "exams", "notices", "gallery", "school_home", "queries", "admin_management"}'
where role = 'admin' 
  and id = (select id from profiles where role = 'admin' order by created_at asc limit 1);

-- Ensure all current admins have some default permissions if they are not master
update profiles
set permissions = '{"dashboard", "students", "classes", "fees", "attendance", "exams", "notices", "gallery", "school_home", "queries"}'
where role = 'admin' and is_master = false;

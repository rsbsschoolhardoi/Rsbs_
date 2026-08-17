-- Drop existing policies
drop policy if exists "Admins can delete images" on storage.objects;
drop policy if exists "Admins can update images" on storage.objects;
drop policy if exists "Admins can upload images" on storage.objects;
drop policy if exists "Public can view images" on storage.objects;

-- Create policies for authenticated users (including admin)
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'app_aho9bv0iqbr5_school_images');

create policy "Authenticated users can update images"
on storage.objects for update
to authenticated
using (bucket_id = 'app_aho9bv0iqbr5_school_images');

create policy "Authenticated users can delete images"
on storage.objects for delete
to authenticated
using (bucket_id = 'app_aho9bv0iqbr5_school_images');

create policy "Anyone can view images"
on storage.objects for select
to public
using (bucket_id = 'app_aho9bv0iqbr5_school_images');

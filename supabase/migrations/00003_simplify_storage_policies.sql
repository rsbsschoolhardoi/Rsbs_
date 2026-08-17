drop policy if exists "Admins can upload images" on storage.objects;
drop policy if exists "Admins can update images" on storage.objects;
drop policy if exists "Admins can delete images" on storage.objects;
drop policy if exists "Public can view images" on storage.objects;

create policy "Admins can upload images"
on storage.objects for insert
with check (bucket_id = 'app_aho9bv0iqbr5_school_images');

create policy "Admins can update images"
on storage.objects for update
using (bucket_id = 'app_aho9bv0iqbr5_school_images');

create policy "Admins can delete images"
on storage.objects for delete
using (bucket_id = 'app_aho9bv0iqbr5_school_images');

create policy "Public can view images"
on storage.objects for select
using (bucket_id = 'app_aho9bv0iqbr5_school_images');

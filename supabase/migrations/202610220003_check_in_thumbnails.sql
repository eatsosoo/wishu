begin;
-- Derivatives are adjacent private objects. The partner can read a thumbnail
-- only while its original photo is referenced by a check-in in their space.
create policy couple_reads_check_in_thumbnails on storage.objects
for select to authenticated using (
  bucket_id = 'wish-photos'
  and (storage.foldername(name))[1] = (select public.my_couple_id())::text
  and exists(select 1 from public.check_ins c
    where c.couple_id = (select public.my_couple_id())
      and (c.photo->>'storagePath') || '.thumb-144.jpg' = name)
);
commit;

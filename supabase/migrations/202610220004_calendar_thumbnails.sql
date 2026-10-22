begin;
-- Calendar thumbnails also cover existing wish memories. SELECT on the source
-- tables still applies their RLS, so hidden wish covers stay hidden.
create policy couple_reads_calendar_thumbnails on storage.objects
for select to authenticated using (
  bucket_id = 'wish-photos'
  and (storage.foldername(name))[1] = (select public.my_couple_id())::text
  and (
    exists(select 1 from public.memory_photos p where p.couple_id = (select public.my_couple_id())
      and (p.photo->>'storagePath') || '.thumb-144.jpg' = name)
    or exists(select 1 from public.wishes w where w.couple_id = (select public.my_couple_id())
      and (w.cover->>'storagePath') || '.thumb-144.jpg' = name)
  )
);
commit;

-- Aggregate verification only: never print photo paths, names or locations.
with refs as (
  select distinct photo->>'storagePath' as path from (
    select photo from public.check_ins
    union all select photo from public.memory_photos
    union all select cover as photo from public.wishes
  ) photos where photo->>'storagePath' is not null
)
select count(*) as original_photos,
  count(t.name) as thumbnails,
  count(*) filter(where t.name is null) as missing_thumbnails,
  coalesce(sum((o.metadata->>'size')::bigint),0) as original_bytes,
  coalesce(sum((t.metadata->>'size')::bigint),0) as thumbnail_bytes,
  bool_and(t.metadata->>'mimetype' = 'image/jpeg') as thumbnails_are_jpeg
from refs r
left join storage.objects o on o.bucket_id='wish-photos' and o.name=r.path
left join storage.objects t on t.bucket_id='wish-photos' and t.name=r.path || '.thumb-144.jpg';

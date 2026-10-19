-- Read-only verification after migration; no private content is returned.
with counts as (select (select count(*) from public.wish_state) as legacy_couples,
  (select count(*) from public.wish_couples) as couples,
  (select count(*) from public.wishes) as wishes,
  (select count(*) from public.preparations) as preparations,
  (select count(*) from public.memories) as memories,
  (select count(*) from public.memory_photos) as memory_photos)
select to_jsonb(counts) || jsonb_build_object(
  'rls',(select jsonb_object_agg(tablename,rowsecurity) from pg_tables where schemaname = 'public' and tablename in ('wishes','preparations','memories','memory_photos')),
  'client_can_mutate',has_function_privilege('authenticated','public.apply_wish_command(uuid,jsonb)','execute'),
  'backend_can_mutate',has_function_privilege('service_role','public.apply_wish_command(uuid,jsonb)','execute'),
  'backend_can_write_legacy',has_table_privilege('service_role','public.wish_state','update'),
  'photo_limit',(select file_size_limit from storage.buckets where id = 'wish-photos')
) as checks from counts;

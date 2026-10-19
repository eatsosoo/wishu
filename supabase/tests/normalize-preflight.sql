-- Read-only checks; output counts only, never user content or photo URLs.
with counts as (select count(*) as couples,
  coalesce(sum(jsonb_array_length(snapshot->'wishes')),0) as wishes,
  coalesce(sum(jsonb_array_length(snapshot->'preparations')),0) as preparations,
  coalesce(sum(jsonb_array_length(snapshot->'memories')),0) as memories,
  coalesce(sum(pg_column_size(snapshot)),0) as legacy_bytes
from public.wish_state)
select to_jsonb(counts) || jsonb_build_object('postgres_version',current_setting('server_version'),
'orphaned_preparations',(select count(*) from public.wish_state s
cross join lateral jsonb_array_elements(s.snapshot->'preparations') a(p)
where not exists(select 1 from jsonb_array_elements(s.snapshot->'wishes') w where w->>'id' = p->>'wishId')),
'duplicate_active_preparations',(select count(*) from (
  select s.couple_id,p->>'wishId',p->>'preparedBy' from public.wish_state s
  cross join lateral jsonb_array_elements(s.snapshot->'preparations') a(p)
  where p->>'status' = 'preparing' group by 1,2,3 having count(*) > 1
) duplicates),
'wishes_without_creator_membership',(select count(*) from public.wish_state s
cross join lateral jsonb_array_elements(s.snapshot->'wishes') a(w)
where not exists(select 1 from public.wish_members m where m.couple_id = s.couple_id and m.actor = w->>'createdBy'))
) as checks from counts;

-- Only return booleans/counts. The authenticated read RPC still applies its own
-- actor/recipient filters even when invoked by this administrative verification.
with identity as materialized (
  select set_config('request.jwt.claim.sub',(select user_id::text from public.wish_members order by couple_id,actor desc limit 1),true)
), response as materialized (
  select public.get_my_couple() as body from identity
)
select jsonb_build_object(
  'found_couple',body is not null,
  'wishes_array',jsonb_typeof(body#>'{snapshot,wishes}') = 'array',
  'memories_array',jsonb_typeof(body#>'{snapshot,memories}') = 'array',
  'profile_has_two_members',jsonb_array_length(body#>'{snapshot,couple,members}') = 2,
  'private_preparations_match_actor',not exists(select 1 from jsonb_array_elements(body#>'{snapshot,preparations}') p where p->>'preparedBy' <> body->>'actor'),
  'notifications_match_recipient',not exists(select 1 from jsonb_array_elements(body#>'{snapshot,notifications}') n where n->>'recipient' <> body->>'actor'),
  'all_photo_references_are_objects',not exists(select 1 from jsonb_array_elements(body#>'{snapshot,memories}') m cross join lateral jsonb_array_elements(m->'photos') p where jsonb_typeof(p) <> 'object')
) as checks from response;

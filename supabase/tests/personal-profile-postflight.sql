-- Verify the deployed profile contract without retaining any test changes.
begin;
do $$
declare
  member public.wish_members;
  profile jsonb;
begin
  if has_function_privilege('authenticated', 'public.apply_wish_command(uuid,jsonb)', 'EXECUTE') then
    raise exception 'Authenticated clients must not execute the mutation RPC directly';
  end if;
  select * into member from public.wish_members order by user_id limit 1;
  if not found then return; end if;
  perform public.apply_wish_command(member.user_id, jsonb_build_object(
    'kind','personalProfile','input',jsonb_build_object('birthDate','2000-02-29','gender','other')));
  perform set_config('request.jwt.claim.sub',member.user_id::text,true);
  select value into profile
  from jsonb_array_elements(public.get_my_couple() #> '{snapshot,couple,members}')
  where value->>'id' = member.actor;
  if profile->>'birthDate' is distinct from '2000-02-29' or profile->>'gender' is distinct from 'other' then
    raise exception 'Profile update/read contract failed';
  end if;
  begin
    perform public.apply_wish_command(member.user_id, jsonb_build_object(
      'kind','personalProfile','input',jsonb_build_object('birthDate','2000-02-29','gender','invalid')));
    raise exception using errcode = 'XX000', message = 'Invalid gender was accepted';
  exception when sqlstate 'P0001' then
    null; -- Expected validation rejection.
  end;
end $$;
rollback;

select
  (select count(*) from public.wish_members) as members,
  (select count(*) from public.wishes) as wishes,
  (select count(*) from public.memories) as memories,
  (select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'wish_members'
      and column_name in ('birth_date','gender')) as profile_columns_present;

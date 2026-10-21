begin;
do $$
declare member public.wish_members; payload jsonb; actual integer; reported integer;
begin
  for member in select * from public.wish_members loop
    perform set_config('request.jwt.claim.sub',member.user_id::text,true);
    payload := public.get_my_couple();
    select count(*) into actual from public.wish_members where couple_id = member.couple_id;
    select count(*) into reported from jsonb_array_elements(payload #> '{snapshot,couple,members}') m
      where m->'joined' = 'true'::jsonb;
    if actual <> reported or exists(
      select 1 from jsonb_array_elements(payload #> '{snapshot,couple,members}') m
      where jsonb_typeof(m->'joined') is distinct from 'boolean'
    ) then raise exception 'Member presence contract failed'; end if;
  end loop;
end $$;
rollback;
select true as member_presence_verified;

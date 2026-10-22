-- Exercise the deployed contract without retaining any verification records.
begin;
do $$
declare member public.wish_members; key text := 'verify-checkin-' || gen_random_uuid()::text; input jsonb; snapshot jsonb;
begin
  if not exists(select 1 from pg_class where oid = 'public.check_ins'::regclass and relrowsecurity) then
    raise exception 'Check-in RLS is not enabled';
  end if;
  if has_function_privilege('authenticated','public.apply_wish_command(uuid,jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.apply_wish_command_before_check_ins(uuid,jsonb)','EXECUTE')
    or has_table_privilege('authenticated','public.check_ins','INSERT') then
    raise exception 'Check-in mutation permissions are too broad';
  end if;
  select * into member from public.wish_members order by user_id limit 1;
  if not found then return; end if;
  input := jsonb_build_object('id',key,'title','Check-in verification','latitude',11.94,'longitude',108.44,
    'visitedAt',current_date::text,'companion','','note','Verification only',
    'photo',jsonb_build_object('uri','https://example.com/verification.jpg'));
  perform public.apply_wish_command(member.user_id,jsonb_build_object('kind','checkIn','input',input));
  perform public.apply_wish_command(member.user_id,jsonb_build_object('kind','checkIn','input',input || jsonb_build_object('note','Updated')));
  if (select count(*) from public.check_ins where couple_id = member.couple_id and id = key) <> 1 then
    raise exception 'Check-in replay created duplicate records';
  end if;
  perform set_config('request.jwt.claim.sub',member.user_id::text,true);
  snapshot := public.get_my_couple();
  if not exists(select 1 from jsonb_array_elements(snapshot #> '{snapshot,checkIns}') item where item->>'id' = key and item->>'note' = 'Updated') then
    raise exception 'Check-in read/update contract failed';
  end if;
  perform public.apply_wish_command(member.user_id,jsonb_build_object('kind','deleteCheckIn','id',key));
  if exists(select 1 from public.check_ins where couple_id = member.couple_id and id = key) then
    raise exception 'Check-in delete contract failed';
  end if;
end $$;
rollback;
select
  (select count(*) from public.check_ins) as check_ins,
  (select count(*) from public.wishes) as wishes,
  (select count(*) from public.memories) as memories,
  (select relrowsecurity from pg_class where oid = 'public.check_ins'::regclass) as check_ins_rls;

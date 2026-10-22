-- These checks retain no test data and never print locations or photo paths.
begin;
do $$
begin
  if (select public from storage.buckets where id = 'wish-photos') is distinct from false then
    raise exception 'The photo bucket must be private';
  end if;
  if not exists(select 1 from pg_class where oid = 'public.check_ins'::regclass and relrowsecurity) then
    raise exception 'Check-in RLS is disabled';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='check_ins'
    and policyname='check_in_space_boundary' and permissive='RESTRICTIVE')
    or not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='photo_space_boundary' and permissive='RESTRICTIVE') then
    raise exception 'The restrictive space boundary is missing';
  end if;
  if not exists(select 1 from pg_trigger where tgname='private_check_in_photo' and tgenabled='O') then
    raise exception 'The private photo guard is missing';
  end if;
  if has_table_privilege('anon','public.check_ins','SELECT')
    or has_table_privilege('authenticated','public.check_ins','INSERT')
    or has_function_privilege('authenticated','public.apply_wish_command(uuid,jsonb)','EXECUTE') then
    raise exception 'Client privileges are too broad';
  end if;
  if exists(select 1 from public.wish_members group by couple_id having count(*) > 2) then
    raise exception 'A space contains more than two members';
  end if;
end $$;

-- A valid authenticated role with no space membership must receive no records,
-- even when asking the tables directly rather than using the app's read RPC.
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true) is not null as outsider_identity_set;
set local role authenticated;
do $$
begin
  if public.get_my_couple() is not null
    or exists(select 1 from public.check_ins)
    or exists(select 1 from storage.objects where bucket_id='wish-photos') then
    raise exception 'An outsider can read private map data';
  end if;
end $$;
reset role;
rollback;
select true as check_in_privacy_verified;

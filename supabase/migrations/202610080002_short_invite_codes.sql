-- New invitation codes are compact, uppercase hexadecimal strings.
alter table public.wish_couples
  alter column invite_code set default upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8));

-- Accept copied codes regardless of letter case, including older UUID codes.
create or replace function public.join_couple(p_code text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare space public.wish_couples;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.wish_members where user_id = auth.uid()) then raise exception 'Bạn đã thuộc một không gian.'; end if;
  if length(trim(p_name)) not between 1 and 40 then raise exception 'Nhập tên hợp lệ.'; end if;
  select * into space from public.wish_couples where upper(invite_code) = upper(trim(p_code)) and invite_expires_at > now() for update;
  if not found then raise exception 'Mã mời không hợp lệ hoặc đã hết hạn.'; end if;
  if exists(select 1 from public.wish_members where couple_id = space.id and actor = 'linh') then raise exception 'Không gian đã có đủ hai người.'; end if;
  insert into public.wish_members values (auth.uid(), space.id, 'linh');
  update public.wish_state set snapshot = jsonb_set(snapshot, '{couple,members,1,name}', to_jsonb(trim(p_name))), version = version + 1 where couple_id = space.id;
  update public.wish_couples set invite_code = null where id = space.id;
  return public.get_my_couple();
end $$;

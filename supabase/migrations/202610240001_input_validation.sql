begin;

-- Pairing is callable directly through PostgREST. Validate here too, rather
-- than relying on input widgets or an Edge Function that callers can bypass.
alter function public.create_couple(text,text) rename to create_couple_before_input_validation;
alter function public.join_couple(text,text) rename to join_couple_before_input_validation;
revoke all on function public.create_couple_before_input_validation(text,text), public.join_couple_before_input_validation(text,text)
  from public,anon,authenticated,service_role;

create function public.create_couple(p_name text,p_space_name text) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_name is null or length(p_name) > 40 or length(trim(p_name)) = 0 or p_name ~ '[[:cntrl:]]'
    or p_space_name is null or length(p_space_name) > 60 or length(trim(p_space_name)) = 0 or p_space_name ~ '[[:cntrl:]]'
  then raise exception 'Tên của bạn hoặc tên không gian chưa hợp lệ.'; end if;
  return public.create_couple_before_input_validation(trim(p_name),trim(p_space_name));
end $$;

create function public.join_couple(p_code text,p_name text) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_name is null or length(p_name) > 40 or length(trim(p_name)) = 0 or p_name ~ '[[:cntrl:]]'
  then raise exception 'Tên của bạn chưa hợp lệ.'; end if;
  if p_code is null or length(p_code) > 64 or upper(trim(p_code)) !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$'
  then raise exception 'Mã mời chưa hợp lệ.'; end if;
  return public.join_couple_before_input_validation(upper(trim(p_code)),trim(p_name));
end $$;
revoke all on function public.create_couple(text,text),public.join_couple(text,text) from public,anon,authenticated;
grant execute on function public.create_couple(text,text),public.join_couple(text,text) to authenticated;

create or replace function public.register_push_token(p_token text,p_platform text) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_token is null or length(p_token) > 256 or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'
    or p_platform is null or p_platform not in ('ios','android') then raise exception 'Thiết bị không hợp lệ.'; end if;
  if exists(select 1 from public.account_deletion_requests where user_id = auth.uid()) then raise exception 'Tài khoản đang được xoá.'; end if;
  insert into public.wish_push_tokens(token,user_id,platform) values(p_token,auth.uid(),p_platform)
    on conflict(token) do update set user_id = auth.uid(),platform = excluded.platform,enabled = true,updated_at = now();
  insert into public.gift_push_deliveries(notification_id,token)
    select id,p_token from public.gift_notifications where recipient_id = auth.uid() and read_at is null and created_at > now()-interval '7 days'
    on conflict(notification_id,token) do nothing;
end $$;
revoke all on function public.register_push_token(text,text) from public,anon;
grant execute on function public.register_push_token(text,text) to authenticated;

-- Preserve legacy records without a destructive cleanup. NOT VALID checks
-- still apply to every new or changed row, including service-side writes.
alter table public.wishes add constraint wish_safe_integer_budget
  check (estimated_cost between 0 and 9007199254740991 and estimated_cost = trunc(estimated_cost)) not valid;

-- The photo validator is also used by the transactional command functions.
-- Keep external HTTPS photos, but disallow ambiguous objects and path traversal.
create or replace function public.valid_wish_photo(photo jsonb,space_id uuid) returns boolean
language sql immutable set search_path = public,pg_temp as $$
  select coalesce(jsonb_typeof(photo) = 'object' and (
    (photo ? 'art' and not photo ? 'uri' and not photo ? 'storagePath'
      and photo->>'art' in ('home','couple','jar','jarOpen','gift','openGift','camera','bear','bearPortrait','bearReference','travel','travelMemory','photobooth','concert','photoMemory','memoryOne','memoryTwo','memoryThree','categoryGift','categoryTravel','categoryDining','categoryExperience','categoryMoments'))
    or (not photo ? 'art' and jsonb_typeof(photo->'uri') = 'string' and length(photo->>'uri') <= 2048 and (
      (not photo ? 'storagePath' and photo->>'uri' ~* '^https://[^[:space:]/?#@\\]+([/?#][^[:space:]\\]*)?$')
      or (jsonb_typeof(photo->'storagePath') = 'string'
        and photo->>'storagePath' ~ ('^' || space_id::text || '/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/[^/\\?#%[:space:][:cntrl:]]{1,255}$')
        and split_part(photo->>'storagePath','/',3) not in ('.','..')
        and photo->>'uri' = 'storage://' || (photo->>'storagePath'))
    ))
  ),false);
$$;
revoke all on function public.valid_wish_photo(jsonb,uuid) from public,anon,authenticated;

commit;

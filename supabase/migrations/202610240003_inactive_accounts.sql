begin;

alter table public.account_access
  add column status text not null default 'active' check (status in ('active','inactive')),
  add column inactive_at timestamptz;

create or replace function public.get_my_account_access() returns jsonb
language plpgsql stable security definer set search_path = public,pg_temp as $$
declare account public.account_access;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  select * into account from public.account_access where user_id = auth.uid();
  return jsonb_build_object('status',coalesce(account.status,'active'),
    'role',coalesce(account.role,'user'),'plan',coalesce(account.plan,'normal'),
    'premiumExpiresAt',account.premium_expires_at);
end $$;

create function public.my_account_is_active() returns boolean
language sql stable security definer set search_path = public,pg_temp as $$
  select exists(select 1 from public.account_access where user_id = auth.uid() and status = 'active');
$$;
revoke all on function public.my_account_is_active() from public,anon,authenticated;
grant execute on function public.my_account_is_active() to authenticated;

create function public.require_active_account(p_user uuid) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  perform 1 from public.account_access where user_id = p_user and status = 'active' for share;
  if not found then raise exception 'Tài khoản đã vô hiệu hoá. Vui lòng liên hệ quản trị viên để kích hoạt lại.'; end if;
end $$;
revoke all on function public.require_active_account(uuid) from public,anon,authenticated,service_role;

create function public.deactivate_account(p_user uuid) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  -- No Auth deletion, photo cleanup, unpairing, or shared-data deletion.
  update public.account_access set status = 'inactive',inactive_at = coalesce(inactive_at,now()) where user_id = p_user;
  if not found then raise exception 'Không tìm thấy tài khoản.'; end if;
  update public.wish_push_tokens set enabled = false where user_id = p_user;
  update public.wish_web_push_subscriptions set enabled = false,updated_at = now() where user_id = p_user;
end $$;
revoke all on function public.deactivate_account(uuid) from public,anon,authenticated;
grant execute on function public.deactivate_account(uuid) to service_role;

-- Stop old deployed deletion workers before they can remove photos or Auth.
-- Migration must be applied before deploying the new delete-account endpoint.
revoke all on function public.prepare_account_deletion(uuid),public.account_deletion_photos(uuid) from service_role;

-- An old JWT or direct REST request cannot bypass the inactive state. Own access
-- metadata remains readable so the app can display the inactive-account screen.
do $$
declare name text;
begin
  foreach name in array array['wish_couples','wish_members','wish_state','wishes','preparations',
    'memories','memory_photos','gift_notifications','check_ins','wish_push_tokens','wish_web_push_subscriptions'] loop
    execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using ((select public.my_account_is_active())) with check ((select public.my_account_is_active()))',name);
  end loop;
end $$;
create policy active_account_required on storage.objects as restrictive for all to authenticated
  using ((select public.my_account_is_active())) with check ((select public.my_account_is_active()));

create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public,pg_temp as $$
  select couple_id from public.wish_members where user_id = auth.uid() and public.my_account_is_active();
$$;
create or replace function public.my_couple_actor() returns text
language sql stable security definer set search_path = public,pg_temp as $$
  select actor from public.wish_members where user_id = auth.uid() and public.my_account_is_active();
$$;

alter function public.get_my_couple() rename to get_my_couple_before_inactive_accounts;
revoke all on function public.get_my_couple_before_inactive_accounts() from public,anon,authenticated,service_role;
create function public.get_my_couple() returns jsonb
language plpgsql stable security definer set search_path = public,pg_temp as $$
begin
  if not public.my_account_is_active() then return null; end if;
  return public.get_my_couple_before_inactive_accounts();
end $$;
revoke all on function public.get_my_couple() from public,anon,authenticated;
grant execute on function public.get_my_couple() to authenticated;

alter function public.apply_wish_command(uuid,jsonb) rename to apply_wish_command_before_inactive_accounts;
revoke all on function public.apply_wish_command_before_inactive_accounts(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.apply_wish_command(p_user uuid,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  perform public.require_active_account(p_user);
  return public.apply_wish_command_before_inactive_accounts(p_user,p_command);
end $$;
revoke all on function public.apply_wish_command(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.apply_wish_command(uuid,jsonb) to service_role;

alter function public.create_couple(text,text) rename to create_couple_before_inactive_accounts;
revoke all on function public.create_couple_before_inactive_accounts(text,text) from public,anon,authenticated,service_role;
create function public.create_couple(p_name text,p_space_name text) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  perform public.require_active_account(auth.uid());
  return public.create_couple_before_inactive_accounts(p_name,p_space_name);
end $$;
revoke all on function public.create_couple(text,text) from public,anon,authenticated;
grant execute on function public.create_couple(text,text) to authenticated;

alter function public.join_couple(text,text) rename to join_couple_before_inactive_accounts;
revoke all on function public.join_couple_before_inactive_accounts(text,text) from public,anon,authenticated,service_role;
create function public.join_couple(p_code text,p_name text) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  perform public.require_active_account(auth.uid());
  return public.join_couple_before_inactive_accounts(p_code,p_name);
end $$;
revoke all on function public.join_couple(text,text) from public,anon,authenticated;
grant execute on function public.join_couple(text,text) to authenticated;

alter function public.register_push_token(text,text) rename to register_push_token_before_inactive_accounts;
revoke all on function public.register_push_token_before_inactive_accounts(text,text) from public,anon,authenticated,service_role;
create function public.register_push_token(p_token text,p_platform text) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  perform public.require_active_account(auth.uid());
  perform public.register_push_token_before_inactive_accounts(p_token,p_platform);
end $$;
revoke all on function public.register_push_token(text,text) from public,anon,authenticated;
grant execute on function public.register_push_token(text,text) to authenticated;

alter function public.register_web_push(jsonb) rename to register_web_push_before_inactive_accounts;
revoke all on function public.register_web_push_before_inactive_accounts(jsonb) from public,anon,authenticated,service_role;
create function public.register_web_push(p_subscription jsonb) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  perform public.require_active_account(auth.uid());
  perform public.register_web_push_before_inactive_accounts(p_subscription);
end $$;
revoke all on function public.register_web_push(jsonb) from public,anon,authenticated;
grant execute on function public.register_web_push(jsonb) to authenticated;

commit;

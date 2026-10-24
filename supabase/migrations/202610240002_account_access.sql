begin;

-- Account privileges are server-owned, never taken from editable auth metadata.
create table public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  plan text not null default 'normal' check (plan in ('normal','premium')),
  premium_expires_at timestamptz
);
alter table public.account_access enable row level security;
revoke all on public.account_access from public,anon,authenticated;
grant select on public.account_access to authenticated;
grant all on public.account_access to service_role;
create policy read_own_access on public.account_access for select to authenticated
  using (user_id = (select auth.uid()));

insert into public.account_access(user_id) select id from auth.users;
create function public.initialize_account_access() returns trigger
language plpgsql security definer set search_path = public,pg_temp as $$
begin
  insert into public.account_access(user_id) values(new.id);
  return new;
end $$;
revoke all on function public.initialize_account_access() from public,anon,authenticated;
create trigger initialize_account_access after insert on auth.users
  for each row execute function public.initialize_account_access();

create function public.get_my_account_access() returns jsonb
language plpgsql stable security definer set search_path = public,pg_temp as $$
declare account public.account_access;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  select * into account from public.account_access where user_id = auth.uid();
  return jsonb_build_object('role',coalesce(account.role,'user'), 'plan',coalesce(account.plan,'normal'),
    'premiumExpiresAt',account.premium_expires_at);
end $$;
revoke all on function public.get_my_account_access() from public,anon,authenticated;
grant execute on function public.get_my_account_access() to authenticated;

alter table public.check_ins add column template_id text not null default 'single'
  check (template_id in ('single','halves','columns','grid'));

-- Wrap the current transaction so ownership, privacy, and notification behavior
-- continue to run through the existing command chain.
alter function public.apply_wish_command(uuid,jsonb) rename to apply_wish_command_before_account_access;
revoke all on function public.apply_wish_command_before_account_access(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.apply_wish_command(p_user uuid,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare
  account public.account_access; member public.wish_members; existing public.check_ins;
  input jsonb := p_command->'input'; result jsonb; premium boolean;
  template text; offset_minutes integer; today date; saved_date date;
begin
  if p_command->>'kind' = 'checkIn' then
    select * into member from public.wish_members where user_id = p_user;
    if not found then raise exception 'Bạn cần ghép đôi trước.'; end if;
    -- Serialize with the existing command chain and deletion transactions.
    perform 1 from public.wish_couples where id = member.couple_id for update;
    select * into account from public.account_access where user_id = p_user for share;
    premium := coalesce(account.plan = 'premium' and (account.premium_expires_at is null or account.premium_expires_at > now()),false);
    select * into existing from public.check_ins where couple_id = member.couple_id and id = input->>'id' for update;
    if found and existing.created_by <> member.actor then raise exception 'Bạn chỉ có thể sửa check-in của mình.'; end if;
    template := coalesce(input->>'templateId','single');
    if template not in ('single','halves','columns','grid') then raise exception 'Template ảnh chưa hợp lệ.'; end if;
    if not premium and template <> 'single' and not coalesce(
      existing.template_id = template and existing.photo->>'storagePath' = input->'photo'->>'storagePath',false)
    then raise exception 'Template chụp ảnh dành cho gói Premium.'; end if;
    if input ? 'utcOffsetMinutes' and (jsonb_typeof(input->'utcOffsetMinutes') <> 'number'
      or (input->>'utcOffsetMinutes')::numeric <> trunc((input->>'utcOffsetMinutes')::numeric)
      or (input->>'utcOffsetMinutes')::numeric not between -720 and 840)
    then raise exception 'Múi giờ chưa hợp lệ.'; end if;
    -- Old clients default to Vietnam. New clients provide their device offset;
    -- only a real timezone offset is accepted, never a client-supplied today.
    offset_minutes := coalesce((input->>'utcOffsetMinutes')::integer,420);
    today := ((now() at time zone 'UTC') + make_interval(mins => offset_minutes))::date;
    saved_date := (input->>'visitedAt')::date;
    if saved_date > today then raise exception 'Ngày check-in cần là hôm nay hoặc một ngày đã qua.'; end if;
    if not premium and saved_date is distinct from coalesce(existing.visited_at,today)
    then raise exception 'Gói Normal chỉ check-in hôm nay và giữ nguyên ngày của kỷ niệm cũ.'; end if;
  end if;
  result := public.apply_wish_command_before_account_access(p_user,p_command);
  if p_command->>'kind' = 'checkIn' then
    update public.check_ins set template_id = template where couple_id = member.couple_id and id = input->>'id';
  end if;
  return result;
end $$;
revoke all on function public.apply_wish_command(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.apply_wish_command(uuid,jsonb) to service_role;

alter function public.get_my_couple() rename to get_my_couple_before_account_access;
revoke all on function public.get_my_couple_before_account_access() from public,anon,authenticated,service_role;
create function public.get_my_couple() returns jsonb
language plpgsql stable security definer set search_path = public,pg_temp as $$
declare result jsonb; items jsonb;
begin
  result := public.get_my_couple_before_account_access();
  if result is null then return null; end if;
  select coalesce(jsonb_agg(item.value || jsonb_build_object('templateId',c.template_id) order by item.ordinality),'[]'::jsonb)
    into items from jsonb_array_elements(result->'snapshot'->'checkIns') with ordinality item(value,ordinality)
    join public.check_ins c on c.couple_id = (result->>'id')::uuid and c.id = item.value->>'id';
  return jsonb_set(result,'{snapshot,checkIns}',items);
end $$;
revoke all on function public.get_my_couple() from public,anon,authenticated;
grant execute on function public.get_my_couple() to authenticated;

commit;

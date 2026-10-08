-- Private shared state; the RPC below removes the other person's preparations.
create table public.wish_couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique default gen_random_uuid()::text,
  invite_expires_at timestamptz not null default now() + interval '7 days'
);
create table public.wish_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.wish_couples(id) on delete cascade,
  actor text not null check (actor in ('minh', 'linh')),
  unique(couple_id, actor)
);
create table public.wish_state (
  couple_id uuid primary key references public.wish_couples(id) on delete cascade,
  snapshot jsonb not null,
  version bigint not null default 0
);
create table public.gift_notifications (
  id text primary key,
  couple_id uuid not null references public.wish_couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create unique index gift_memory_once on public.gift_notifications(couple_id, (payload->>'memoryId'));
create index gift_recipient on public.gift_notifications(recipient_id, created_at desc);
create table public.wish_push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index wish_push_user on public.wish_push_tokens(user_id) where enabled;
create table public.gift_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id text not null references public.gift_notifications(id) on delete cascade,
  token text not null references public.wish_push_tokens(token) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'accepted', 'delivered', 'failed')),
  attempts integer not null default 0,
  retry_at timestamptz not null default now(),
  ticket_id text,
  error text,
  created_at timestamptz not null default now(),
  unique(notification_id, token)
);

alter table public.wish_couples enable row level security;
alter table public.wish_members enable row level security;
alter table public.wish_state enable row level security;
alter table public.gift_notifications enable row level security;
alter table public.wish_push_tokens enable row level security;
alter table public.gift_push_deliveries enable row level security;
revoke all on public.wish_couples, public.wish_members, public.wish_state, public.wish_push_tokens, public.gift_push_deliveries, public.gift_notifications from anon, authenticated;
grant all on public.wish_couples, public.wish_members, public.wish_state, public.wish_push_tokens, public.gift_push_deliveries, public.gift_notifications to service_role;
grant select on public.gift_notifications to authenticated;
create policy recipient_reads_gifts on public.gift_notifications for select to authenticated using (recipient_id = (select auth.uid()));
alter publication supabase_realtime add table public.gift_notifications;

create function public.get_my_couple() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare member public.wish_members; data jsonb; invitation text;
begin
  select * into member from public.wish_members where user_id = auth.uid();
  if not found then return null; end if;
  select snapshot into data from public.wish_state where couple_id = member.couple_id;
  data := jsonb_set(data, '{preparations}', coalesce((select jsonb_agg(p) from jsonb_array_elements(data->'preparations') p where p->>'preparedBy' = member.actor), '[]'::jsonb));
  data := jsonb_set(data, '{notifications}', coalesce((select jsonb_agg(
    n.payload || jsonb_build_object('createdAt', n.created_at) || case when n.read_at is null then '{}'::jsonb else jsonb_build_object('readAt', n.read_at) end
    order by n.created_at desc) from public.gift_notifications n where n.recipient_id = auth.uid()), '[]'::jsonb));
  select case when invite_expires_at > now() and member.actor = 'minh' then invite_code else null end into invitation from public.wish_couples where id = member.couple_id;
  return jsonb_build_object('id', member.couple_id, 'actor', member.actor, 'inviteCode', invitation, 'snapshot', data);
end $$;

create function public.create_couple(p_name text, p_space_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.wish_members where user_id = auth.uid()) then return public.get_my_couple(); end if;
  if length(trim(p_name)) not between 1 and 40 or length(trim(p_space_name)) not between 1 and 60 then raise exception 'Nhập tên hợp lệ.'; end if;
  insert into public.wish_couples default values returning id into new_id;
  insert into public.wish_members values (auth.uid(), new_id, 'minh');
  insert into public.wish_state(couple_id, snapshot) values (new_id, jsonb_build_object(
    'wishes', '[]'::jsonb, 'preparations', '[]'::jsonb, 'memories', '[]'::jsonb, 'notifications', '[]'::jsonb,
    'couple', jsonb_build_object('name', trim(p_space_name), 'anniversaryDate', current_date::text,
      'members', jsonb_build_array(jsonb_build_object('id', 'minh', 'name', trim(p_name)), jsonb_build_object('id', 'linh', 'name', 'Người ấy')))
  ));
  return public.get_my_couple();
end $$;

create function public.join_couple(p_code text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare space public.wish_couples;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.wish_members where user_id = auth.uid()) then raise exception 'Bạn đã thuộc một không gian.'; end if;
  if length(trim(p_name)) not between 1 and 40 then raise exception 'Nhập tên hợp lệ.'; end if;
  select * into space from public.wish_couples where invite_code = trim(p_code) and invite_expires_at > now() for update;
  if not found then raise exception 'Mã mời không hợp lệ hoặc đã hết hạn.'; end if;
  if exists(select 1 from public.wish_members where couple_id = space.id and actor = 'linh') then raise exception 'Không gian đã có đủ hai người.'; end if;
  insert into public.wish_members values (auth.uid(), space.id, 'linh');
  update public.wish_state set snapshot = jsonb_set(snapshot, '{couple,members,1,name}', to_jsonb(trim(p_name))), version = version + 1 where couple_id = space.id;
  update public.wish_couples set invite_code = null where id = space.id;
  return public.get_my_couple();
end $$;

-- Only the authenticated Edge Function can commit shared state. The optimistic
-- version prevents one phone overwriting changes made by the other phone.
create function public.commit_wish_state(p_user uuid, p_version bigint, p_snapshot jsonb, p_gift jsonb default null, p_read_id text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare member public.wish_members; recipient uuid;
begin
  select * into member from public.wish_members where user_id = p_user;
  if not found then raise exception 'Chưa ghép đôi.'; end if;
  update public.wish_state set snapshot = p_snapshot, version = version + 1 where couple_id = member.couple_id and version = p_version;
  if not found then return false; end if;
  if p_gift is not null then
    select user_id into recipient from public.wish_members where couple_id = member.couple_id and actor <> member.actor;
    if recipient is null then raise exception 'Người ấy chưa tham gia không gian.'; end if;
    if p_gift->>'sender' <> member.actor or p_gift->>'recipient' = member.actor then raise exception 'Người nhận không hợp lệ.'; end if;
    insert into public.gift_notifications(id, couple_id, sender_id, recipient_id, payload) values (p_gift->>'id', member.couple_id, p_user, recipient, p_gift);
    insert into public.gift_push_deliveries(notification_id, token) select p_gift->>'id', token from public.wish_push_tokens where user_id = recipient and enabled;
  end if;
  if p_read_id is not null then update public.gift_notifications set read_at = coalesce(read_at, now()) where id = p_read_id and recipient_id = p_user; end if;
  return true;
end $$;

create function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' or p_platform not in ('ios', 'android') then raise exception 'Thiết bị không hợp lệ.'; end if;
  insert into public.wish_push_tokens(token, user_id, platform) values (p_token, auth.uid(), p_platform)
    on conflict(token) do update set user_id = auth.uid(), platform = excluded.platform, enabled = true, updated_at = now();
  insert into public.gift_push_deliveries(notification_id, token)
    select id, p_token from public.gift_notifications where recipient_id = auth.uid() and read_at is null and created_at > now() - interval '7 days'
    on conflict(notification_id, token) do nothing;
end $$;
create function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  update public.wish_push_tokens set enabled = false where token = p_token and user_id = auth.uid();
$$;

create function public.claim_gift_push(p_notification text default null) returns setof public.gift_push_deliveries
language plpgsql security definer set search_path = public as $$
begin
  update public.gift_push_deliveries set status = 'failed', error = 'AttemptsExhausted' where status in ('pending','sending') and attempts >= 8 and retry_at <= now();
  return query
  update public.gift_push_deliveries set status = 'sending', attempts = attempts + 1, retry_at = now() + interval '5 minutes'
  where id in (
    select d.id from public.gift_push_deliveries d
    join public.gift_notifications n on n.id = d.notification_id
    join public.wish_push_tokens t on t.token = d.token and t.enabled and t.user_id = n.recipient_id
    where (p_notification is null or d.notification_id = p_notification)
      and d.status in ('pending', 'sending') and d.retry_at <= now() and d.attempts < 8
    order by d.retry_at limit 50 for update of d skip locked
  ) returning *;
end
$$;

revoke all on function public.get_my_couple(), public.create_couple(text,text), public.join_couple(text,text), public.register_push_token(text,text), public.unregister_push_token(text), public.commit_wish_state(uuid,bigint,jsonb,jsonb,text), public.claim_gift_push(text) from public, anon, authenticated;
grant execute on function public.get_my_couple(), public.create_couple(text,text), public.join_couple(text,text), public.register_push_token(text,text), public.unregister_push_token(text) to authenticated;
grant execute on function public.commit_wish_state(uuid,bigint,jsonb,jsonb,text), public.claim_gift_push(text) to service_role;

-- Private photos, readable only by the two authenticated members. A storage path
-- stores couple/user IDs; signed links are generated when loading the snapshot.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('wish-photos', 'wish-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']);
create policy couple_reads_photos on storage.objects for select to authenticated using (
  bucket_id = 'wish-photos' and (storage.foldername(name))[1] = (public.get_my_couple()->>'id')
);
create policy member_uploads_photos on storage.objects for insert to authenticated with check (
  bucket_id = 'wish-photos' and (storage.foldername(name))[1] = (public.get_my_couple()->>'id')
  and (storage.foldername(name))[2] = auth.uid()::text
);

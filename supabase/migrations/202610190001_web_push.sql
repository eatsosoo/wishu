-- Browser subscriptions are separate from Expo tokens. All writes go through RPCs.
create table public.wish_web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index web_push_user on public.wish_web_push_subscriptions(user_id) where enabled;
create table public.gift_web_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id text not null references public.gift_notifications(id) on delete cascade,
  subscription_id uuid not null references public.wish_web_push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','accepted','failed')),
  attempts integer not null default 0,
  retry_at timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  unique(notification_id, subscription_id)
);
create index web_push_pending on public.gift_web_push_deliveries(retry_at) where status in ('pending','sending');
alter table public.wish_web_push_subscriptions enable row level security;
alter table public.gift_web_push_deliveries enable row level security;
revoke all on public.wish_web_push_subscriptions, public.gift_web_push_deliveries from public, anon, authenticated;
grant all on public.wish_web_push_subscriptions, public.gift_web_push_deliveries to service_role;

create function public.register_web_push(p_subscription jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare endpoint_value text := p_subscription->>'endpoint';
  public_key text := p_subscription->'keys'->>'p256dh';
  auth_key text := p_subscription->'keys'->>'auth';
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if exists(select 1 from public.account_deletion_requests where user_id = auth.uid()) then raise exception 'Tài khoản đang được xoá.'; end if;
  -- Restrict destinations: authenticated clients must never make the worker fetch arbitrary URLs.
  if endpoint_value is null or length(endpoint_value) > 4096
    or endpoint_value !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#]+$'
    or public_key is null or public_key !~ '^[A-Za-z0-9_-]{87}=?$'
    or auth_key is null or auth_key !~ '^[A-Za-z0-9_-]{22}(==)?$'
    then raise exception 'Thiết bị web không hợp lệ hoặc nhà cung cấp chưa được hỗ trợ.'; end if;
  insert into public.wish_web_push_subscriptions(user_id, endpoint, p256dh, auth)
    values (auth.uid(), endpoint_value, public_key, auth_key)
    on conflict(endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh,
      auth = excluded.auth, enabled = true, updated_at = now();
end $$;

create function public.unregister_web_push(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  update public.wish_web_push_subscriptions set enabled = false, updated_at = now()
    where endpoint = p_endpoint and user_id = auth.uid();
$$;
create function public.web_push_enabled(p_endpoint text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.wish_web_push_subscriptions
    where endpoint = p_endpoint and user_id = auth.uid() and enabled);
$$;

-- Runs inside the existing completion transaction; a rollback also removes this queue entry.
create function public.enqueue_gift_web_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.gift_web_push_deliveries(notification_id, subscription_id)
    select new.id, id from public.wish_web_push_subscriptions where user_id = new.recipient_id and enabled;
  return new;
end $$;
create trigger enqueue_gift_web_push after insert on public.gift_notifications
  for each row execute function public.enqueue_gift_web_push();

create function public.claim_gift_web_push(p_notification text default null) returns setof public.gift_web_push_deliveries
language plpgsql security definer set search_path = public as $$
begin
  update public.gift_web_push_deliveries d set status = 'failed', error = 'ExpiredOrAccountChanged'
    where d.status in ('pending','sending') and d.retry_at <= now() and (
      d.attempts >= 8 or d.created_at < now() - interval '1 day'
      or not exists(select 1 from public.wish_web_push_subscriptions s
        join public.gift_notifications n on n.id = d.notification_id
        where s.id = d.subscription_id and s.enabled and s.user_id = n.recipient_id));
  return query update public.gift_web_push_deliveries set status = 'sending', attempts = attempts + 1,
    retry_at = now() + interval '5 minutes'
    where id in (
      select d.id from public.gift_web_push_deliveries d
      join public.gift_notifications n on n.id = d.notification_id
      join public.wish_web_push_subscriptions s on s.id = d.subscription_id and s.enabled and s.user_id = n.recipient_id
      where (p_notification is null or d.notification_id = p_notification)
        and d.status in ('pending','sending') and d.retry_at <= now() and d.attempts < 8
      order by d.retry_at limit 50 for update of d skip locked
    ) returning *;
end $$;

revoke all on function public.register_web_push(jsonb), public.unregister_web_push(text), public.web_push_enabled(text),
  public.enqueue_gift_web_push(), public.claim_gift_web_push(text) from public, anon, authenticated;
grant execute on function public.register_web_push(jsonb), public.unregister_web_push(text), public.web_push_enabled(text) to authenticated;
grant execute on function public.claim_gift_web_push(text) to service_role;

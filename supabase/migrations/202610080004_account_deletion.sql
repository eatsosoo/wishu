-- A persisted request allows safe retries after Storage/network failures.
create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid,
  created_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant all on public.account_deletion_requests to service_role;

create function public.couple_is_deleting(p_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.account_deletion_requests where couple_id::text = p_id);
$$;
revoke all on function public.couple_is_deleting(text) from public, anon;
grant execute on function public.couple_is_deleting(text) to authenticated, service_role;

create function public.prepare_account_deletion(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare space_id uuid;
begin
  -- Serialize against create/join and other deletion requests for this user.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  if exists(select 1 from public.account_deletion_requests where user_id = p_user) then return; end if;
  select couple_id into space_id from public.wish_members where user_id = p_user;
  if space_id is not null then
    perform 1 from public.wish_couples where id = space_id for update;
    -- Serialize against updates already being committed before freezing the space.
    perform 1 from public.wish_state where couple_id = space_id for update;
    update public.wish_couples set invite_code = null, invite_expires_at = now() where id = space_id;
    delete from public.gift_notifications where couple_id = space_id;
  end if;
  insert into public.account_deletion_requests(user_id, couple_id) values (p_user, space_id);
end $$;

-- Return at most one deletion batch; paths come from the database, never a client.
create function public.account_deletion_photos(p_user uuid) returns table(name text)
language sql stable security definer set search_path = public as $$
  select o.name from storage.objects o
  join public.account_deletion_requests r on r.user_id = p_user
  where o.bucket_id = 'wish-photos' and (
    split_part(o.name, '/', 1) = r.couple_id::text
    or o.owner_id = p_user::text
  ) order by o.name limit 1000;
$$;

create function public.freeze_deleting_space() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.couple_is_deleting(new.couple_id::text) then
    raise exception 'Không gian đang được xoá. Vui lòng thử lại việc xoá tài khoản.';
  end if;
  if tg_table_name = 'wish_members' then
    if exists(select 1 from public.account_deletion_requests where user_id = new.user_id)
      then raise exception 'Tài khoản đang được xoá.'; end if;
  end if;
  return new;
end $$;
create trigger freeze_deleting_state before insert or update on public.wish_state
  for each row execute function public.freeze_deleting_space();
create trigger freeze_deleting_members before insert or update on public.wish_members
  for each row execute function public.freeze_deleting_space();

-- Restrictive policies also block new uploads during cleanup. Existing read
-- access remains available so an interrupted deletion can be retried in Settings.
create policy freeze_deleting_uploads on storage.objects as restrictive
  for insert to authenticated with check (
    bucket_id <> 'wish-photos' or not public.couple_is_deleting(split_part(name, '/', 1))
  );

-- Auth deletion and shared relational cleanup commit in one transaction.
-- The partner's Auth account is preserved, with no remaining couple membership.
create function public.finish_account_deletion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.wish_couples where id in (
    select couple_id from public.account_deletion_requests where user_id = old.id
  );
  return old;
end $$;
create trigger finish_account_deletion before delete on auth.users
  for each row execute function public.finish_account_deletion();

revoke all on function public.prepare_account_deletion(uuid), public.account_deletion_photos(uuid),
  public.freeze_deleting_space(), public.finish_account_deletion() from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid), public.account_deletion_photos(uuid) to service_role;

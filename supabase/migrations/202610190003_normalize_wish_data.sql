-- Keep wish_state as a read-only migration backup. JSON is now only an API DTO
-- and small photo metadata; all commands update relational rows transactionally.
begin;
lock table public.wish_couples, public.wish_members in share row exclusive mode;
lock table public.wish_state in access exclusive mode;

alter table public.wish_couples add column name text not null default 'Không gian của hai đứa';
alter table public.wish_couples add column anniversary_date date not null default current_date;
alter table public.wish_members add column display_name text not null default 'Người ấy';

create table public.wishes (
  couple_id uuid not null references public.wish_couples(id) on delete cascade,
  id text not null,
  created_by text not null,
  title text not null check (length(trim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 1000),
  short_description text,
  category text not null check (category in ('Quà tặng','Du lịch','Ăn uống','Trải nghiệm','Khoảnh khắc')),
  estimated_cost numeric not null default 0 check (estimated_cost >= 0),
  priority integer not null check (priority between 1 and 5),
  reference_url text not null default '' check (length(reference_url) <= 2048),
  cover jsonb not null check (jsonb_typeof(cover) = 'object'),
  target_date date,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(couple_id, id),
  foreign key(couple_id, created_by) references public.wish_members(couple_id, actor) on delete cascade
);
create index wishes_owner_category on public.wishes(couple_id, created_by, category, created_at desc, id);
create index wishes_created on public.wishes(couple_id, created_at desc, id);

create table public.preparations (
  couple_id uuid not null references public.wish_couples(id) on delete cascade,
  id text not null,
  wish_id text not null,
  prepared_by text not null,
  status text not null check (status in ('preparing','completed')),
  started_at date not null,
  completed_at date,
  created_at timestamptz not null default now(),
  primary key(couple_id, id),
  foreign key(couple_id, wish_id) references public.wishes(couple_id, id) on delete cascade,
  foreign key(couple_id, prepared_by) references public.wish_members(couple_id, actor) on delete cascade,
  check ((status = 'preparing' and completed_at is null) or (status = 'completed' and completed_at is not null))
);
create unique index preparations_one_active on public.preparations(couple_id, wish_id, prepared_by) where status = 'preparing';
create index preparations_owner_status on public.preparations(couple_id, prepared_by, status, created_at desc);

create table public.memories (
  couple_id uuid not null references public.wish_couples(id) on delete cascade,
  id text not null,
  wish_id text,
  -- Preserve the original ID for memories whose wish was already deleted.
  source_wish_id text not null,
  title text not null,
  category text not null check (category in ('Quà tặng','Du lịch','Ăn uống','Trải nghiệm','Khoảnh khắc')),
  completed_at date not null,
  note text not null default '' check (length(note) <= 2000),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(couple_id, id),
  foreign key(couple_id, wish_id) references public.wishes(couple_id, id) on delete set null (wish_id)
);
create index memories_calendar on public.memories(couple_id, completed_at desc, id);
create index memories_category_calendar on public.memories(couple_id, category, completed_at desc, id);
create index memories_wish on public.memories(couple_id, wish_id);
create table public.memory_photos (
  couple_id uuid not null,
  memory_id text not null,
  position integer not null check (position between 0 and 7),
  photo jsonb not null check (jsonb_typeof(photo) = 'object'),
  primary key(couple_id, memory_id, position),
  foreign key(couple_id, memory_id) references public.memories(couple_id, id) on delete cascade
);

-- Backfill in one transaction. Invalid legacy data aborts instead of being lost.
update public.wish_couples c set name = s.snapshot#>>'{couple,name}',
  anniversary_date = (s.snapshot#>>'{couple,anniversaryDate}')::date
from public.wish_state s where s.couple_id = c.id;
update public.wish_members m set display_name = p.value->>'name'
from public.wish_state s cross join lateral jsonb_array_elements(s.snapshot#>'{couple,members}') p(value)
where s.couple_id = m.couple_id and p.value->>'id' = m.actor;

insert into public.wishes(couple_id,id,created_by,title,description,short_description,category,estimated_cost,priority,reference_url,cover,target_date,favorite,created_at)
select s.couple_id, w->>'id', w->>'createdBy', w->>'title', coalesce(w->>'description',''), w->>'shortDescription',
  w->>'category', (w->>'estimatedCost')::numeric, (w->>'priority')::integer, coalesce(w->>'referenceUrl',''), w->'cover',
  nullif(w->>'targetDate','')::date, coalesce((w->>'favorite')::boolean,false), now() - n * interval '1 microsecond'
from public.wish_state s cross join lateral jsonb_array_elements(s.snapshot->'wishes') with ordinality p(w,n);
insert into public.preparations(couple_id,id,wish_id,prepared_by,status,started_at,completed_at,created_at)
select s.couple_id, p->>'id',p->>'wishId',p->>'preparedBy',p->>'status',(p->>'startedAt')::date,
  nullif(p->>'completedAt','')::date,now() - n * interval '1 microsecond'
from public.wish_state s cross join lateral jsonb_array_elements(s.snapshot->'preparations') with ordinality a(p,n);
insert into public.memories(couple_id,id,wish_id,source_wish_id,title,category,completed_at,note,favorite,created_at)
select s.couple_id,m->>'id',w.id,m->>'wishId',m->>'title',m->>'category',(m->>'completedAt')::date,
  coalesce(m->>'note',''),coalesce((m->>'favorite')::boolean,false),now() - n * interval '1 microsecond'
from public.wish_state s cross join lateral jsonb_array_elements(s.snapshot->'memories') with ordinality a(m,n)
left join public.wishes w on w.couple_id = s.couple_id and w.id = m->>'wishId';
insert into public.memory_photos(couple_id,memory_id,position,photo)
select s.couple_id,m->>'id',(n-1)::integer,p
from public.wish_state s cross join lateral jsonb_array_elements(s.snapshot->'memories') a(m)
cross join lateral jsonb_array_elements(m->'photos') with ordinality b(p,n);

do $$
begin
  if (select count(*) from public.wishes) <> (select coalesce(sum(jsonb_array_length(snapshot->'wishes')),0) from public.wish_state)
    or (select count(*) from public.preparations) <> (select coalesce(sum(jsonb_array_length(snapshot->'preparations')),0) from public.wish_state)
    or (select count(*) from public.memories) <> (select coalesce(sum(jsonb_array_length(snapshot->'memories')),0) from public.wish_state)
    or (select count(*) from public.memory_photos) <> (select coalesce(sum(jsonb_array_length(m->'photos')),0) from public.wish_state cross join lateral jsonb_array_elements(snapshot->'memories') a(m))
  then raise exception 'Relational backfill counts do not match the legacy snapshot'; end if;
end $$;

alter table public.gift_notifications add column memory_id text;
update public.gift_notifications n set memory_id = m.id from public.memories m
where m.couple_id = n.couple_id and m.id = n.payload->>'memoryId';
alter table public.gift_notifications add foreign key(couple_id,memory_id) references public.memories(couple_id,id) on delete cascade;
create index gift_memory_lookup on public.gift_notifications(couple_id,memory_id);

create function public.my_couple_id() returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select couple_id from public.wish_members where user_id = auth.uid();
$$;
create function public.my_couple_actor() returns text language sql stable security definer set search_path = public, pg_temp as $$
  select actor from public.wish_members where user_id = auth.uid();
$$;
revoke all on function public.my_couple_id(), public.my_couple_actor() from public, anon;
grant execute on function public.my_couple_id(), public.my_couple_actor() to authenticated, service_role;

alter table public.wishes enable row level security;
alter table public.preparations enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
revoke all on public.wishes, public.preparations, public.memories, public.memory_photos from public, anon, authenticated;
grant select on public.wishes, public.preparations, public.memories, public.memory_photos to authenticated;
grant all on public.wishes, public.preparations, public.memories, public.memory_photos to service_role;
create policy couple_reads_wishes on public.wishes for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy preparer_reads_preparations on public.preparations for select to authenticated using (couple_id = (select public.my_couple_id()) and prepared_by = (select public.my_couple_actor()));
create policy couple_reads_memories on public.memories for select to authenticated using (couple_id = (select public.my_couple_id()));
create policy couple_reads_memory_photos on public.memory_photos for select to authenticated using (couple_id = (select public.my_couple_id()));
create trigger freeze_deleting_wishes before insert or update on public.wishes for each row execute function public.freeze_deleting_space();
create trigger freeze_deleting_preparations before insert or update on public.preparations for each row execute function public.freeze_deleting_space();
create trigger freeze_deleting_memories before insert or update on public.memories for each row execute function public.freeze_deleting_space();
create trigger freeze_deleting_memory_photos before insert or update on public.memory_photos for each row execute function public.freeze_deleting_space();

-- Maintain the existing mobile API contract without storing a JSON snapshot.
create or replace function public.get_my_couple() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare member public.wish_members; space public.wish_couples; data jsonb;
begin
  select * into member from public.wish_members where user_id = auth.uid();
  if not found then return null; end if;
  select * into space from public.wish_couples where id = member.couple_id;
  data := jsonb_build_object(
    'couple',jsonb_build_object('name',space.name,'anniversaryDate',space.anniversary_date,'members',
      (select jsonb_agg(jsonb_build_object('id',a.actor,'name',coalesce(m.display_name,'Người ấy')) order by a.actor desc)
       from (values ('minh'),('linh')) a(actor) left join public.wish_members m on m.couple_id = space.id and m.actor = a.actor)),
    'wishes',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',w.id,'createdBy',w.created_by,'title',w.title,'description',w.description,'shortDescription',w.short_description,
      'category',w.category,'estimatedCost',w.estimated_cost,'priority',w.priority,'referenceUrl',w.reference_url,
      'cover',w.cover,'targetDate',w.target_date,'favorite',w.favorite)) order by w.created_at desc,w.id) from public.wishes w where w.couple_id = space.id),'[]'::jsonb),
    'preparations',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',p.id,'wishId',p.wish_id,'preparedBy',p.prepared_by,'status',p.status,'startedAt',p.started_at,'completedAt',p.completed_at))
      order by p.created_at desc,p.id) from public.preparations p where p.couple_id = space.id and p.prepared_by = member.actor),'[]'::jsonb),
    'memories',coalesce((select jsonb_agg(jsonb_build_object(
      'id',m.id,'wishId',m.source_wish_id,'title',m.title,'category',m.category,'completedAt',m.completed_at,'note',m.note,'favorite',m.favorite,
      'photos',coalesce((select jsonb_agg(p.photo order by p.position) from public.memory_photos p where p.couple_id = m.couple_id and p.memory_id = m.id),'[]'::jsonb))
      order by m.created_at desc,m.id) from public.memories m where m.couple_id = space.id),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(n.payload || jsonb_build_object('createdAt',n.created_at) ||
      case when n.read_at is null then '{}'::jsonb else jsonb_build_object('readAt',n.read_at) end order by n.created_at desc,n.id)
      from public.gift_notifications n where n.couple_id = space.id and n.recipient_id = auth.uid()),'[]'::jsonb));
  return jsonb_build_object('id',space.id,'actor',member.actor,'inviteCode',case when space.invite_expires_at > now() and member.actor = 'minh' then space.invite_code else null end,'snapshot',data);
end $$;

create or replace function public.create_couple(p_name text,p_space_name text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if exists(select 1 from public.account_deletion_requests where user_id = auth.uid()) then raise exception 'Tài khoản đang được xoá.'; end if;
  if exists(select 1 from public.wish_members where user_id = auth.uid()) then return public.get_my_couple(); end if;
  if p_name is null or p_space_name is null or length(trim(p_name)) not between 1 and 40 or length(trim(p_space_name)) not between 1 and 60 then raise exception 'Nhập tên hợp lệ.'; end if;
  insert into public.wish_couples(name) values(trim(p_space_name)) returning id into new_id;
  insert into public.wish_members(user_id,couple_id,actor,display_name) values(auth.uid(),new_id,'minh',trim(p_name));
  return public.get_my_couple();
end $$;
create or replace function public.join_couple(p_code text,p_name text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare space public.wish_couples;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if exists(select 1 from public.account_deletion_requests where user_id = auth.uid()) then raise exception 'Tài khoản đang được xoá.'; end if;
  if exists(select 1 from public.wish_members where user_id = auth.uid()) then raise exception 'Bạn đã thuộc một không gian.'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 40 then raise exception 'Nhập tên hợp lệ.'; end if;
  select * into space from public.wish_couples where upper(invite_code) = upper(trim(p_code)) and invite_expires_at > now() for update;
  if not found or public.couple_is_deleting(space.id::text) then raise exception 'Mã mời không hợp lệ hoặc đã hết hạn.'; end if;
  if exists(select 1 from public.wish_members where couple_id = space.id and actor = 'linh') then raise exception 'Không gian đã có đủ hai người.'; end if;
  insert into public.wish_members(user_id,couple_id,actor,display_name) values(auth.uid(),space.id,'linh',trim(p_name));
  update public.wish_couples set invite_code = null where id = space.id;
  return public.get_my_couple();
end $$;

create function public.valid_wish_photo(photo jsonb,space_id uuid) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select coalesce(jsonb_typeof(photo) = 'object' and (
    (photo->>'art') in ('home','couple','jar','jarOpen','gift','openGift','camera','bear','bearPortrait','bearReference','travel','travelMemory','photobooth','concert','photoMemory','memoryOne','memoryTwo','memoryThree','categoryGift','categoryTravel','categoryDining','categoryExperience','categoryMoments')
    or (length(photo->>'uri') <= 2048 and ((photo->>'uri') ~ '^https://' or
      (photo->>'storagePath' like space_id::text || '/%' and photo->>'uri' = 'storage://' || (photo->>'storagePath'))))
  ),false);
$$;
revoke all on function public.valid_wish_photo(jsonb,uuid) from public, anon, authenticated;

-- Service-only RPC: p_user is resolved from the verified bearer token by the Edge
-- Function. Row locks serialize operations on a wish; no full-snapshot rewrite.
create function public.apply_wish_command(p_user uuid,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare member public.wish_members; item public.wishes; prep public.preparations;
  action text := p_command->>'kind'; input jsonb := p_command->'input'; key text := p_command->>'id';
  new_id text; gift_id text; recipient uuid; recipient_actor text; photo jsonb; gift jsonb; completion_date date;
begin
  select * into member from public.wish_members where user_id = p_user;
  if not found then raise exception 'Bạn cần ghép đôi trước.'; end if;
  -- Shared against account deletion, which takes FOR UPDATE on this same row.
  perform 1 from public.wish_couples where id = member.couple_id for key share;
  if not found then raise exception 'Bạn cần ghép đôi trước.'; end if;
  if public.couple_is_deleting(member.couple_id::text) then raise exception 'Không gian đang được xoá.'; end if;
  case action
  when 'add' then
    if not public.valid_wish_photo(input->'cover',member.couple_id) then raise exception 'Ảnh không hợp lệ.'; end if;
    new_id := 'wish-' || gen_random_uuid()::text;
    insert into public.wishes(couple_id,id,created_by,title,description,category,estimated_cost,priority,reference_url,cover,target_date)
    values(member.couple_id,new_id,member.actor,trim(input->>'title'),coalesce(input->>'description',''),input->>'category',
      (input->>'estimatedCost')::numeric,(input->>'priority')::integer,coalesce(input->>'referenceUrl',''),input->'cover',nullif(input->>'targetDate','')::date);
  when 'prepare' then
    select * into item from public.wishes where couple_id = member.couple_id and id = key for update;
    if not found or item.created_by = member.actor then raise exception 'Chỉ có thể chuẩn bị điều ước của người ấy.'; end if;
    if not exists(select 1 from public.preparations where couple_id = member.couple_id and wish_id = key and prepared_by = member.actor and status = 'preparing') then
      insert into public.preparations(couple_id,id,wish_id,prepared_by,status,started_at)
      values(member.couple_id,'preparation-' || gen_random_uuid()::text,key,member.actor,'preparing',current_date);
    end if;
  when 'complete' then
    select * into item from public.wishes where couple_id = member.couple_id and id = input->>'wishId' for update;
    if not found or item.created_by = member.actor then raise exception 'Chỉ có thể hoàn thành điều ước của người ấy.'; end if;
    select * into prep from public.preparations where couple_id = member.couple_id and wish_id = item.id and prepared_by = member.actor and status = 'preparing' for update;
    if not found then
      if exists(select 1 from public.preparations where couple_id = member.couple_id and wish_id = item.id and prepared_by = member.actor and status = 'completed') then return jsonb_build_object('giftId',null); end if;
      raise exception 'Điều ước này chưa có trong danh sách bạn đang chuẩn bị.';
    end if;
    if jsonb_typeof(input->'photos') is distinct from 'array' then raise exception 'Danh sách ảnh không hợp lệ.'; end if;
    if jsonb_array_length(input->'photos') > 8 then raise exception 'Mỗi kỷ niệm có tối đa 8 ảnh.'; end if;
    for photo in select value from jsonb_array_elements(input->'photos') loop
      if not public.valid_wish_photo(photo,member.couple_id) then raise exception 'Ảnh không hợp lệ.'; end if;
    end loop;
    completion_date := (input->>'completedAt')::date;
    if completion_date::text is distinct from input->>'completedAt' then raise exception 'Ngày hoàn thành không hợp lệ.'; end if;
    select user_id,actor into recipient,recipient_actor from public.wish_members where couple_id = member.couple_id and actor <> member.actor;
    if recipient is null then raise exception 'Người ấy chưa tham gia không gian.'; end if;
    new_id := 'memory-' || gen_random_uuid()::text;
    insert into public.memories(couple_id,id,wish_id,source_wish_id,title,category,completed_at,note)
    values(member.couple_id,new_id,item.id,item.id,item.title,item.category,completion_date,coalesce(input->>'note',''));
    insert into public.memory_photos(couple_id,memory_id,position,photo)
    select member.couple_id,new_id,(n-1)::integer,value from jsonb_array_elements(
      case when jsonb_array_length(input->'photos') = 0 then jsonb_build_array(item.cover) else input->'photos' end) with ordinality a(value,n);
    update public.preparations set status = 'completed',completed_at = completion_date where couple_id = member.couple_id and id = prep.id;
    gift_id := 'gift-' || gen_random_uuid()::text;
    gift := jsonb_build_object('id',gift_id,'wishId',item.id,'memoryId',new_id,'sender',member.actor,'recipient',recipient_actor,'title',item.title,'createdAt',now());
    insert into public.gift_notifications(id,couple_id,sender_id,recipient_id,payload,memory_id) values(gift_id,member.couple_id,p_user,recipient,gift,new_id);
    insert into public.gift_push_deliveries(notification_id,token) select gift_id,token from public.wish_push_tokens where user_id = recipient and enabled;
  when 'delete' then
    select * into item from public.wishes where couple_id = member.couple_id and id = key for update;
    if found then
      if item.created_by <> member.actor then raise exception 'Bạn chỉ có thể xoá điều ước của mình.'; end if;
      delete from public.wishes where couple_id = member.couple_id and id = key;
    end if;
  when 'wishFavorite' then
    update public.wishes set favorite = not favorite where couple_id = member.couple_id and id = key;
  when 'memoryFavorite' then
    update public.memories set favorite = not favorite where couple_id = member.couple_id and id = key;
  when 'read' then
    update public.gift_notifications set read_at = coalesce(read_at,now()) where couple_id = member.couple_id and id = key and recipient_id = p_user;
  when 'couple' then
    if length(trim(p_command->>'name')) not between 1 and 60 or p_command->>'name' is null then raise exception 'Nhập tên hợp lệ.'; end if;
    completion_date := (p_command->>'anniversaryDate')::date;
    if completion_date::text is distinct from p_command->>'anniversaryDate' then raise exception 'Ngày kỷ niệm không hợp lệ.'; end if;
    update public.wish_couples set name = trim(p_command->>'name'),anniversary_date = completion_date where id = member.couple_id;
  else raise exception 'Thao tác không hợp lệ.';
  end case;
  return jsonb_build_object('giftId',gift_id);
end $$;
revoke all on function public.apply_wish_command(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.apply_wish_command(uuid,jsonb) to service_role;

create or replace function public.prepare_account_deletion(p_user uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare space_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if exists(select 1 from public.account_deletion_requests where user_id = p_user) then return; end if;
  select couple_id into space_id from public.wish_members where user_id = p_user;
  if space_id is not null then
    perform 1 from public.wish_couples where id = space_id for update;
    update public.wish_couples set invite_code = null,invite_expires_at = now() where id = space_id;
    delete from public.gift_notifications where couple_id = space_id;
  end if;
  insert into public.account_deletion_requests(user_id,couple_id) values(p_user,space_id);
end $$;

-- Avoid constructing the entire API response merely to authorize one file.
drop policy couple_reads_photos on storage.objects;
drop policy member_uploads_photos on storage.objects;
create policy couple_reads_photos on storage.objects for select to authenticated using (
  bucket_id = 'wish-photos' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
create policy member_uploads_photos on storage.objects for insert to authenticated with check (
  bucket_id = 'wish-photos' and (storage.foldername(name))[1] = (select public.my_couple_id())::text and (storage.foldername(name))[2] = (select auth.uid())::text);

-- An old Edge Function must fail visibly rather than writing the archived JSON.
create or replace function public.commit_wish_state(p_user uuid,p_version bigint,p_snapshot jsonb,p_gift jsonb default null,p_read_id text default null) returns boolean
language plpgsql set search_path = public, pg_temp as $$
begin raise exception 'Backend cần cập nhật wish-action cho cấu trúc dữ liệu mới.'; end $$;
revoke all on public.wish_state from public, anon, authenticated, service_role;
revoke all on function public.commit_wish_state(uuid,bigint,jsonb,jsonb,text) from public, anon, authenticated, service_role;
comment on table public.wish_state is 'Read-only legacy snapshot backup from relational migration. No application reads/writes.';
commit;

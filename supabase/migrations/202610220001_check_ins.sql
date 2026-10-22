begin;

create table public.check_ins (
  couple_id uuid not null references public.wish_couples(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  created_by text not null check (created_by in ('minh','linh')),
  title text not null check (length(trim(title)) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  visited_at date not null,
  companion text not null default '' check (length(companion) <= 100),
  note text not null default '' check (length(note) <= 2000),
  photo jsonb not null check (jsonb_typeof(photo) = 'object'),
  created_at timestamptz not null default now(),
  primary key(couple_id,id)
);
create index check_ins_by_date on public.check_ins(couple_id,visited_at desc);
alter table public.check_ins enable row level security;
revoke all on public.check_ins from public,anon,authenticated;
grant select on public.check_ins to authenticated;
grant all on public.check_ins to service_role;
create policy couple_reads_check_ins on public.check_ins for select to authenticated using (couple_id = (select public.my_couple_id()));
create trigger freeze_deleting_check_ins before insert or update on public.check_ins for each row execute function public.freeze_deleting_space();

drop policy couple_reads_photos on storage.objects;
create policy couple_reads_photos on storage.objects for select to authenticated using (
  bucket_id = 'wish-photos' and (storage.foldername(name))[1] = (select public.my_couple_id())::text
  and ((storage.foldername(name))[2] = (select auth.uid())::text
    or exists(select 1 from public.wishes w where w.couple_id = (select public.my_couple_id()) and w.cover->>'storagePath' = name)
    or exists(select 1 from public.memory_photos p where p.couple_id = (select public.my_couple_id()) and p.photo->>'storagePath' = name)
    or exists(select 1 from public.check_ins c where c.couple_id = (select public.my_couple_id()) and c.photo->>'storagePath' = name)));

-- Keep existing wish behavior and permissions intact; add transactional check-ins.
alter function public.apply_wish_command(uuid,jsonb) rename to apply_wish_command_before_check_ins;
revoke all on function public.apply_wish_command_before_check_ins(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.apply_wish_command(p_user uuid,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare member public.wish_members; input jsonb := p_command->'input'; existing public.check_ins;
begin
  if p_command->>'kind' not in ('checkIn','deleteCheckIn') then
    return public.apply_wish_command_before_check_ins(p_user,p_command);
  end if;
  select * into member from public.wish_members where user_id = p_user;
  if not found then raise exception 'Bạn cần ghép đôi trước.'; end if;
  perform 1 from public.wish_couples where id = member.couple_id for update;
  if not found or public.couple_is_deleting(member.couple_id::text) then raise exception 'Không gian đang được xoá.'; end if;
  select * into existing from public.check_ins where couple_id = member.couple_id and id = coalesce(input->>'id',p_command->>'id') for update;
  if found and existing.created_by <> member.actor then raise exception 'Bạn chỉ có thể sửa hoặc xoá check-in của mình.'; end if;
  if p_command->>'kind' = 'deleteCheckIn' then
    delete from public.check_ins where couple_id = member.couple_id and id = p_command->>'id' and created_by = member.actor;
  else
    if not public.valid_wish_photo(input->'photo',member.couple_id) or input->'photo' ? 'art' then raise exception 'Ảnh không hợp lệ.'; end if;
    insert into public.check_ins(couple_id,id,created_by,title,latitude,longitude,visited_at,companion,note,photo)
    values(member.couple_id,input->>'id',member.actor,trim(input->>'title'),(input->>'latitude')::double precision,
      (input->>'longitude')::double precision,(input->>'visitedAt')::date,coalesce(input->>'companion',''),coalesce(input->>'note',''),input->'photo')
    on conflict(couple_id,id) do update set title=excluded.title,latitude=excluded.latitude,longitude=excluded.longitude,
      visited_at=excluded.visited_at,companion=excluded.companion,note=excluded.note,photo=excluded.photo;
  end if;
  return '{}'::jsonb;
end $$;
revoke all on function public.apply_wish_command(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.apply_wish_command(uuid,jsonb) to service_role;
create or replace function public.get_my_couple() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare member public.wish_members; space public.wish_couples; data jsonb;
begin
  select * into member from public.wish_members where user_id = auth.uid();
  if not found then return null; end if;
  select * into space from public.wish_couples where id = member.couple_id;
  data := jsonb_build_object(
    'couple',jsonb_build_object('name',space.name,'anniversaryDate',space.anniversary_date,'members',
      (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',a.actor,'name',coalesce(m.display_name,'Người ấy'),'birthDate',m.birth_date,'gender',m.gender,'joined',m.user_id is not null)) order by a.actor desc)
       from (values ('minh'),('linh')) a(actor) left join public.wish_members m on m.couple_id = space.id and m.actor = a.actor)),
    'wishes',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',w.id,'createdBy',w.created_by,'title',w.title,'description',w.description,'shortDescription',w.short_description,
      'category',w.category,'estimatedCost',w.estimated_cost,'priority',w.priority,'referenceUrl',w.reference_url,
      'active',w.active,'cover',w.cover,'targetDate',w.target_date,'favorite',w.favorite)) order by w.created_at desc,w.id) from public.wishes w where w.couple_id = space.id and (w.active or w.created_by = member.actor)),'[]'::jsonb),
    'preparations',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',p.id,'wishId',p.wish_id,'preparedBy',p.prepared_by,'status',p.status,'startedAt',p.started_at,'completedAt',p.completed_at))
      order by p.created_at desc,p.id) from public.preparations p where p.couple_id = space.id and p.prepared_by = member.actor and exists(select 1 from public.wishes w where w.couple_id = p.couple_id and w.id = p.wish_id and (w.active or w.created_by = member.actor))),'[]'::jsonb),
    'memories',coalesce((select jsonb_agg(jsonb_build_object(
      'id',m.id,'wishId',m.source_wish_id,'title',m.title,'category',m.category,'completedAt',m.completed_at,'note',m.note,'favorite',m.favorite,
      'photos',coalesce((select jsonb_agg(p.photo order by p.position) from public.memory_photos p where p.couple_id = m.couple_id and p.memory_id = m.id),'[]'::jsonb))
      order by m.created_at desc,m.id) from public.memories m where m.couple_id = space.id),'[]'::jsonb),
    'checkIns',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'createdBy',c.created_by,'title',c.title,'latitude',c.latitude,'longitude',c.longitude,'visitedAt',c.visited_at,'companion',c.companion,'note',c.note,'photo',c.photo) order by c.visited_at desc,c.created_at desc,c.id) from public.check_ins c where c.couple_id = space.id),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(n.payload || jsonb_build_object('createdAt',n.created_at) ||
      case when n.read_at is null then '{}'::jsonb else jsonb_build_object('readAt',n.read_at) end order by n.created_at desc,n.id)
      from public.gift_notifications n where n.couple_id = space.id and n.recipient_id = auth.uid()),'[]'::jsonb));
  return jsonb_build_object('id',space.id,'actor',member.actor,'inviteCode',case when space.invite_expires_at > now() and member.actor = 'minh' then space.invite_code else null end,'snapshot',data);
end $$;
commit;


begin;
-- Preserve visibility for existing wishes and older clients.
alter table public.wishes add column active boolean not null default true;
drop policy couple_reads_wishes on public.wishes;
create policy couple_reads_wishes on public.wishes for select to authenticated using (
  couple_id = (select public.my_couple_id()) and (active or created_by = (select public.my_couple_actor())));
drop policy preparer_reads_preparations on public.preparations;
create policy preparer_reads_preparations on public.preparations for select to authenticated using (
  couple_id = (select public.my_couple_id()) and prepared_by = (select public.my_couple_actor())
  and exists(select 1 from public.wishes w where w.couple_id = preparations.couple_id and w.id = preparations.wish_id));

-- Uploaded drafts are visible to their uploader. Other files must be referenced
-- by a visible wish or an already shared memory. Memories remain shared history.
drop policy couple_reads_photos on storage.objects;
create policy couple_reads_photos on storage.objects for select to authenticated using (
  bucket_id = 'wish-photos' and (storage.foldername(name))[1] = (select public.my_couple_id())::text
  and ((storage.foldername(name))[2] = (select auth.uid())::text
    or exists(select 1 from public.wishes w where w.couple_id = (select public.my_couple_id()) and w.cover->>'storagePath' = name)
    or exists(select 1 from public.memory_photos p where p.couple_id = (select public.my_couple_id()) and p.photo->>'storagePath' = name)));

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
      'active',w.active,'cover',w.cover,'targetDate',w.target_date,'favorite',w.favorite)) order by w.created_at desc,w.id) from public.wishes w where w.couple_id = space.id and (w.active or w.created_by = member.actor)),'[]'::jsonb),
    'preparations',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',p.id,'wishId',p.wish_id,'preparedBy',p.prepared_by,'status',p.status,'startedAt',p.started_at,'completedAt',p.completed_at))
      order by p.created_at desc,p.id) from public.preparations p where p.couple_id = space.id and p.prepared_by = member.actor and exists(select 1 from public.wishes w where w.couple_id = p.couple_id and w.id = p.wish_id and (w.active or w.created_by = member.actor))),'[]'::jsonb),
    'memories',coalesce((select jsonb_agg(jsonb_build_object(
      'id',m.id,'wishId',m.source_wish_id,'title',m.title,'category',m.category,'completedAt',m.completed_at,'note',m.note,'favorite',m.favorite,
      'photos',coalesce((select jsonb_agg(p.photo order by p.position) from public.memory_photos p where p.couple_id = m.couple_id and p.memory_id = m.id),'[]'::jsonb))
      order by m.created_at desc,m.id) from public.memories m where m.couple_id = space.id),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(n.payload || jsonb_build_object('createdAt',n.created_at) ||
      case when n.read_at is null then '{}'::jsonb else jsonb_build_object('readAt',n.read_at) end order by n.created_at desc,n.id)
      from public.gift_notifications n where n.couple_id = space.id and n.recipient_id = auth.uid()),'[]'::jsonb));
  return jsonb_build_object('id',space.id,'actor',member.actor,'inviteCode',case when space.invite_expires_at > now() and member.actor = 'minh' then space.invite_code else null end,'snapshot',data);
end $$;

-- Limit new memories to four photos; preserve existing memories and photos.
create or replace function public.apply_wish_command(p_user uuid,p_command jsonb) returns jsonb
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
    insert into public.wishes(couple_id,id,created_by,title,description,category,estimated_cost,priority,reference_url,cover,target_date,active)
    values(member.couple_id,new_id,member.actor,trim(input->>'title'),coalesce(input->>'description',''),input->>'category',
      (input->>'estimatedCost')::numeric,(input->>'priority')::integer,coalesce(input->>'referenceUrl',''),input->'cover',nullif(input->>'targetDate','')::date,coalesce((input->>'active')::boolean,true));
  when 'wishActive' then
    if jsonb_typeof(p_command->'active') is distinct from 'boolean' then raise exception 'Trạng thái hiển thị không hợp lệ.'; end if;
    select * into item from public.wishes where couple_id = member.couple_id and id = key for update;
    if not found or item.created_by <> member.actor then raise exception 'Bạn chỉ có thể đổi hiển thị điều ước của mình.'; end if;
    update public.wishes set active = (p_command->>'active')::boolean where couple_id = member.couple_id and id = key;
  when 'prepare' then
    select * into item from public.wishes where couple_id = member.couple_id and id = key for update;
    if not found or not item.active or item.created_by = member.actor then raise exception 'Chỉ có thể chuẩn bị điều ước của người ấy.'; end if;
    if not exists(select 1 from public.preparations where couple_id = member.couple_id and wish_id = key and prepared_by = member.actor and status = 'preparing') then
      insert into public.preparations(couple_id,id,wish_id,prepared_by,status,started_at)
      values(member.couple_id,'preparation-' || gen_random_uuid()::text,key,member.actor,'preparing',current_date);
    end if;
  when 'complete' then
    select * into item from public.wishes where couple_id = member.couple_id and id = input->>'wishId' for update;
    if not found or not item.active or item.created_by = member.actor then raise exception 'Chỉ có thể hoàn thành điều ước của người ấy.'; end if;
    select * into prep from public.preparations where couple_id = member.couple_id and wish_id = item.id and prepared_by = member.actor and status = 'preparing' for update;
    if not found then
      if exists(select 1 from public.preparations where couple_id = member.couple_id and wish_id = item.id and prepared_by = member.actor and status = 'completed') then return jsonb_build_object('giftId',null); end if;
      raise exception 'Điều ước này chưa có trong danh sách bạn đang chuẩn bị.';
    end if;
    if jsonb_typeof(input->'photos') is distinct from 'array' then raise exception 'Danh sách ảnh không hợp lệ.'; end if;
    if jsonb_array_length(input->'photos') > 4 then raise exception 'Mỗi kỷ niệm có tối đa 4 ảnh.'; end if;
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
    update public.wishes set favorite = not favorite where couple_id = member.couple_id and id = key and (active or created_by = member.actor);
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

commit;

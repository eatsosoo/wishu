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

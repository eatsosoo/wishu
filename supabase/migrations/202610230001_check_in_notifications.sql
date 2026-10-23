begin;

alter table public.gift_notifications add column check_in_id text;
alter table public.gift_notifications add foreign key(couple_id,check_in_id)
  references public.check_ins(couple_id,id) on delete cascade;
create unique index check_in_notification_once on public.gift_notifications(couple_id,check_in_id);

create or replace function public.apply_wish_command(p_user uuid,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare member public.wish_members; input jsonb := p_command->'input'; existing public.check_ins;
  recipient public.wish_members; notification_id text; notification jsonb;
begin
  if p_command->>'kind' not in ('checkIn','deleteCheckIn') then
    return public.apply_wish_command_before_check_ins(p_user,p_command);
  end if;
  select * into member from public.wish_members where user_id = p_user;
  if not found then raise exception 'Bạn cần ghép đôi trước.'; end if;
  -- Serialize retries before checking whether this is a new check-in.
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
    if existing.id is null then
      select * into recipient from public.wish_members where couple_id = member.couple_id and user_id <> p_user;
      if found then
        notification_id := 'checkin-' || gen_random_uuid()::text;
        notification := jsonb_build_object('id',notification_id,'kind','checkIn','checkInId',input->>'id',
          'sender',member.actor,'recipient',recipient.actor,'title',trim(input->>'title'),'createdAt',now());
        -- Notification and both push outboxes share the check-in transaction.
        -- The existing notification trigger enqueues web push deliveries.
        insert into public.gift_notifications(id,couple_id,sender_id,recipient_id,payload,check_in_id)
          values(notification_id,member.couple_id,p_user,recipient.user_id,notification,input->>'id');
        insert into public.gift_push_deliveries(notification_id,token)
          select notification_id,token from public.wish_push_tokens where user_id = recipient.user_id and enabled;
        return jsonb_build_object('notificationId',notification_id);
      end if;
    end if;
  end if;
  return '{}'::jsonb;
end $$;
revoke all on function public.apply_wish_command(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.apply_wish_command(uuid,jsonb) to service_role;

commit;

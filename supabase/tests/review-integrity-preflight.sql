begin read only;
select
  (select count(*) from public.gift_notifications n where not exists
    (select 1 from public.wish_members m where m.couple_id=n.couple_id and m.user_id=n.sender_id)) as invalid_senders,
  (select count(*) from public.gift_notifications n where not exists
    (select 1 from public.wish_members m where m.couple_id=n.couple_id and m.user_id=n.recipient_id)) as invalid_recipients,
  (select count(*) from public.gift_notifications where sender_id=recipient_id) as self_notifications,
  (select count(*) from public.gift_notifications where num_nonnulls(memory_id,check_in_id)<>1) as invalid_targets,
  (select count(*) from public.gift_notifications where not coalesce(
    jsonb_typeof(payload)='object' and payload->>'id'=id and (
      (memory_id is not null and payload->>'memoryId'=memory_id
        and not payload ? 'checkInId' and coalesce(payload->>'kind','gift')='gift')
      or (check_in_id is not null and payload->>'checkInId'=check_in_id
        and not payload ? 'memoryId' and payload->>'kind'='checkIn')
    ),false)) as invalid_payloads,
  (select count(*) from (select couple_id,memory_id from public.gift_notifications
    where memory_id is not null group by couple_id,memory_id having count(*)>1) d) as duplicate_memory_notifications,
  (select count(*) from public.check_ins c where not exists
    (select 1 from public.wish_members m where m.couple_id=c.couple_id and m.actor=c.created_by)) as orphan_checkins;
rollback;

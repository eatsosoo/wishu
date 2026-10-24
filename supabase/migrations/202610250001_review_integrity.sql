begin;

-- Preserve records: invalid legacy data aborts the transaction instead of being
-- deleted or silently reassigned. NO ACTION allows whole-space cascades while
-- preventing an individual membership from being removed out of retained data.
alter table public.wish_members add constraint wish_members_couple_user_key unique(couple_id,user_id);
alter table public.gift_notifications
  add constraint notification_sender_member_fk foreign key(couple_id,sender_id)
    references public.wish_members(couple_id,user_id) on delete no action not valid,
  add constraint notification_recipient_member_fk foreign key(couple_id,recipient_id)
    references public.wish_members(couple_id,user_id) on delete no action not valid,
  add constraint notification_distinct_members check (sender_id <> recipient_id) not valid,
  add constraint notification_one_target check (num_nonnulls(memory_id,check_in_id) = 1) not valid,
  add constraint notification_payload_matches_target check (coalesce(
    jsonb_typeof(payload) = 'object' and payload->>'id' = id and (
      (memory_id is not null and payload->>'memoryId' = memory_id
        and not payload ? 'checkInId' and coalesce(payload->>'kind','gift') = 'gift')
      or (check_in_id is not null and payload->>'checkInId' = check_in_id
        and not payload ? 'memoryId' and payload->>'kind' = 'checkIn')
    ),false)) not valid;

alter table public.check_ins add constraint check_in_creator_member_fk
  foreign key(couple_id,created_by) references public.wish_members(couple_id,actor)
  on delete no action not valid;

alter table public.gift_notifications validate constraint notification_sender_member_fk;
alter table public.gift_notifications validate constraint notification_recipient_member_fk;
alter table public.gift_notifications validate constraint notification_distinct_members;
alter table public.gift_notifications validate constraint notification_one_target;
alter table public.gift_notifications validate constraint notification_payload_matches_target;
alter table public.check_ins validate constraint check_in_creator_member_fk;

-- Use the canonical relational target for idempotency, not duplicated JSON.
drop index public.gift_memory_once;
create unique index gift_memory_once on public.gift_notifications(couple_id,memory_id);
drop index public.gift_memory_lookup;
create index notification_sender_member on public.gift_notifications(couple_id,sender_id);
create index notification_recipient_member on public.gift_notifications(couple_id,recipient_id);

-- Match the worker predicates and ordering; completed history stays out of the
-- pending queue index. Receipt polling uses its own accepted-only index.
create index native_push_pending on public.gift_push_deliveries(retry_at)
  where status in ('pending','sending');
create index native_push_receipts on public.gift_push_deliveries(retry_at)
  where status = 'accepted';

commit;

begin read only;
-- One result set keeps both checks visible through the Management API.
select jsonb_build_object(
  'constraints',(select jsonb_agg(jsonb_build_object('name',conname,'validated',convalidated,
    'definition',pg_get_constraintdef(oid)) order by conname)
    from pg_constraint where connamespace='public'::regnamespace and conname in (
      'wish_members_couple_user_key','notification_sender_member_fk','notification_recipient_member_fk',
      'notification_distinct_members','notification_one_target','notification_payload_matches_target','check_in_creator_member_fk')),
  'indexes',(select jsonb_agg(jsonb_build_object('name',indexname,'definition',indexdef) order by indexname)
    from pg_indexes where schemaname='public' and indexname in (
      'gift_memory_once','notification_sender_member','notification_recipient_member','native_push_pending','native_push_receipts'))
) as verification;
rollback;

-- Distinguish an empty partner slot from a member whose profile is incomplete.
begin;
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
    'notifications',coalesce((select jsonb_agg(n.payload || jsonb_build_object('createdAt',n.created_at) ||
      case when n.read_at is null then '{}'::jsonb else jsonb_build_object('readAt',n.read_at) end order by n.created_at desc,n.id)
      from public.gift_notifications n where n.couple_id = space.id and n.recipient_id = auth.uid()),'[]'::jsonb));
  return jsonb_build_object('id',space.id,'actor',member.actor,'inviteCode',case when space.invite_expires_at > now() and member.actor = 'minh' then space.invite_code else null end,'snapshot',data);
end $$;
commit;

begin;

-- A public bucket bypasses download RLS, even if its object policies are correct.
update storage.buckets set public = false where id = 'wish-photos';

-- Defense in depth if an overly broad permissive policy is added later.
create policy check_in_space_boundary on public.check_ins as restrictive
for select to public using (
  auth.uid() is not null and couple_id = (select public.my_couple_id())
);
create policy photo_space_boundary on storage.objects as restrictive
for select to public using (
  bucket_id <> 'wish-photos' or (
    auth.uid() is not null and (storage.foldername(name))[1] = (select public.my_couple_id())::text
  )
);

-- Keep old records intact. Every new/replaced check-in photo must be a private
-- object uploaded by its creator, not an arbitrary public URL or partner draft.
create function public.enforce_private_check_in_photo() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare path text := new.photo->>'storagePath'; uploader uuid;
begin
  select user_id into uploader from public.wish_members
    where couple_id = new.couple_id and actor = new.created_by;
  if path is null or uploader is null
    or path !~ ('^' || new.couple_id::text || '/' || uploader::text || '/[^/\\?#[:space:]%]+$')
    or split_part(path,'/',3) in ('.','..')
    or new.photo->>'uri' is distinct from 'storage://' || path
    or new.photo ? 'art' then
    raise exception 'Ảnh check-in cần được tải lên kho riêng tư của bạn.';
  end if;
  return new;
end $$;
revoke all on function public.enforce_private_check_in_photo() from public, anon, authenticated;
create trigger private_check_in_photo before insert or update of photo on public.check_ins
  for each row execute function public.enforce_private_check_in_photo();

commit;

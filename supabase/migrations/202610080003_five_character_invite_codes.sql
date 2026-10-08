-- New invitation codes use five uppercase letters and digits, avoiding
-- characters that are easy to confuse when sharing verbally.
create or replace function public.generate_invite_code() returns text
language sql volatile set search_path = public as $$
  -- The first five UUID v4 bytes are random (version/variant bits occur later).
  -- Use PostgreSQL's built-in UUID generator without depending on pgcrypto
  -- being installed or visible in this function's search_path.
  with entropy as (select pg_catalog.uuid_send(pg_catalog.gen_random_uuid()) as bytes)
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(bytes, n) % 32) + 1, 1), '' order by n)
  from entropy cross join generate_series(0, 4) as seq(n);
$$;

alter table public.wish_couples
  alter column invite_code set default public.generate_invite_code();

-- Rotate any still-active longer codes so every displayed code has the new form.
do $$
declare invitation record; candidate text;
begin
  for invitation in select id from public.wish_couples where invite_code is not null and invite_expires_at > now() loop
    loop
      candidate := public.generate_invite_code();
      exit when not exists(select 1 from public.wish_couples where invite_code = candidate and id <> invitation.id);
    end loop;
    update public.wish_couples set invite_code = candidate where id = invitation.id;
  end loop;
end $$;

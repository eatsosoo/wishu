const { PGlite } = require('@electric-sql/pglite');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { createMockSnapshot } = require('../../src/services/mock-data.ts');

const migrationName = '202610190003_normalize_wish_data.sql';
const migrations = join(__dirname, '../../supabase/migrations');
const users = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const coupleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function database({ migrate = true, snapshot = createMockSnapshot(), throughMigration = null } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant usage on schema auth to authenticated, anon, service_role;
    grant execute on function auth.uid() to authenticated, anon, service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,service_role;
    grant select,insert on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
    $$;
    create publication supabase_realtime;
  `);
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql') && name < migrationName).sort()) {
    await db.exec(readFileSync(join(migrations, file), 'utf8'));
  }
  await db.query('insert into auth.users(id) select unnest($1::uuid[])', [users]);
  await db.query('insert into public.wish_couples(id,invite_code) values($1,$2)', [coupleId, 'ABCDE']);
  await db.query("insert into public.wish_members(user_id,couple_id,actor) values($1,$3,'minh'),($2,$3,'linh')", [users[0], users[1], coupleId]);
  await db.query('insert into public.wish_state(couple_id,snapshot) values($1,$2)', [coupleId, JSON.stringify(snapshot)]);
  if (migrate) {
    for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql') && name >= migrationName && (!throughMigration || name <= throughMigration)).sort()) {
      await db.exec(readFileSync(join(migrations, file), 'utf8'));
    }
  }

  async function asUser(user, fn, role = 'authenticated') {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
    await db.exec(`set role ${role}`);
    try { return await fn(); }
    finally { await db.exec('reset role'); }
  }
  const state = user => asUser(user, async () => (await db.query('select public.get_my_couple() as value')).rows[0].value);
  const command = (user, body) => asUser(user, async () => (await db.query('select public.apply_wish_command($1,$2) as value', [user, JSON.stringify(body)])).rows[0].value, 'service_role');
  return { db, snapshot, asUser, state, command };
}

module.exports = { database, users, coupleId, migrationName, migrations };

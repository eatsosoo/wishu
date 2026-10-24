const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');

function endpoint({ fail = false, signedIn = true } = {}) {
  let handler;
  const calls = [];
  const output = ts.transpileModule(readFileSync(require.resolve('../supabase/functions/delete-account/index.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { exports: {}, Response, console: { error() {} }, Deno: { serve: fn => { handler = fn; } }, require: name => {
    if (name === '../_shared/backend.ts') return {
      cors: {}, admin: {
        rpc: async (name, parameters) => { calls.push([name, parameters.p_user]); return { error: fail ? new Error('offline') : null }; },
        get auth() { assert.fail('Deactivation must never delete Auth'); },
        get storage() { assert.fail('Deactivation must never remove photos'); },
      },
      authenticate: async () => { if (!signedIn) throw new Error('unauthorized'); return { id: 'verified-user' }; },
      json: (body, status = 200) => Response.json(body, { status }),
    };
    if (name === '../_shared/request-body.ts') return require('../supabase/functions/_shared/request-body.ts');
    if (name.endsWith('/input-validation.ts')) return require('../src/features/input-validation.ts');
    throw new Error(name);
  } });
  return { calls, request: body => handler(new Request('https://test.invalid', { method: 'POST', body })) };
}

test('deactivation validates confirmation and only uses the authenticated ID, including old clients', async () => {
  const h = endpoint();
  for (const body of ['{broken', 'null', '[]', '"DELETE"', '{"confirmation":true}']) {
    assert.equal((await h.request(body)).status, 400);
  }
  assert.equal((await h.request('x'.repeat(1025))).status, 413);
  assert.equal(h.calls.length, 0);
  for (const confirmation of ['DEACTIVATE', 'DELETE']) {
    const response = await h.request(JSON.stringify({ confirmation, userId: 'victim' }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { inactive: true });
  }
  assert.deepEqual(h.calls, [['deactivate_account', 'verified-user'], ['deactivate_account', 'verified-user']]);
});

test('deactivation failure never reports success and unsigned callers cannot reach mutation', async () => {
  assert.equal((await endpoint({ fail: true }).request('{"confirmation":"DEACTIVATE"}')).status, 500);
  const h = endpoint({ signedIn: false });
  assert.equal((await h.request('{"confirmation":"DEACTIVATE"}')).status, 401);
  assert.equal(h.calls.length, 0);
});

test('deactivation preserves Auth, role, plan, photos, shared data and membership; partner remains active', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.db.query("update account_access set role='admin',plan='premium' where user_id=$1", [users[0]]);
  await h.db.query("insert into wish_push_tokens(token,user_id,platform) values('ExponentPushToken[inactive]',$1,'ios')", [users[0]]);
  await h.db.query("insert into wish_web_push_subscriptions(user_id,endpoint,p256dh,auth) values($1,'https://fcm.googleapis.com/inactive','key','auth')", [users[0]]);
  const path = `${coupleId}/${users[0]}/retained.jpg`;
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [path]);
  const before = await h.state(users[1]);
  for (let i = 0; i < 2; i++) {
    await h.asUser(users[0], () => h.db.query('select deactivate_account($1)', [users[0]]), 'service_role');
  }
  assert.deepEqual(await h.state(users[1]), before);
  assert.equal((await h.db.query('select * from auth.users')).rows.length, 3);
  assert.equal((await h.db.query('select * from wish_members')).rows.length, 2);
  assert.equal((await h.db.query('select * from storage.objects')).rows.length, 1);
  assert.equal((await h.db.query('select * from account_deletion_requests')).rows.length, 0);
  const access = (await h.asUser(users[0], () => h.db.query('select get_my_account_access() as access'))).rows[0].access;
  assert.equal(access.status, 'inactive'); assert.equal(access.role, 'admin'); assert.equal(access.plan, 'premium');
  assert.equal((await h.db.query('select enabled from wish_push_tokens')).rows[0].enabled, false);
  assert.equal((await h.db.query('select enabled from wish_web_push_subscriptions')).rows[0].enabled, false);
  await h.command(users[1], { kind: 'wishFavorite', id: 'bear' });
  assert.equal(await h.state(users[0]), null);
  // Only a trusted backend/operator can reactivate; signing in doesn't do it.
  await assert.rejects(h.asUser(users[0], () => h.db.query("update account_access set status='active'")), /permission denied/);
  await h.db.query("update account_access set status='active',inactive_at=null where user_id=$1", [users[0]]);
  assert.equal((await h.state(users[0])).id, coupleId);
});

test('inactive accounts cannot use old sessions for REST, storage, RPC writes, pairing or push', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [`${coupleId}/${users[0]}/kept.jpg`]);
  await h.db.query('select deactivate_account($1)', [users[0]]);
  for (const table of ['wishes', 'preparations', 'memories', 'memory_photos', 'gift_notifications', 'check_ins', 'storage.objects']) {
    assert.equal((await h.asUser(users[0], () => h.db.query(`select * from ${table}`))).rows.length, 0, table);
  }
  await assert.rejects(h.command(users[0], { kind: 'wishFavorite', id: 'bear' }), /vô hiệu hoá/);
  for (const query of [
    "select create_couple('A','Space')", "select join_couple('ABCDE','A')",
    "select register_push_token('ExponentPushToken[test]','ios')", "select register_web_push('{}')",
  ]) await assert.rejects(h.asUser(users[0], () => h.db.query(query)), /vô hiệu hoá/);
  await assert.rejects(h.asUser(users[0], () => h.db.query('select deactivate_account($1)', [users[1]])), /permission denied/);
  await assert.rejects(h.asUser(users[0], () => h.db.query('select prepare_account_deletion($1)', [users[0]]), 'service_role'), /permission denied/);
  await assert.rejects(h.asUser(users[0], () => h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [`${coupleId}/${users[0]}/new.jpg`])), /row-level security/);
});

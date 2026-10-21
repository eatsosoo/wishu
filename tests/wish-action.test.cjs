const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const domain = require('../src/types/domain.ts');
const { PHOTO_LIMITS } = require('../src/features/photos/limits.ts');

function harness({ error = null, giftId = null, signedIn = true } = {}) {
  const calls = [], deliveries = [], pending = [];
  const user = '11111111-1111-4111-8111-111111111111';
  const coupleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const output = ts.transpileModule(readFileSync(require.resolve('../supabase/functions/wish-action/index.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let handler;
  const context = {
    exports: {}, Response, Request, console: { error: () => {} },
    Deno: { serve: fn => { handler = fn; }, env: { get: () => 'configured' } },
    EdgeRuntime: { waitUntil: promise => pending.push(promise) },
    require: name => {
      if (name.endsWith('/types/domain.ts')) return domain;
      if (name.endsWith('/photos/limits.ts')) return { PHOTO_LIMITS };
      if (name === '../_shared/backend.ts') return {
        cors: {},
        authenticate: async () => { if (!signedIn) throw new Error('Unauthorized'); return { id: user }; },
        json: (body, status = 200) => Response.json(body, { status }),
        admin: {
          from: table => {
            assert.equal(table, 'wish_members');
            const query = { select: () => query, eq: () => query, single: async () => ({ data: { actor: 'minh', couple_id: coupleId } }) };
            return query;
          },
          rpc: async (name, args) => { calls.push({ name, args }); return { data: { giftId }, error }; },
        },
      };
      if (name === '../_shared/deliver.ts') return { deliverGifts: async id => deliveries.push(['native', id]) };
      if (name === '../_shared/deliver-web.ts') return { deliverWebGifts: async id => deliveries.push(['web', id]) };
      if (name === 'npm:@supabase/supabase-js@2') return { createClient: () => ({ rpc: async name => { assert.equal(name, 'get_my_couple'); return { data: { id: coupleId, actor: 'minh', snapshot: { wishes: [] } } }; } }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(output, context);
  return {
    calls, deliveries, pending, user,
    request: command => handler(new Request('https://test.invalid/wish-action', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(command) })),
  };
}

test('Edge Function routes verified commands to the transaction RPC and keeps the client response shape', async () => {
  const h = harness();
  const command = { kind: 'delete', id: 'owned-wish' };
  const response = await h.request(command);
  assert.equal(response.status, 200);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, 'apply_wish_command');
  assert.equal(h.calls[0].args.p_user, h.user);
  assert.equal(h.calls[0].args.p_command.kind, 'delete');
  assert.deepEqual((await response.json()).snapshot, { wishes: [] });
});
test('Edge Function schedules both push workers only for a new committed gift', async () => {
  const h = harness({ giftId: 'gift-new' });
  await h.request({ kind: 'prepare', id: 'wish' });
  await Promise.all(h.pending);
  assert.deepEqual(h.deliveries, [['native', 'gift-new'], ['web', 'gift-new']]);
  const replay = harness();
  await replay.request({ kind: 'prepare', id: 'wish' });
  assert.equal(replay.pending.length, 0);
});
test('validation and authentication reject requests before invoking the database', async () => {
  const h = harness();
  assert.equal((await h.request({ kind: 'unknown' })).status, 400);
  assert.equal(h.calls.length, 0);
  const unauthorized = harness({ signedIn: false });
  assert.equal((await unauthorized.request({ kind: 'read', id: 'gift' })).status, 401);
  assert.equal(unauthorized.calls.length, 0);
});

test('visibility commands require a boolean and are passed to the transaction', async () => {
  const h = harness();
  assert.equal((await h.request({ kind: 'wishActive', id: 'wish', active: 'false' })).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.request({ kind: 'wishActive', id: 'wish', active: false })).status, 200);
  assert.equal(h.calls[0].args.p_command.active, false);
});

test('personal profile validates dates and gender before reaching the database', async () => {
  const h = harness();
  for (const input of [
    { birthDate: '2000-02-30', gender: 'female' },
    { birthDate: '2000-02-29', gender: 'invalid' },
    { birthDate: null },
  ]) assert.equal((await h.request({ kind: 'personalProfile', input })).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.request({ kind: 'personalProfile', input: { birthDate: '2000-02-29', gender: 'female' } })).status, 200);
  assert.equal((await h.request({ kind: 'personalProfile', input: { birthDate: null, gender: null } })).status, 200);
});
test('database permission errors are shown safely and never start delivery workers', async () => {
  const h = harness({ error: { code: 'P0001', message: 'Bạn chỉ có thể xoá điều ước của mình.' } });
  const response = await h.request({ kind: 'delete', id: 'other-wish' });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /chỉ có thể xoá/);
  assert.equal(h.deliveries.length, 0);
  const internal = harness({ error: { code: '23514', message: 'internal constraint detail' } });
  assert.doesNotMatch((await (await internal.request({ kind: 'delete', id: 'wish' })).json()).error, /internal/);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('native check-in delivery uses a map target and keeps private location off the lock screen', async () => {
  const sent = [], saved = [];
  const admin = {
    rpc: async () => ({ data: [{ id: 'delivery', notification_id: 'notice', token: 'partner-token', attempts: 1 }] }),
    from: table => {
      const query = {
        select: () => query, eq: () => query,
        single: async () => ({ data: table === 'gift_notifications'
          ? { recipient_id: 'partner', sender_id: 'sender', couple_id: 'couple', payload: { kind: 'checkIn', checkInId: 'pin-123', title: 'Private location', latitude: 21.06, longitude: 105.82 } }
          : { user_id: 'partner', enabled: true } }),
        maybeSingle: async () => ({ data: { display_name: 'Linh' } }),
        update: value => { saved.push(value); return query; },
        then: resolve => resolve({ error: null }),
      };
      return query;
    },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(require.resolve('../supabase/functions/_shared/deliver.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, {
    exports: module.exports, module, Date, AbortSignal,
    Deno: { env: { get: () => undefined } },
    require: name => { assert.equal(name, './backend.ts'); return { admin }; },
    fetch: async (_url, options) => { sent.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ data: { status: 'ok', id: 'ticket' } }) }; },
  });
  await module.exports.deliverGifts('notice');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'partner-token');
  assert.equal(sent[0].body, 'Linh vừa thêm một check-in. Chạm để xem trên bản đồ ♡');
  assert.deepEqual(sent[0].data, { checkInId: 'pin-123' });
  assert.equal(JSON.stringify(sent).includes('Private location'), false);
  assert.equal(JSON.stringify(sent).includes('105.82'), false);
  assert.equal(saved[0].status, 'accepted');
});

test('tapping a native check-in push refreshes data and opens the focused map', async () => {
  const navigations = [];
  let listener, refreshed = 0;
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(require.resolve('../src/components/NotificationBridge.native.tsx'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, {
    exports: module.exports, module, __DEV__: false,
    require: name => {
      if (name === 'react') return { useEffect: fn => fn(), useRef: () => ({ current: undefined }) };
      if (name === 'expo-router') return { router: { push: target => navigations.push(JSON.parse(JSON.stringify(target))) } };
      if (name === 'expo-constants') return { default: {} };
      if (name.endsWith('use-wish-store')) return { useWishStore: () => ({ ready: true, onboarded: true, signedIn: true, paired: true, cloudEnabled: false, refresh: async () => { refreshed++; } }) };
      if (name.endsWith('services/push')) return {};
      if (name === 'expo-notifications') return {
        DEFAULT_ACTION_IDENTIFIER: 'tap',
        addNotificationReceivedListener: () => ({ remove() {} }),
        addNotificationResponseReceivedListener: fn => { listener = fn; return { remove() {} }; },
        getLastNotificationResponseAsync: async () => null,
        clearLastNotificationResponseAsync: async () => {},
      };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  module.exports.NotificationBridge();
  const response = { actionIdentifier: 'tap', notification: { request: { identifier: 'notice', content: { data: { checkInId: 'pin-123' } } } } };
  listener(response);
  listener(response);
  assert.equal(refreshed, 1);
  assert.deepEqual(navigations, [{ pathname: '/check-in-map', params: { focus: 'pin-123' } }]);
});

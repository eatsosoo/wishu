const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { allowedPushEndpoint, webPushFailure } = require('../supabase/functions/_shared/web-push-policy.ts');

test('only trusted browser push destinations can receive requests', () => {
  for (const host of ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']) {
    assert.equal(allowedPushEndpoint(`https://${host}/push/secret`), true);
  }
  assert.equal(allowedPushEndpoint('https://wns2-test.notify.windows.com/w/?token=secret'), true);
  for (const url of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a', 'https://fcm.googleapis.com.attacker.test/a',
    'https://user:password@fcm.googleapis.com/a', 'https://fcm.googleapis.com:8443/a',
    'https://wns.notify.windows.com.attacker.test/w/?token=secret', 'https://fcm.googleapis.com/a#fragment', 'not a url']) {
    assert.equal(allowedPushEndpoint(url), false, url);
  }
});

test('expired subscriptions stop; temporary failures retry with bounded backoff', () => {
  for (const code of [404, 410]) assert.deepEqual(webPushFailure(code, 1), { expired: true, status: 'failed', delaySeconds: 60 });
  for (const code of [undefined, 408, 429, 500, 503]) assert.equal(webPushFailure(code, 1).status, 'pending');
  for (const code of [400, 401, 403, 413]) assert.equal(webPushFailure(code, 1).status, 'failed');
  assert.equal(webPushFailure(503, 8).status, 'failed');
  assert.equal(webPushFailure(503, 7).delaySeconds, 3600);
});

function workerHarness() {
  const events = {}, shown = [], opened = [], messages = [];
  const self = {
    addEventListener: (type, handler) => { events[type] = handler; },
    location: { origin: 'https://wish.example' },
    registration: { showNotification: async (title, options) => { shown.push({ title, ...options }); } },
    clients: { matchAll: async () => [{ url: 'https://wish.example/', postMessage: data => messages.push(data) }],
      openWindow: async url => { opened.push(url); } },
  };
  vm.runInNewContext(readFileSync(require.resolve('../public/sw.js'), 'utf8'), { self, URL });
  return { events, shown, opened, messages, self };
}

test('background push displays a generic gift notification and refreshes open clients', async () => {
  const h = workerHarness();
  let done;
  h.events.push({ data: { json: () => ({ giftId: 'gift-123', title: 'Private title' }) }, waitUntil: promise => { done = promise; } });
  await done;
  assert.equal(h.shown[0].data.url, '/gift/gift-123');
  assert.equal(JSON.stringify(h.shown).includes('Private title'), false);
  assert.equal(h.messages[0].type, 'GIFT_PUSH');
});

test('malformed push still shows a visible fallback', async () => {
  const h = workerHarness();
  let done;
  h.events.push({ data: { json: () => { throw new Error('Malformed JSON'); } }, waitUntil: promise => { done = promise; } });
  await done;
  assert.equal(h.shown[0].data.url, '/notifications');
});

test('notification clicks cannot navigate to another origin or arbitrary app routes', async () => {
  for (const path of ['https://attacker.test', '//attacker.test', '/gift/../../us', '/us', '/gift/gift-123']) {
    const h = workerHarness();
    let done;
    h.events.notificationclick({ notification: { data: { url: path }, close() {} }, waitUntil: promise => { done = promise; } });
    await done;
    assert.equal(h.opened[0], path === '/gift/gift-123' ? 'https://wish.example/gift/gift-123' : 'https://wish.example/notifications');
  }
});

test('notification click focuses an existing app window after navigating to the gift', async () => {
  const h = workerHarness();
  const navigations = [];
  let focused = false, done;
  h.self.clients.matchAll = async () => [{ url: 'https://wish.example/', navigate: async url => {
    navigations.push(url); return { focus: async () => { focused = true; } };
  } }];
  h.events.notificationclick({ notification: { data: { url: '/gift/gift-123' }, close() {} }, waitUntil: promise => { done = promise; } });
  await done;
  assert.deepEqual(navigations, ['https://wish.example/gift/gift-123']);
  assert.equal(focused, true);
  assert.equal(h.opened.length, 0);
});

function deliveryHarness({ recipient = 'recipient', owner = 'recipient', endpoint = 'https://fcm.googleapis.com/push/token', failure, configured = true } = {}) {
  const sent = [], saved = [], disabled = [];
  const subscription = { user_id: owner, enabled: true, endpoint, p256dh: 'key', auth: 'secret', updated_at: 'now' };
  const delivery = { id: 'delivery', notification_id: 'gift-123', subscription_id: 'subscription', attempts: 1 };
  const admin = { rpc: async () => ({ data: [delivery] }), from: table => {
    const chain = {
      select: () => chain, eq: () => chain,
      single: async () => ({ data: table === 'gift_notifications' ? { recipient_id: recipient } : subscription }),
      update: values => { (table === 'gift_web_push_deliveries' ? saved : disabled).push(values); return chain; },
      then: resolve => resolve({ error: null }),
    };
    return chain;
  } };
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(require.resolve('../supabase/functions/_shared/deliver-web.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(output, {
    exports: module.exports, module, Date,
    Deno: { env: { get: name => configured ? ({ WEB_PUSH_VAPID_PUBLIC_KEY: 'public', WEB_PUSH_VAPID_PRIVATE_KEY: 'private', WEB_PUSH_VAPID_SUBJECT: 'mailto:app@example.com' })[name] : undefined } },
    require: name => {
      if (name === './backend.ts') return { admin };
      if (name === './web-push-policy.ts') return { allowedPushEndpoint, webPushFailure };
      if (name === 'npm:web-push@3.6.7') return { sendNotification: async (...args) => { sent.push(args); if (failure) throw failure; } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { run: module.exports.deliverWebGifts, sent, saved, disabled };
}

test('worker sends encrypted Web Push using server credentials and records provider acceptance', async () => {
  const h = deliveryHarness();
  await h.run('gift-123');
  assert.equal(h.sent.length, 1);
  assert.deepEqual(JSON.parse(h.sent[0][1]), { giftId: 'gift-123' });
  assert.equal(h.sent[0][2].vapidDetails.privateKey, 'private');
  assert.equal(h.saved[0].status, 'accepted');
});

test('worker refuses another account, untrusted endpoint, and unconfigured backend', async () => {
  for (const options of [{ owner: 'other' }, { endpoint: 'https://127.0.0.1/internal' }, { configured: false }]) {
    const h = deliveryHarness(options);
    await h.run();
    assert.equal(h.sent.length, 0);
  }
});

test('worker disables expired subscriptions and retries provider outages', async () => {
  for (const code of [410, 503]) {
    const h = deliveryHarness({ failure: { statusCode: code } });
    await h.run();
    assert.equal(h.saved[0].status, code === 410 ? 'failed' : 'pending');
    assert.equal(h.disabled.length, code === 410 ? 1 : 0);
  }
});

function browserHarness({ permission = 'granted', standalone = false, ios = false, rpcError = false } = {}) {
  const calls = [], messages = [];
  let subscription = null;
  const rpc = async (name, args) => { calls.push([name, args]); return { error: rpcError ? new Error('Offline') : null }; };
  const registration = {
    active: true,
    getNotifications: async () => [{ close: () => messages.push('closed') }],
    pushManager: {
      getSubscription: async () => subscription,
      subscribe: async options => {
        subscription = { endpoint: 'https://fcm.googleapis.com/push/token', options,
          toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/push/token', keys: { p256dh: 'key', auth: 'secret' } }),
          unsubscribe: async () => { messages.push('unsubscribed'); subscription = null; return true; } };
        return subscription;
      },
    },
  };
  const Notification = { permission, requestPermission: () => { messages.push('permission-request'); return Promise.resolve('granted'); } };
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(require.resolve('../src/services/push.web.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, {
    exports: module.exports, module, Uint8Array, setTimeout, clearTimeout, Notification,
    process: { env: { EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: Buffer.alloc(65, 1).toString('base64url') } },
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    window: { isSecureContext: true, PushManager: {}, Notification, matchMedia: () => ({ matches: standalone }) },
    navigator: { userAgent: ios ? 'iPhone' : 'Chrome', platform: '', maxTouchPoints: 0,
      serviceWorker: { register: async () => { messages.push('worker-register'); return registration; }, getRegistration: async () => registration } },
    require: name => { assert.equal(name, './cloud'); return { supabase: { rpc } }; },
  });
  return { api: module.exports, calls, messages };
}

test('browser asks permission during the click, before waiting for worker registration', async () => {
  const h = browserHarness({ permission: 'default' });
  const task = h.api.registerPush();
  assert.equal(h.messages[0], 'permission-request');
  await task;
  assert.equal(h.calls[0][0], 'register_web_push');
  await h.api.unregisterPush();
  assert.equal(h.calls[1][0], 'unregister_web_push');
  assert.deepEqual(h.messages.slice(-2), ['unsubscribed', 'closed']);
});

test('denied permissions and iOS tabs never subscribe or call the backend', async () => {
  for (const options of [{ permission: 'denied' }, { ios: true }]) {
    const h = browserHarness(options);
    await assert.rejects(h.api.registerPush());
    assert.equal(h.calls.length, 0);
  }
  const installed = browserHarness({ ios: true, standalone: true });
  await installed.api.registerPush();
  assert.equal(installed.calls[0][0], 'register_web_push');
});

test('automatic registration never asks permission and server errors are surfaced', async () => {
  const h = browserHarness({ permission: 'default' });
  await assert.rejects(h.api.registerPush(false));
  assert.equal(h.messages.length, 0);
  const offline = browserHarness({ rpcError: true });
  await assert.rejects(offline.api.registerPush(), /Chưa lưu được/);
  await assert.rejects(offline.api.unregisterPush(), /Chưa tắt được/);
  assert.equal(offline.messages.includes('unsubscribed'), false);
});

test('logout cancels an in-flight registration before disabling and removing the subscription', async () => {
  const h = browserHarness();
  const registering = h.api.registerPush();
  const loggingOut = h.api.unregisterPush();
  await assert.rejects(registering, /Đã huỷ/);
  await loggingOut;
  assert.equal(h.calls.some(([name]) => name === 'register_web_push'), false);
  assert.equal(h.calls[0][0], 'unregister_web_push');
  assert.equal(h.messages.includes('unsubscribed'), true);
});

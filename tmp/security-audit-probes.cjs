const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { database, users, coupleId } = require('../tests/helpers/relational-db.cjs');

async function main() {
  const h = await database();
  try {
    await h.db.query('delete from public.wish_members where user_id=$1', [users[1]]);
    await h.db.query("update public.wish_couples set invite_code='ABCDE',invite_expires_at=now()+interval '7 days' where id=$1", [coupleId]);
    let failed = 0;
    for (let n = 0; n < 100; n++) {
      try { await h.asUser(users[2], () => h.db.query("select public.join_couple('ZZZZZ','audit')")); }
      catch (error) { assert.match(error.message, /Mã mời/); failed++; }
    }
    const joined = await h.asUser(users[2], () => h.db.query("select public.join_couple('ABCDE','audit') as value"));
    assert.equal(joined.rows[0].value.id, coupleId);
    console.log(JSON.stringify({ probe: 'invite-rate-limit', wrongAttempts: failed, validCodeImmediatelyAccepted: true }));
    for (let n = 0; n < 100; n++) {
      await h.asUser(users[0], () => h.db.query('select public.register_push_token($1,$2)', [`ExpoPushToken[audit${n}]`, 'android']));
    }
    console.log(JSON.stringify({ probe: 'push-device-quota', registeredTokens: (await h.db.query('select count(*)::int as n from public.wish_push_tokens')).rows[0].n }));
  } finally { await h.db.close(); }

  const source = fs.readFileSync('src/hooks/use-wish-store.tsx', 'utf8');
  const logout = source.slice(source.indexOf('  async function logout()'), source.indexOf('  async function deleteAccount()'));
  let signOutCalls = 0, cleared = false, errorShown = false;
  const compiled = ts.transpileModule(logout.replace("await import('../services/push')", 'await loadPush()'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { loadPush: async () => ({ unregisterPush: async () => { throw new Error('Offline'); } }),
    supabase: { auth: { signOut: async () => { signOutCalls++; return {}; } } },
    clearPrivatePhotos: () => { cleared = true; }, generation: { current: 0 }, setSignedIn: () => {}, setActor: () => {},
    setCloudCouple: () => {}, apply: () => {}, createEmptySnapshot: () => ({}), setStorageError: () => { errorShown = true; } };
  vm.createContext(context); vm.runInContext(compiled, context); await context.logout();
  assert.equal(signOutCalls, 0); assert.equal(cleared, false); assert.equal(errorShown, true);
  console.log(JSON.stringify({ probe: 'logout-offline', signOutCalls, privateDataCleared: cleared, errorShown }));

  let releaseRegistration;
  const pendingRpc = new Promise(resolve => { releaseRegistration = resolve; });
  let storedToken = null, unregisterCalls = 0, serverEnabled = false;
  const pushSource = ts.transpileModule(fs.readFileSync('src/services/push.native.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(pushSource, { exports: mod.exports, module: mod, process: { env: {} }, __DEV__: true,
    require: name => {
      if (name.includes('async-storage')) return { __esModule: true, default: { getItem: async () => storedToken, setItem: async (_k,v) => { storedToken = v; }, removeItem: async () => { storedToken = null; } } };
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      if (name === 'expo-constants') return { __esModule: true, default: { appOwnership: 'standalone', easConfig: { projectId: 'audit' } } };
      if (name === 'expo-notifications') return { setNotificationHandler() {}, getPermissionsAsync: async () => ({ granted: true }), getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[audit]' }) };
      if (name === './cloud') return { supabase: { rpc: async name => {
        if (name === 'register_push_token') { serverEnabled = true; await pendingRpc; }
        else if (name === 'unregister_push_token') { unregisterCalls++; serverEnabled = false; }
        return { error: null };
      } } };
      throw new Error(name);
    } });
  const task = mod.exports.registerPush(false);
  while (!serverEnabled) await new Promise(resolve => setImmediate(resolve));
  await mod.exports.unregisterPush(); releaseRegistration(); await task;
  assert.equal(unregisterCalls, 0); assert.equal(serverEnabled, true); assert.ok(storedToken);
  console.log(JSON.stringify({ probe: 'native-push-register-logout-race', unregisterCalls, serverEnabled, tokenSavedAfterUnregister: !!storedToken }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

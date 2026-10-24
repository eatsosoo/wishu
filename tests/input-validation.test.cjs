const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isHttpUrl, isISODate, validatePairInput, validateWishCommand } = require('../src/features/input-validation.ts');
const { validateCredentials } = require('../src/features/auth/messages.ts');
const { parseDate } = require('../src/features/wishes/format.ts');
const { readJsonBody } = require('../supabase/functions/_shared/request-body.ts');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');

const base = { kind: 'add', input: { title: 'Một điều ước', description: 'Dòng 1\nDòng 2', category: 'Quà tặng', estimatedCost: 0, priority: 3, referenceUrl: '', cover: { art: 'bear' } } };
test('URLs reject invalid hosts, credentials, dangerous schemes and parser normalization tricks', () => {
  for (const url of ['https://', 'https:///example.com', 'javascript:alert(1)', '//example.com', 'https://a:b@example.com', 'https://example.com/a b', 'https://example.com/\\x', 'https://example.com/\n', 'https://example.com/' + 'a'.repeat(2048)]) {
    assert.equal(isHttpUrl(url), false, url);
  }
  for (const url of ['https://example.com/a?q=1#x', 'HTTP://example.com', 'https://example.com/ảnh', 'https://[::1]:8080/']) assert.equal(isHttpUrl(url), true, url);
});
test('command shapes, required strings, numeric bounds and optional dates are validated at runtime', () => {
  validateWishCommand(base);
  for (const value of [null, [], 'add', { kind: 'read', id: '' }, { kind: 'delete', id: 'a/b' }, { kind: 'read', id: 'abc\n' }, { kind: 'add', input: [] }]) assert.throws(() => validateWishCommand(value));
  for (const patch of [
    { title: '   ' }, { title: 'a'.repeat(101) }, { title: 'a\nb' }, { description: 'a'.repeat(1001) },
    { estimatedCost: '1' }, { estimatedCost: -1 }, { estimatedCost: 0.5 }, { estimatedCost: Infinity }, { estimatedCost: NaN }, { estimatedCost: Number.MAX_SAFE_INTEGER + 1 },
    { priority: 0 }, { priority: 6 }, { priority: 2.5 }, { referenceUrl: 'https://' }, { targetDate: false }, { targetDate: 0 }, { targetDate: null }, { active: 'false' },
    { cover: { art: 'bear', uri: 'https://example.com' } }, { cover: { uri: 'https://example.com', storagePath: 'wrong/path' } },
  ]) assert.throws(() => validateWishCommand({ ...base, input: { ...base.input, ...patch } }), JSON.stringify(patch));
  validateWishCommand({ ...base, input: { ...base.input, estimatedCost: Number.MAX_SAFE_INTEGER, targetDate: '2028-02-29' } });
});
test('dates reject invalid days, years and numeric date shortcuts', () => {
  for (const date of ['2026-02-29', '2026-04-31', '1899-12-31', '2101-01-01', '2026-1-01']) assert.equal(isISODate(date), false);
  assert.equal(isISODate('2024-02-29'), true);
  for (const date of ['1e1/10/2026', '0x10/10/2026', '01/01/2e3', '01//2026', '1.0/10/2026']) assert.equal(parseDate(date), null);
  assert.equal(parseDate('1/10/2026'), '2026-10-01');
  for (const birthDate of ['1899-01-01', '2026-10-25']) assert.throws(() => validateWishCommand({ kind: 'personalProfile', input: { birthDate, gender: 'female' } }, { today: '2026-10-24' }));
});
test('pairing and credentials enforce length and reject control characters without trimming passwords', () => {
  assert.equal(validatePairInput('Tên Việt', 'Không gian'), null);
  assert.equal(validatePairInput('Tên Việt', '', 'abcde'), null);
  for (const name of ['', ' '.repeat(5), 'a'.repeat(41), 'Tên\nẨn']) assert.ok(validatePairInput(name, 'Không gian'));
  for (const code of ['', 'ABCD', 'ABCDEF', 'AB0I1', 'ABCDE\n', ' '.repeat(65) + 'ABCDE', ['ABCDE']]) assert.ok(validatePairInput('Tên Việt', '', code));
  assert.ok(validateCredentials('a'.repeat(250) + '@example.com', 'abcdef', true));
  assert.ok(validateCredentials('a\u0001@example.com', 'abcdef', true));
  assert.ok(validateCredentials('a@example.com', 'a'.repeat(1025), false));
  assert.equal(validateCredentials(' a@example.com ', ' abc ', false), null);
});
test('private photo paths and check-in coordinates/dates cannot bypass server checks', () => {
  const path = `${coupleId}/${users[0]}/photo.jpg`;
  const input = { id: 'checkin-1', title: 'Đà Lạt', latitude: 0, longitude: 0, visitedAt: '2026-10-24', companion: '', note: '', photo: { uri: `storage://${path}`, storagePath: path } };
  const options = { coupleId, userId: users[0], today: '2026-10-24' };
  validateWishCommand({ kind: 'checkIn', input }, options);
  for (const patch of [{ latitude: '0' }, { longitude: 181 }, { visitedAt: '2026-10-25' }, { photo: { uri: 'https://example.com/a.jpg' } }]) assert.throws(() => validateWishCommand({ kind: 'checkIn', input: { ...input, ...patch } }, options));
  for (const filename of ['..', '../a.jpg', 'a%2fb.jpg', 'a.jpg?x=1', 'a\\b.jpg']) {
    const storagePath = `${coupleId}/${users[0]}/${filename}`;
    assert.throws(() => validateWishCommand({ kind: 'checkIn', input: { ...input, photo: { uri: `storage://${storagePath}`, storagePath } } }, options));
  }
});
test('streamed JSON enforces byte limit even without Content-Length and cancels excessive input', async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('á'.repeat(6))); }, cancel() { cancelled = true; } });
  await assert.rejects(readJsonBody(new Request('https://test.invalid', { method: 'POST', body, duplex: 'half' }), 10), error => error.status === 413);
  assert.equal(cancelled, true);
  assert.deepEqual(await readJsonBody(new Request('https://test.invalid', { method: 'POST', body: '{"name":"Tên Việt"}' })), { name: 'Tên Việt' });
  for (const bytes of [new Uint8Array([0xff]), new TextEncoder().encode('{broken')]) await assert.rejects(readJsonBody(new Request('https://test.invalid', { method: 'POST', body: bytes })), /JSON/);
});
test('direct pairing RPCs validate inputs and their internal wrappers are not callable by clients', async t => {
  const h = await database(); t.after(() => h.db.close());
  for (const [name, space] of [['\nName', 'Space'], ['A'.repeat(41), 'Space'], ['Name', ' '], ['Name', 'X'.repeat(61)]]) {
    await assert.rejects(h.asUser(users[2], () => h.db.query('select public.create_couple($1,$2)', [name, space])), /hợp lệ/);
  }
  for (const code of ['ABCDE\n', 'ABCDEF', 'AB0I1', '', ' '.repeat(1000)]) await assert.rejects(h.asUser(users[2], () => h.db.query('select public.join_couple($1,$2)', [code, 'Name'])), /hợp lệ/);
  await assert.rejects(h.asUser(users[2], () => h.db.query("select public.create_couple_before_input_validation('Name','Space')")), /permission denied/);
  await assert.rejects(h.asUser(users[2], () => h.db.query("select public.join_couple_before_input_validation('ABCDE','Name')")), /permission denied/);
  await h.db.query('delete from public.wish_members where user_id=$1', [users[1]]);
  const joined = await h.asUser(users[2], () => h.db.query("select public.join_couple(' abcde ',' Tên Việt ') as value"));
  assert.equal(joined.rows[0].value.id, coupleId);
});
test('database rejects unsafe budgets and traversal photos even from a service-side command', async t => {
  const h = await database(); t.after(() => h.db.close());
  for (const estimatedCost of [0.5, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(h.command(users[0], { ...base, input: { ...base.input, estimatedCost } }));
  for (const filename of ['..', '../a.jpg', 'a%2fb.jpg']) {
    const storagePath = `${coupleId}/${users[0]}/${filename}`;
    await assert.rejects(h.command(users[0], { ...base, input: { ...base.input, cover: { uri: `storage://${storagePath}`, storagePath } } }));
  }
  await h.command(users[0], base);
});

test('native push RPC rejects null, oversized and malformed registration input', async t => {
  const h = await database(); t.after(() => h.db.close());
  for (const [token, platform] of [[null, 'android'], ['ExpoPushToken[ok]', null], ['ExpoPushToken[ok]', 'web'], ['ExpoPushToken[' + 'a'.repeat(256) + ']', 'ios'], ['bad token', 'ios']]) {
    await assert.rejects(h.asUser(users[0], () => h.db.query('select public.register_push_token($1,$2)', [token, platform])), /hợp lệ/);
  }
  assert.equal((await h.db.query('select count(*)::int as count from public.wish_push_tokens')).rows[0].count, 0);
  await h.asUser(users[0], () => h.db.query("select public.register_push_token('ExpoPushToken[valid]','android')"));
  assert.equal((await h.db.query('select count(*)::int as count from public.wish_push_tokens')).rows[0].count, 1);
});

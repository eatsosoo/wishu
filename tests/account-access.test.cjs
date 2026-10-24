const assert = require('node:assert/strict');
const { test } = require('node:test');
const { accountCapabilities, normalAccess } = require('../src/features/auth/access.ts');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');

test('plan controls premium features independently of admin, including expiration', () => {
  assert.equal(accountCapabilities(normalAccess).canUsePhotoTemplates, false);
  assert.equal(accountCapabilities({ ...normalAccess, role: 'admin' }).canChooseCheckInDate, false);
  assert.equal(accountCapabilities({ ...normalAccess, plan: 'premium' }).canUsePhotoTemplates, true);
  const inactive = accountCapabilities({ ...normalAccess, status: 'inactive', role: 'admin', plan: 'premium' });
  assert.equal(inactive.isAdmin, false);
  assert.equal(inactive.isPremium, false);
  for (const expiry of ['2020-01-01T00:00:00Z', 'invalid']) {
    assert.equal(accountCapabilities({ ...normalAccess, plan: 'premium', premiumExpiresAt: expiry }).isPremium, false);
  }
});

test('account defaults and RLS prevent clients from reading others or granting themselves privileges', async t => {
  const h = await database(); t.after(() => h.db.close());
  const readAccess = () => h.db.query('select get_my_account_access() as access');
  assert.deepEqual((await h.asUser(users[0], readAccess)).rows[0].access, normalAccess);
  assert.equal((await h.asUser(users[0], () => h.db.query('select * from account_access'))).rows.length, 1);
  for (const statement of [
    "update account_access set role='admin'", "update account_access set plan='premium'",
    'delete from account_access', `insert into account_access(user_id,role) values('${users[0]}','admin')`,
  ]) await assert.rejects(h.asUser(users[0], () => h.db.exec(statement)), /permission denied/);
  await assert.rejects(h.asUser(null, readAccess, 'anon'), /permission denied/);
  await assert.rejects(h.asUser(users[0], () => h.db.query('select apply_wish_command_before_account_access($1,$2)', [users[0], '{}'])), /permission denied/);
  await h.db.query('insert into auth.users(id) values($1)', ['44444444-4444-4444-8444-444444444444']);
  assert.equal((await h.db.query('select role,plan from account_access where user_id=$1', ['44444444-4444-4444-8444-444444444444'])).rows[0].plan, 'normal');
  await h.db.query('delete from auth.users where id=$1', ['44444444-4444-4444-8444-444444444444']);
  assert.equal((await h.db.query('select * from account_access where user_id=$1', ['44444444-4444-4444-8444-444444444444'])).rows.length, 0);
});

test('database enforces Normal dates/templates, Premium, expiry, downgrade edits and account isolation', async t => {
  const h = await database(); t.after(() => h.db.close());
  const today = (await h.db.query("select ((now() at time zone 'UTC') + interval '7 hours')::date::text as day")).rows[0].day;
  const input = { id: 'access-checkin', title: 'Đà Lạt', latitude: 11.94, longitude: 108.44,
    visitedAt: today, utcOffsetMinutes: 420, templateId: 'single', companion: '', note: '',
    photo: { uri: `storage://${coupleId}/${users[0]}/access.jpg`, storagePath: `${coupleId}/${users[0]}/access.jpg` } };
  const save = patch => h.command(users[0], { kind: 'checkIn', input: { ...input, ...patch } });
  await assert.rejects(save({ visitedAt: '2020-01-01' }), /Normal/);
  await assert.rejects(save({ templateId: 'grid' }), /Premium/);
  await assert.rejects(save({ templateId: 'fake' }), /Template/);
  await assert.rejects(save({ utcOffsetMinutes: 841 }), /Múi giờ/);
  await save({});
  assert.equal((await h.state(users[0])).snapshot.checkIns[0].templateId, 'single');
  await h.db.query("update account_access set role='admin' where user_id=$1", [users[0]]);
  await assert.rejects(save({ visitedAt: '2020-01-01' }), /Normal/);
  await h.db.query("update account_access set plan='premium' where user_id=$1", [users[0]]);
  await save({ visitedAt: '2020-01-01', templateId: 'grid' });
  let saved = (await h.state(users[0])).snapshot.checkIns[0];
  assert.equal(saved.visitedAt, '2020-01-01'); assert.equal(saved.templateId, 'grid');
  await h.db.query("update account_access set premium_expires_at=now()-interval '1 second' where user_id=$1", [users[0]]);
  // Downgrade keeps old photos and dates; it cannot create new premium content.
  await save({ visitedAt: '2020-01-01', templateId: 'grid', note: 'Updated after expiry' });
  await assert.rejects(save({ visitedAt: '2020-01-02', templateId: 'grid' }), /Normal/);
  const path = `${coupleId}/${users[0]}/new-grid.jpg`;
  await assert.rejects(save({ visitedAt: '2020-01-01', templateId: 'grid', photo: { uri: `storage://${path}`, storagePath: path } }), /Premium/);
  await assert.rejects(save({ id: 'new-checkin', visitedAt: '2020-01-01' }), /Normal/);
  await assert.rejects(save({ id: 'new-template', templateId: 'grid' }), /Premium/);
  // Partner keeps their own Normal plan even if the first account is Premium.
  await h.db.query('update account_access set premium_expires_at=null where user_id=$1', [users[0]]);
  await assert.rejects(h.command(users[1], { kind: 'checkIn', input: { ...input, id: 'partner', visitedAt: '2020-01-01' } }), /Normal/);
  saved = (await h.state(users[0])).snapshot.checkIns[0];
  assert.equal(saved.note, 'Updated after expiry');
  assert.equal(saved.visitedAt, '2020-01-01');
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { database, users, coupleId, migrationName, migrations } = require('./helpers/relational-db.cjs');

async function setup(t, options) {
  const h = await database(options);
  t.after(() => h.db.close());
  return h;
}
const completion = { kind: 'complete', input: { wishId: 'bear', completedAt: '2026-10-19', note: 'A memory', photos: [{ art: 'categoryGift' }, { art: 'categoryMoments' }] } };

test('migration preserves wishes, profile, preparation privacy, memories and ordered photos', async t => {
  const h = await setup(t);
  const first = await h.state(users[0]), second = await h.state(users[1]);
  assert.deepEqual(first.snapshot.wishes, h.snapshot.wishes.map(wish => ({ ...wish, active: true })));
  assert.deepEqual(first.snapshot.couple, { ...h.snapshot.couple, members: h.snapshot.couple.members.map(member => ({ ...member, joined: true })) });
  assert.deepEqual(first.snapshot.memories, h.snapshot.memories);
  assert.deepEqual(first.snapshot.preparations, h.snapshot.preparations);
  assert.deepEqual(second.snapshot.preparations, []);
  assert.equal(first.inviteCode, 'ABCDE');
  assert.equal(second.inviteCode, null);
});

test('migration preserves memories that already reference deleted wishes', async t => {
  const h = await setup(t, { migrate: false });
  const snapshot = structuredClone(h.snapshot);
  snapshot.memories[0].wishId = 'previously-deleted';
  await h.db.query('update wish_state set snapshot=$1 where couple_id=$2', [JSON.stringify(snapshot), coupleId]);
  await h.db.exec(readFileSync(join(migrations, migrationName), 'utf8'));
  const first = await h.state(users[0]);
  assert.equal(first.snapshot.memories[0].wishId, 'previously-deleted');
  assert.deepEqual(first.snapshot.memories[0].photos, snapshot.memories[0].photos);
});

test('invalid legacy data aborts the migration with the original snapshot intact', async t => {
  const h = await setup(t, { migrate: false });
  const snapshot = structuredClone(h.snapshot);
  snapshot.wishes[0].priority = 0;
  await h.db.query('update wish_state set snapshot=$1 where couple_id=$2', [JSON.stringify(snapshot), coupleId]);
  await assert.rejects(h.db.exec(readFileSync(join(migrations, migrationName), 'utf8')));
  await h.db.exec('rollback');
  assert.equal((await h.db.query("select to_regclass('public.wishes') as name")).rows[0].name, null);
  assert.deepEqual((await h.db.query('select snapshot from wish_state')).rows[0].snapshot, snapshot);
});

test('RLS isolates couples and hides the other member’s private preparations', async t => {
  const h = await setup(t);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from wishes'))).rows.length, 0);
  assert.equal((await h.asUser(users[1], () => h.db.query('select * from preparations'))).rows.length, 0);
  assert.equal((await h.asUser(users[0], () => h.db.query('select * from preparations'))).rows.length, h.snapshot.preparations.length);
  assert.equal(await h.state(users[2]), null);
  await assert.rejects(h.asUser(users[0], () => h.db.exec("delete from wishes where id='bear'")), /permission denied/);
  await assert.rejects(h.asUser(users[0], () => h.db.query('select apply_wish_command($1,$2)', [users[1], JSON.stringify({ kind: 'delete', id: 'bear' })])), /permission denied/);
  await assert.rejects(h.asUser(users[0], () => h.db.exec('select * from wish_state')), /permission denied/);
});

test('completion commits memory, ordered photos, notification and both push outboxes once', async t => {
  const h = await setup(t);
  await h.db.query("insert into wish_push_tokens(token,user_id,platform) values('ExponentPushToken[test]',$1,'android')", [users[1]]);
  await h.db.query("insert into wish_web_push_subscriptions(user_id,endpoint,p256dh,auth) values($1,'https://fcm.googleapis.com/test','key','auth')", [users[1]]);
  const result = await h.command(users[0], completion);
  assert.ok(result.giftId);
  const state = await h.state(users[1]);
  assert.equal(state.snapshot.memories.length, h.snapshot.memories.length + 1);
  assert.deepEqual(state.snapshot.memories[0].photos, completion.input.photos);
  assert.equal(state.snapshot.notifications[0].id, result.giftId);
  assert.equal((await h.state(users[0])).snapshot.notifications.length, 0);
  assert.equal((await h.db.query('select * from gift_push_deliveries')).rows.length, 1);
  assert.equal((await h.db.query('select * from gift_web_push_deliveries')).rows.length, 1);
  assert.equal((await h.command(users[0], completion)).giftId, null);
  assert.equal((await h.db.query('select * from gift_notifications')).rows.length, 1);
});

test('completion failures roll back all effects and keep the preparation active', async t => {
  const h = await setup(t);
  for (const input of [
    { ...completion.input, photos: Array(5).fill({ art: 'bear' }) },
    { ...completion.input, photos: [{ uri: 'storage://different-couple/image', storagePath: 'different-couple/image' }] },
    { ...completion.input, note: 'x'.repeat(2001) },
    { ...completion.input, completedAt: '2026-02-30' },
  ]) await assert.rejects(h.command(users[0], { kind: 'complete', input }));
  assert.equal((await h.db.query('select * from memories')).rows.length, h.snapshot.memories.length);
  assert.equal((await h.db.query('select * from gift_notifications')).rows.length, 0);
  assert.equal((await h.db.query("select status from preparations where id='p-bear'")).rows[0].status, 'preparing');
});

test('commands enforce ownership, scope favorites and preserve memories on wish deletion', async t => {
  const h = await setup(t);
  await assert.rejects(h.command(users[0], { kind: 'delete', id: 'bear' }), /chỉ có thể xoá/);
  await assert.rejects(h.command(users[1], { kind: 'prepare', id: 'bear' }), /người ấy/);
  await h.command(users[0], { kind: 'prepare', id: 'bear' });
  assert.equal((await h.db.query("select * from preparations where wish_id='bear'")).rows.length, 1);
  const memory = (await h.state(users[1])).snapshot.memories[0];
  await h.command(users[1], { kind: 'wishFavorite', id: 'bear' });
  assert.equal((await h.state(users[0])).snapshot.wishes[0].favorite, !h.snapshot.wishes[0].favorite);
  await h.command(users[1], { kind: 'delete', id: 'bear' });
  const state = (await h.state(users[1])).snapshot;
  assert.equal(state.wishes.some(wish => wish.id === 'bear'), false);
  assert.deepEqual(state.memories[0], memory);
  assert.equal((await h.db.query("select * from preparations where wish_id='bear'")).rows.length, 0);
  assert.equal((await h.db.query("select wish_id from memories where id='m-bear'")).rows[0].wish_id, null);
});

test('read receipts are recipient-only and idempotent', async t => {
  const h = await setup(t);
  const { giftId } = await h.command(users[0], completion);
  await h.command(users[0], { kind: 'read', id: giftId });
  assert.equal((await h.db.query('select read_at from gift_notifications where id=$1', [giftId])).rows[0].read_at, null);
  await h.command(users[1], { kind: 'read', id: giftId });
  const readAt = (await h.state(users[1])).snapshot.notifications[0].readAt;
  await h.command(users[1], { kind: 'read', id: giftId });
  assert.equal((await h.state(users[1])).snapshot.notifications[0].readAt, readAt);
});

test('create, join and anniversary updates use relational data without legacy writes', async t => {
  const h = await setup(t);
  const fourth = '44444444-4444-4444-8444-444444444444';
  await h.db.query('insert into auth.users(id) values($1)', [fourth]);
  const created = await h.asUser(users[2], async () => (await h.db.query("select create_couple('A','Our space') as value")).rows[0].value);
  assert.equal(created.snapshot.couple.members[1].name, 'Người ấy');
  assert.equal(created.snapshot.couple.members[0].joined, true);
  assert.equal(created.snapshot.couple.members[1].joined, false);
  const joined = await h.asUser(fourth, async () => (await h.db.query("select join_couple($1,'B') as value", [created.inviteCode.toLowerCase()])).rows[0].value);
  assert.equal(joined.snapshot.couple.members[1].name, 'B');
  assert.equal(joined.snapshot.couple.members[1].joined, true);
  assert.equal((await h.db.query('select * from wish_state')).rows.length, 1);
  await h.command(fourth, { kind: 'couple', name: 'Updated', anniversaryDate: '2026-01-02' });
  assert.equal((await h.state(users[2])).snapshot.couple.anniversaryDate, '2026-01-02');
  assert.equal((await h.state(users[2])).snapshot.couple.name, 'Updated');
  await h.command(users[2], { kind: 'add', input: { ...h.snapshot.wishes[0], title: 'New', createdBy: 'linh' } });
  assert.equal((await h.state(fourth)).snapshot.wishes[0].createdBy, 'minh');
});

test('account deletion freezes commands and cascades all relational data while retaining partner Auth', async t => {
  const h = await setup(t);
  await h.db.query('select prepare_account_deletion($1)', [users[0]]);
  await assert.rejects(h.command(users[1], { kind: 'wishFavorite', id: 'bear' }), /đang được xoá/);
  await h.db.query('delete from auth.users where id=$1', [users[0]]);
  for (const table of ['wish_couples','wish_members','wishes','preparations','memories','memory_photos','gift_notifications','wish_state']) {
    assert.equal((await h.db.query(`select * from public.${table}`)).rows.length, 0, table);
  }
  assert.equal((await h.db.query('select * from auth.users where id=$1', [users[1]])).rows.length, 1);
});

test('couple-scoped keys, storage and commands cannot cross into another couple', async t => {
  const h = await setup(t);
  const other = await h.asUser(users[2], async () => (await h.db.query("select create_couple('C','Other') as value")).rows[0].value);
  await h.command(users[2], { kind: 'wishFavorite', id: 'bear' });
  assert.equal((await h.state(users[0])).snapshot.wishes[0].favorite, h.snapshot.wishes[0].favorite);
  await assert.rejects(h.command(users[2], { kind: 'prepare', id: 'bear' }), /người ấy/);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from memories'))).rows.length, 0);
  await assert.rejects(h.db.query('insert into memory_photos(couple_id,memory_id,position,photo) values($1,$2,0,$3)', [other.id, 'm-bear', JSON.stringify({ art: 'bear' })]), /foreign key/);
  const path = `${coupleId}/${users[0]}/test.jpg`;
  await assert.rejects(h.command(users[2], { kind: 'add', input: { ...h.snapshot.wishes[0], cover: { uri: `storage://${path}`, storagePath: path } } }), /Ảnh không hợp lệ/);
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1),('wish-photos',$2)", [path, `${other.id}/${users[2]}/test.jpg`]);
  assert.equal((await h.asUser(users[0], () => h.db.query('select * from storage.objects'))).rows.length, 1);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from storage.objects'))).rows.length, 1);
  await assert.rejects(h.asUser(users[2], () => h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [path])), /row-level security/);
});

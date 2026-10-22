const assert = require('node:assert/strict');
const { test } = require('node:test');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');
const input = { id: 'checkin-test', title: 'Đà Lạt', latitude: 11.94, longitude: 108.44, visitedAt: '2026-10-22', companion: 'Linh', note: 'Cùng nhau ♡', photo: { uri: `storage://${coupleId}/${users[0]}/checkin.jpg`, storagePath: `${coupleId}/${users[0]}/checkin.jpg` } };

test('check-ins persist, update idempotently, share with partner and isolate other couples', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.command(users[0], { kind: 'checkIn', input });
  await h.command(users[0], { kind: 'checkIn', input: { ...input, note: 'Updated' } });
  const items = (await h.state(users[1])).snapshot.checkIns;
  assert.equal(items.length, 1); assert.equal(items[0].note, 'Updated');
  assert.deepEqual(items[0].photo, input.photo);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from check_ins'))).rows.length, 0);
  await assert.rejects(h.asUser(users[0], () => h.db.query('delete from check_ins')), /permission denied/);
  await assert.rejects(h.command(users[1], { kind: 'checkIn', input }), /của mình/);
  await assert.rejects(h.command(users[1], { kind: 'deleteCheckIn', id: input.id }), /của mình/);
  await h.command(users[0], { kind: 'deleteCheckIn', id: input.id });
  assert.deepEqual((await h.state(users[1])).snapshot.checkIns, []);
});

test('check-in coordinates, dates and photo ownership are validated transactionally', async t => {
  const h = await database(); t.after(() => h.db.close());
  for (const invalid of [
    { latitude: 91 }, { longitude: -181 }, { latitude: 'NaN' }, { visitedAt: '2026-02-30' },
    { title: ' ' }, { note: 'a'.repeat(2001) }, { photo: { art: 'bear' } },
    { photo: { uri: 'storage://other/photo.jpg', storagePath: 'other/photo.jpg' } },
  ]) await assert.rejects(h.command(users[0], { kind: 'checkIn', input: { ...input, ...invalid } }));
  assert.equal((await h.state(users[0])).snapshot.checkIns.length, 0);
});

test('partner can read referenced check-in photos but cannot read an unrelated draft', async t => {
  const h = await database(); t.after(() => h.db.close());
  const draft = `${coupleId}/${users[0]}/draft.jpg`;
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1),('wish-photos',$2)", [input.photo.storagePath, draft]);
  await h.command(users[0], { kind: 'checkIn', input });
  const result = await h.asUser(users[1], () => h.db.query('select name from storage.objects'));
  assert.deepEqual(result.rows.map(row => row.name), [input.photo.storagePath]);
  await h.db.query('delete from wish_couples where id=$1', [coupleId]);
  assert.equal((await h.db.query('select * from check_ins')).rows.length, 0);
});

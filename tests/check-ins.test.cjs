const assert = require('node:assert/strict');
const { test } = require('node:test');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');
const input = { id: 'checkin-test', title: 'Đà Lạt', latitude: 11.94, longitude: 108.44, visitedAt: '2026-10-22', companion: 'Linh', note: 'Cùng nhau ♡', photo: { uri: `storage://${coupleId}/${users[0]}/checkin.jpg`, storagePath: `${coupleId}/${users[0]}/checkin.jpg` } };

test('new check-in notifies only the partner and atomically queues both push channels once', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.db.query("insert into wish_push_tokens(token,user_id,platform) values('ExponentPushToken[partner]',$1,'android'),('ExponentPushToken[sender]',$2,'ios')", [users[1], users[0]]);
  await h.db.query("insert into wish_web_push_subscriptions(user_id,endpoint,p256dh,auth) values($1,'https://fcm.googleapis.com/test','key','auth')", [users[1]]);
  const result = await h.command(users[0], { kind: 'checkIn', input });
  assert.ok(result.notificationId);
  const notification = (await h.state(users[1])).snapshot.notifications[0];
  assert.equal(notification.id, result.notificationId);
  assert.equal(notification.kind, 'checkIn');
  assert.equal(notification.checkInId, input.id);
  assert.equal(notification.title, input.title);
  assert.equal(notification.sender, 'minh');
  assert.equal(notification.recipient, 'linh');
  assert.equal((await h.state(users[0])).snapshot.notifications.length, 0);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from gift_notifications'))).rows.length, 0);
  assert.equal((await h.db.query('select token from gift_push_deliveries')).rows[0].token, 'ExponentPushToken[partner]');
  assert.equal((await h.db.query('select * from gift_web_push_deliveries')).rows.length, 1);
  assert.deepEqual(await h.command(users[0], { kind: 'checkIn', input }), {});
  await h.command(users[0], { kind: 'checkIn', input: { ...input, title: 'Updated' } });
  assert.equal((await h.db.query('select * from gift_notifications')).rows.length, 1);
  assert.equal((await h.db.query('select * from gift_push_deliveries')).rows.length, 1);
  assert.equal((await h.db.query('select * from gift_web_push_deliveries')).rows.length, 1);
  await h.command(users[0], { kind: 'read', id: notification.id });
  assert.equal((await h.state(users[1])).snapshot.notifications[0].readAt, undefined);
  await h.command(users[1], { kind: 'read', id: notification.id });
  assert.ok((await h.state(users[1])).snapshot.notifications[0].readAt);
  await h.command(users[0], { kind: 'deleteCheckIn', id: input.id });
  assert.equal((await h.db.query('select * from gift_notifications')).rows.length, 0);
  assert.equal((await h.db.query('select * from gift_push_deliveries')).rows.length, 0);
  assert.equal((await h.db.query('select * from gift_web_push_deliveries')).rows.length, 0);
});

test('check-in save survives an absent partner and invalid saves never notify', async t => {
  const h = await database(); t.after(() => h.db.close());
  await assert.rejects(h.command(users[0], { kind: 'checkIn', input: { ...input, latitude: 91 } }));
  assert.equal((await h.db.query('select * from gift_notifications')).rows.length, 0);
  await h.db.query('delete from wish_members where user_id=$1', [users[1]]);
  assert.deepEqual(await h.command(users[0], { kind: 'checkIn', input }), {});
  assert.equal((await h.state(users[0])).snapshot.checkIns.length, 1);
  assert.equal((await h.db.query('select * from gift_notifications')).rows.length, 0);
});

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

test('only the two members can read location rows and private photos, including direct queries', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.command(users[0], { kind: 'checkIn', input });
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [input.photo.storagePath]);
  const other = await h.asUser(users[2], () => h.db.query("select public.create_couple('Other','Other space') as value"));
  assert.notEqual(other.rows[0].value.id, coupleId);
  for (const member of users.slice(0, 2)) {
    assert.equal((await h.asUser(member, () => h.db.query('select latitude,longitude,photo from check_ins'))).rows.length, 1);
    assert.equal((await h.asUser(member, () => h.db.query('select name from storage.objects'))).rows.length, 1);
    assert.equal((await h.state(member)).snapshot.checkIns.length, 1);
  }
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from check_ins where id=$1', [input.id]))).rows.length, 0);
  assert.equal((await h.state(users[2])).snapshot.checkIns.length, 0);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from storage.objects where name=$1', [input.photo.storagePath]))).rows.length, 0);
  assert.equal((await h.db.query("select public from storage.buckets where id='wish-photos'")).rows[0].public, false);
  await assert.rejects(h.asUser(null, () => h.db.query('select * from check_ins'), 'anon'), /permission denied/);
  await assert.rejects(h.asUser(null, () => h.db.query('select public.get_my_couple()'), 'anon'), /permission denied/);
  // Even an accidentally permissive policy must not defeat the restrictive boundary.
  await h.db.exec('create policy accidental_read on check_ins for select to authenticated using (true)');
  await h.db.exec('create policy accidental_photo_read on storage.objects for select to authenticated using (true)');
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from check_ins'))).rows.length, 0);
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from storage.objects'))).rows.length, 0);
});

test('public image URLs, cross-space photos and partner drafts cannot become check-in photos', async t => {
  const h = await database(); t.after(() => h.db.close());
  const partnerPath = `${coupleId}/${users[1]}/draft.jpg`;
  for (const photo of [
    { uri: 'https://example.com/public.jpg' },
    { uri: 'https://example.com/public.jpg', storagePath: input.photo.storagePath },
    { uri: `storage://${partnerPath}`, storagePath: partnerPath },
    { uri: `storage://${coupleId}/${users[0]}/../other.jpg`, storagePath: `${coupleId}/${users[0]}/../other.jpg` },
    { uri: `storage://${coupleId}/${users[0]}/..`, storagePath: `${coupleId}/${users[0]}/..` },
  ]) await assert.rejects(h.command(users[0], { kind: 'checkIn', input: { ...input, photo } }));
  assert.equal((await h.state(users[0])).snapshot.checkIns.length, 0);
});

test('a third member cannot join, and removed membership loses location and photo access', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.command(users[0], { kind: 'checkIn', input });
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [input.photo.storagePath]);
  await assert.rejects(h.asUser(users[2], () => h.db.query("select public.join_couple('ABCDE','Third')")), /đủ hai người/);
  await h.db.query('delete from wish_members where user_id=$1', [users[1]]);
  assert.equal(await h.state(users[1]), null);
  assert.equal((await h.asUser(users[1], () => h.db.query('select * from check_ins'))).rows.length, 0);
  assert.equal((await h.asUser(users[1], () => h.db.query('select * from storage.objects'))).rows.length, 0);
});

test('thumbnail permission follows the original reference and never opens unshared derivatives or other spaces', async t => {
  const h = await database(); t.after(() => h.db.close());
  const thumbnail = `${input.photo.storagePath}.thumb-144.jpg`;
  const draft = `${coupleId}/${users[0]}/unshared.jpg.thumb-144.jpg`;
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1),('wish-photos',$2),('wish-photos',$3)", [input.photo.storagePath, thumbnail, draft]);
  assert.equal((await h.asUser(users[1], () => h.db.query('select name from storage.objects'))).rows.length, 0);
  await h.command(users[0], { kind: 'checkIn', input });
  assert.deepEqual((await h.asUser(users[1], () => h.db.query('select name from storage.objects order by name'))).rows.map(row => row.name), [input.photo.storagePath, thumbnail]);
  assert.equal((await h.asUser(users[2], () => h.db.query('select name from storage.objects'))).rows.length, 0);
  await h.command(users[0], { kind: 'deleteCheckIn', id: input.id });
  assert.equal((await h.asUser(users[1], () => h.db.query('select name from storage.objects'))).rows.length, 0);
});

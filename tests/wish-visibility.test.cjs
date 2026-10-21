const assert = require('node:assert/strict');
const { test } = require('node:test');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');

test('only the owner controls visibility; hidden wishes and preparations are excluded from RPC and RLS', async t => {
  const h = await database();
  t.after(() => h.db.close());
  await assert.rejects(h.command(users[0], { kind: 'wishActive', id: 'bear', active: false }), /của mình/);
  await assert.rejects(h.command(users[2], { kind: 'wishActive', id: 'bear', active: false }));
  await assert.rejects(h.command(users[1], { kind: 'wishActive', id: 'bear', active: 'false' }), /không hợp lệ/);
  await h.command(users[1], { kind: 'wishActive', id: 'bear', active: false });
  assert.equal((await h.state(users[1])).snapshot.wishes.find(w => w.id === 'bear').active, false);
  assert.equal((await h.state(users[0])).snapshot.wishes.some(w => w.id === 'bear'), false);
  assert.equal((await h.state(users[0])).snapshot.preparations.some(p => p.wishId === 'bear'), false);
  assert.equal((await h.asUser(users[0], () => h.db.query("select * from wishes where id='bear'"))).rows.length, 0);
  assert.equal((await h.asUser(users[0], () => h.db.query("select * from preparations where wish_id='bear'"))).rows.length, 0);
  await assert.rejects(h.command(users[0], { kind: 'prepare', id: 'bear' }));
  await assert.rejects(h.command(users[0], { kind: 'complete', input: { wishId: 'bear', completedAt: '2026-10-21', note: '', photos: [] } }));
  const favorite = (await h.state(users[1])).snapshot.wishes.find(w => w.id === 'bear').favorite;
  await h.command(users[0], { kind: 'wishFavorite', id: 'bear' });
  assert.equal((await h.state(users[1])).snapshot.wishes.find(w => w.id === 'bear').favorite, favorite);
  await h.command(users[1], { kind: 'wishActive', id: 'bear', active: true });
  assert.equal((await h.state(users[0])).snapshot.wishes.some(w => w.id === 'bear'), true);
  assert.equal((await h.state(users[0])).snapshot.preparations.some(p => p.wishId === 'bear'), true);
});

test('new private wishes and their uploaded covers stay private until activated', async t => {
  const h = await database();
  t.after(() => h.db.close());
  const path = `${coupleId}/${users[1]}/private.jpg`;
  await h.db.query("insert into storage.objects(bucket_id,name) values('wish-photos',$1)", [path]);
  await h.command(users[1], { kind: 'add', input: { ...h.snapshot.wishes[0], active: false, title: 'Private', cover: { uri: `storage://${path}`, storagePath: path } } });
  const wish = (await h.state(users[1])).snapshot.wishes.find(w => w.title === 'Private');
  assert.equal(wish.active, false);
  assert.equal((await h.state(users[0])).snapshot.wishes.some(w => w.id === wish.id), false);
  assert.equal((await h.asUser(users[0], () => h.db.query('select * from storage.objects'))).rows.length, 0);
  assert.equal((await h.asUser(users[1], () => h.db.query('select * from storage.objects'))).rows.length, 1);
  await h.command(users[1], { kind: 'wishActive', id: wish.id, active: true });
  assert.equal((await h.asUser(users[0], () => h.db.query('select * from storage.objects'))).rows.length, 1);
  await h.command(users[1], { kind: 'wishActive', id: wish.id, active: false });
  assert.equal((await h.asUser(users[0], () => h.db.query('select * from storage.objects'))).rows.length, 0);
});

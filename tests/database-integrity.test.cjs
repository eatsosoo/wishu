const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { database, users, coupleId, migrations } = require('./helpers/relational-db.cjs');

async function createPin(h) {
  const today = (await h.db.query("select ((now() at time zone 'UTC')+interval '7 hours')::date::text as day")).rows[0].day;
  const path = `${coupleId}/${users[0]}/integrity.jpg`;
  await h.command(users[0], { kind: 'checkIn', input: { id: 'integrity-pin', title: 'Test',
    latitude: 0, longitude: 0, visitedAt: today, companion: '', note: '',
    photo: { uri: `storage://${path}`, storagePath: path } } });
  return (await h.db.query("select * from gift_notifications where check_in_id='integrity-pin'")).rows[0];
}

test('database rejects notifications crossing couple membership on insert and update', async t => {
  const h = await database(); t.after(() => h.db.close());
  const notification = await createPin(h);
  for (const column of ['sender_id', 'recipient_id']) {
    await assert.rejects(h.db.query(`update gift_notifications set ${column}=$1 where id=$2`, [users[2], notification.id]), { code: '23503' });
  }
  await assert.rejects(h.db.query('update gift_notifications set recipient_id=sender_id where id=$1', [notification.id]), { code: '23514' });
  assert.equal((await h.db.query('select recipient_id from gift_notifications where id=$1', [notification.id])).rows[0].recipient_id, users[1]);
  await h.db.query('delete from gift_notifications where id=$1', [notification.id]);
  await assert.rejects(h.db.query('insert into gift_notifications(id,couple_id,sender_id,recipient_id,payload,check_in_id) values($1,$2,$3,$4,$5,$6)',
    ['outside', coupleId, users[0], users[2], JSON.stringify({ ...notification.payload, id: 'outside' }), notification.check_in_id]), { code: '23503' });
  assert.equal((await h.asUser(users[2], () => h.db.query('select * from gift_notifications'))).rows.length, 0);
});

test('notifications require exactly one target and a matching JSON type/ID', async t => {
  const h = await database(); t.after(() => h.db.close());
  const n = await createPin(h);
  const memory = (await h.db.query('select id from memories limit 1')).rows[0].id;
  for (const sql of ['check_in_id=null', `memory_id='${memory}'`]) {
    await assert.rejects(h.db.query(`update gift_notifications set ${sql} where id=$1`, [n.id]), { code: '23514' });
  }
  for (const payload of [{}, [], null, { ...n.payload, id: 'wrong' },
    { ...n.payload, checkInId: 'wrong' }, { ...n.payload, kind: 'gift' },
    { ...n.payload, memoryId: memory }, { ...n.payload, checkInId: null }]) {
    await assert.rejects(h.db.query('update gift_notifications set payload=$1 where id=$2', [JSON.stringify(payload), n.id]), { code: '23514' });
  }
  // Legacy gift payloads omit kind; both the old and explicit gift form remain valid.
  for (const kind of [undefined, 'gift']) {
    await h.db.query('delete from gift_notifications where memory_id=$1', [memory]);
    const id = `gift-${kind ?? 'legacy'}`;
    await h.db.query('insert into gift_notifications(id,couple_id,sender_id,recipient_id,memory_id,payload) values($1,$2,$3,$4,$5,$6)',
      [id, coupleId, users[0], users[1], memory, JSON.stringify({ id, kind, memoryId: memory })]);
    const duplicate = 'duplicate-gift';
    await assert.rejects(h.db.query('insert into gift_notifications(id,couple_id,sender_id,recipient_id,memory_id,payload) values($1,$2,$3,$4,$5,$6)',
      [duplicate, coupleId, users[0], users[1], memory, JSON.stringify({ id: duplicate, memoryId: memory })]), { code: '23505' });
  }
});

test('creator and notification memberships cannot be removed, but inactive preserves all records', async t => {
  const h = await database(); t.after(() => h.db.close());
  const n = await createPin(h);
  await assert.rejects(h.db.query('delete from wish_members where user_id=$1', [users[1]]), { code: '23503' });
  // Isolate the creator FK from the notification membership FKs.
  await h.db.query('delete from gift_notifications where id=$1', [n.id]);
  await assert.rejects(h.db.query('delete from wish_members where user_id=$1', [users[0]]), { code: '23503' });
  await h.db.query('select deactivate_account($1)', [users[0]]);
  assert.equal((await h.state(users[1])).snapshot.checkIns.length, 1);
  assert.equal((await h.db.query('select * from wish_members')).rows.length, 2);
  // NO ACTION checks at statement end still allow the legacy operator purge of
  // an entire couple, where both child and parent rows are removed together.
  await h.db.query('delete from wish_couples where id=$1', [coupleId]);
  assert.equal((await h.db.query('select * from check_ins')).rows.length, 0);
});

test('native queue planner can use the pending and receipt indexes', async t => {
  const h = await database(); t.after(() => h.db.close());
  await h.db.exec('set enable_seqscan=off');
  for (const [predicate, index] of [["status in ('pending','sending')", 'native_push_pending'], ["status='accepted'", 'native_push_receipts']]) {
    const result = await h.db.query(`explain (format json) select id from gift_push_deliveries where ${predicate} and retry_at<=now() order by retry_at limit 50`);
    assert.ok(JSON.stringify(result.rows).includes(index));
  }
});

test('migration aborts without removing legacy records when it finds inconsistent data', async t => {
  const h = await database({ throughMigration: '202610240003_inactive_accounts.sql' }); t.after(() => h.db.close());
  await h.db.query("insert into gift_notifications(id,couple_id,sender_id,recipient_id,payload) values('bad-legacy',$1,$2,$3,'{}')", [coupleId, users[0], users[2]]);
  const migration = readFileSync(join(migrations, '202610250001_review_integrity.sql'), 'utf8');
  await assert.rejects(h.db.exec(migration), { code: '23503' });
  await h.db.exec('rollback');
  assert.equal((await h.db.query("select * from gift_notifications where id='bad-legacy'")).rows.length, 1);
  assert.equal((await h.db.query("select * from pg_constraint where conname='wish_members_couple_user_key'")).rows.length, 0);
});

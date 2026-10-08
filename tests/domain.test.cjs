const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createMockSnapshot } = require('../src/services/mock-data.ts');
const { addWish, prepareWish, completeWish, privatePreparations, readGift } = require('../src/services/wish-actions.ts');
const { parseDate } = require('../src/features/wishes/format.ts');

test('preparation is visible only to the mock actor who started it', () => {
  const snapshot = createMockSnapshot();
  assert.equal(privatePreparations(snapshot, 'minh').length, 2);
  assert.equal(privatePreparations(snapshot, 'linh').length, 0);
  assert.throws(() => prepareWish(snapshot, 'bear', 'linh'));
});
test('starting the same surprise twice is idempotent and keeps wishes unchanged', () => {
  const snapshot = createMockSnapshot();
  const next = prepareWish(snapshot, 'photobooth', 'minh');
  assert.equal(next.preparations.length, 3);
  assert.deepEqual(next.wishes, snapshot.wishes);
  assert.strictEqual(prepareWish(next, 'photobooth', 'minh'), next);
});
test('completion requires the preparer and adds one memory even on repeat submit', () => {
  const snapshot = createMockSnapshot();
  const input = { wishId: 'bear', completedAt: '2024-10-20', note: 'A special day', photos: [] };
  assert.throws(() => completeWish(snapshot, input, 'linh'));
  const next = completeWish(snapshot, input, 'minh');
  assert.equal(next.memories.length, snapshot.memories.length + 1);
  assert.equal(next.preparations.find(item => item.wishId === 'bear').status, 'completed');
  assert.deepEqual(next.memories[0].photos, [snapshot.wishes[0].cover]);
  assert.equal(next.notifications.length, 1);
  assert.equal(next.notifications[0].sender, 'minh');
  assert.equal(next.notifications[0].recipient, 'linh');
  assert.equal(next.notifications[0].memoryId, next.memories[0].id);
  assert.equal(snapshot.notifications.length, 0);
  assert.strictEqual(completeWish(next, input, 'minh'), next);
});
test('only the recipient can read a gift and repeated reads preserve its timestamp', () => {
  const next = completeWish(createMockSnapshot(), { wishId: 'bear', completedAt: '2024-10-20', note: '', photos: [] }, 'minh');
  const id = next.notifications[0].id;
  assert.strictEqual(readGift(next, id, 'minh'), next);
  const read = readGift(next, id, 'linh');
  assert.ok(read.notifications[0].readAt);
  assert.strictEqual(readGift(read, id, 'linh'), read);
  assert.equal(read.memories.length, next.memories.length);
});
test('adding a wish preserves the source fixture and jar ownership', () => {
  const snapshot = createMockSnapshot();
  const next = addWish(snapshot, { ...snapshot.wishes[0], createdBy: 'minh', title: 'New wish' });
  assert.equal(snapshot.wishes.length, 30);
  assert.equal(next.wishes.length, 31);
  assert.equal(next.wishes[0].createdBy, 'minh');
  assert.equal(next.wishes[0].favorite, false);
});
test('completion dates reject impossible days and fractional years', () => {
  assert.equal(parseDate('29/02/2024'), '2024-02-29');
  assert.equal(parseDate('29/02/2023'), null);
  assert.equal(parseDate('31/04/2024'), null);
  assert.equal(parseDate('20/10/2024.5'), null);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createMockSnapshot } = require('../src/services/mock-data.ts');
const { addWish, prepareWish, completeWish, privatePreparations, readGift } = require('../src/services/wish-actions.ts');
const { formatBudgetInput, parseDate } = require('../src/features/wishes/format.ts');
const { togetherDays } = require('../src/features/couple/selectors.ts');
const { applyWishCommand } = require('../src/services/wish-actions.ts');
const { partnerName, personalizePartnerText } = require('../src/features/couple/selectors.ts');

test('partner copy follows the other member and falls back while waiting for them', () => {
  const couple = { name: '', anniversaryDate: '', members: [{ id: 'minh', name: 'Minh' }] };
  assert.equal(partnerName(couple, 'minh'), 'người ấy');
  couple.members.push({ id: 'linh', name: '  Linh  ' });
  assert.equal(partnerName(couple, 'minh'), 'Linh');
  assert.equal(partnerName(couple, 'linh'), 'Minh');
  assert.equal(personalizePartnerText('Người ấy đang chờ. Gửi cho người ấy nhé.', 'Linh'), 'Linh đang chờ. Gửi cho Linh nhé.');
  assert.equal(personalizePartnerText('Người ấy đang chờ.', 'người ấy'), 'Người ấy đang chờ.');
  assert.equal(personalizePartnerText('Gửi cho người ấy.', '$&'), 'Gửi cho $&.');
  couple.members[1].name = '   ';
  assert.equal(partnerName(couple, 'minh'), 'người ấy');
});

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

test('together days use the current local calendar date, including leap days', () => {
  assert.equal(togetherDays('2026-10-18', new Date(2026, 9, 19, 0, 1)), 1);
  assert.equal(togetherDays('2026-10-18', new Date(2026, 9, 19, 23, 59)), 1);
  assert.equal(togetherDays('2024-02-28', new Date(2024, 2, 1)), 2);
  assert.equal(togetherDays('2026-10-19', new Date(2026, 9, 19)), 0);
  assert.equal(togetherDays('2026-10-20', new Date(2026, 9, 19)), 0);
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  assert.equal(togetherDays(iso), 0);
});

test('together days safely handle missing and invalid anniversary dates', () => {
  for (const value of ['', 'invalid', '19/10/2026', '2023-02-29', '2026-13-01']) {
    assert.equal(togetherDays(value, new Date(2026, 9, 19)), 0);
  }
});

test('changing the anniversary updates the day count without changing other couple data', () => {
  const snapshot = createMockSnapshot();
  const now = new Date(2026, 9, 19);
  const next = applyWishCommand(snapshot, { kind: 'couple', name: snapshot.couple.name, anniversaryDate: '2026-10-01' }, 'minh');
  assert.equal(togetherDays(next.couple.anniversaryDate, now), 18);
  assert.notEqual(togetherDays(snapshot.couple.anniversaryDate, now), 18);
  assert.deepEqual(next.couple.members, snapshot.couple.members);
  assert.equal(snapshot.couple.anniversaryDate, '2024-02-14');
});

test('only the creator can delete a wish and related preparations are removed', () => {
  const snapshot = createMockSnapshot();
  const own = snapshot.wishes.find(wish => wish.id === 'bear');
  assert.throws(() => applyWishCommand(snapshot, { kind: 'delete', id: own.id }, own.createdBy === 'minh' ? 'linh' : 'minh'));
  const next = applyWishCommand(snapshot, { kind: 'delete', id: own.id }, own.createdBy);
  assert.equal(next.wishes.some(wish => wish.id === own.id), false);
  assert.equal(next.preparations.some(item => item.wishId === own.id), false);
  assert.equal(snapshot.wishes.some(wish => wish.id === own.id), true);
  assert.deepEqual(next.wishes, snapshot.wishes.filter(wish => wish.id !== own.id));
  assert.strictEqual(applyWishCommand(next, { kind: 'delete', id: own.id }, own.createdBy), next);
});

test('deleting a completed wish preserves its memory, gift and shared cover', () => {
  const snapshot = completeWish(createMockSnapshot(), { wishId: 'bear', completedAt: '2026-10-19', note: '', photos: [] }, 'minh');
  const wish = snapshot.wishes.find(item => item.id === 'bear');
  const next = applyWishCommand(snapshot, { kind: 'delete', id: wish.id }, wish.createdBy);
  assert.deepEqual(next.memories, snapshot.memories);
  assert.deepEqual(next.notifications, snapshot.notifications);
  assert.deepEqual(next.memories[0].photos, [wish.cover]);
});

test('more than eight memory photos are rejected before changing data', () => {
  assert.throws(() => completeWish(createMockSnapshot(), { wishId: 'bear', completedAt: '2026-10-19', note: '', photos: Array.from({ length: 9 }, () => ({ art: 'bear' })) }, 'minh'));
});

test('budget inputs group digits without changing the stored integer value', () => {
  assert.equal(formatBudgetInput('1000000'), '1.000.000');
  assert.equal(formatBudgetInput('1.234.567'), '1.234.567');
  assert.equal(formatBudgetInput('1,200,000 đ'), '1.200.000');
  assert.equal(formatBudgetInput('00050'), '50');
  assert.equal(formatBudgetInput('0'), '0');
  assert.equal(formatBudgetInput(''), '');
  assert.equal(Number(formatBudgetInput('1234567').replaceAll('.', '')), 1234567);
});

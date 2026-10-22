const assert = require('node:assert/strict');
const { test } = require('node:test');
const { calendarMemories } = require('../src/features/calendar/memories.ts');

const memory = { id: 'same-id', wishId: 'wish', title: 'Món quà', category: 'Quà tặng', completedAt: '2026-10-20', note: '', photos: [{ art: 'gift' }, { art: 'bear' }], favorite: true };
const checkIn = { id: 'same-id', createdBy: 'minh', title: 'Một buổi hẹn', visitedAt: '2026-10-20', note: 'Ngày vui', companion: 'Linh', photo: { uri: 'photo.jpg' }, latitude: 11.94, longitude: 108.44 };

test('calendar combines check-in photos and wish memories on their saved dates', () => {
  const entries = calendarMemories([memory], [checkIn]);
  assert.equal(entries.length, 2);
  assert.equal(entries.reduce((total, entry) => total + entry.photos.length, 0), 3);
  assert.deepEqual(entries.map(entry => entry.completedAt), ['2026-10-20', '2026-10-20']);
  assert.equal(new Set(entries.map(entry => `${entry.source}:${entry.id}`)).size, 2);
  assert.equal(entries[1].companion, 'Linh');
  assert.equal(entries[1].favorite, undefined, 'check-ins must not be favorited through wish memory commands');
  assert.deepEqual(calendarMemories([memory], [checkIn], 'Quà tặng').map(entry => entry.source), ['memory']);
  assert.deepEqual(calendarMemories([memory], [checkIn], 'Khoảnh khắc').map(entry => entry.source), ['checkIn']);
});

test('edited dates, replacement photos and deleted check-ins update the calendar without stale copies', () => {
  const updated = { ...checkIn, visitedAt: '2026-10-21', photo: { uri: 'new-photo.jpg' } };
  const entries = calendarMemories([memory], [updated]);
  assert.equal(entries.filter(entry => entry.completedAt === '2026-10-20').length, 1);
  assert.equal(entries.find(entry => entry.source === 'checkIn').photos[0].uri, 'new-photo.jpg');
  assert.equal(calendarMemories([memory], []).length, 1);
  assert.equal(memory.photos.length, 2);
  assert.equal(checkIn.visitedAt, '2026-10-20');
});

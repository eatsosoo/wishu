const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getCalendarEvents, getCalendarQuote } = require('../src/features/calendar/holidays.ts');

function milestones(year, month, day, anniversaryDate = '2024-02-14') {
  return getCalendarEvents(month, day, undefined, { year, anniversaryDate }).filter(event => event.icon === 'milestone');
}

test('day milestones cross leap years and appear exactly once at 100, 300 and 1000 elapsed days', () => {
  for (const [year, month, day, count] of [[2024, 5, 24, 100], [2024, 12, 10, 300], [2026, 11, 10, 1000]]) {
    const events = milestones(year, month, day);
    assert.equal(events.length, 1);
    assert.equal(events[0].marker, String(count));
    assert.ok(events[0].name.includes('ngày'));
    assert.equal(milestones(year, month, day - 1).length, 0);
    assert.equal(milestones(year + 1, month, day).length, 0);
  }
});

test('annual markers show total months and do not hide overlapping holidays or birthdays', () => {
  const events = getCalendarEvents(2, 14, [{ name: 'Linh', birthDate: '2000-02-14' }], { year: 2025, anniversaryDate: '2024-02-14' });
  assert.deepEqual(events.map(event => event.icon), ['heart', 'birthday', 'milestone']);
  assert.equal(events[2].marker, '12');
  assert.equal(events[2].name, 'Kỷ niệm 1 năm bên nhau');
  assert.equal(milestones(2034, 2, 14)[0].marker, '120');
  assert.deepEqual(milestones(2024, 2, 14), []);
  assert.deepEqual(milestones(2023, 2, 14), []);
});

test('February 29 anniversaries use February 28 only in non-leap years', () => {
  assert.equal(milestones(2025, 2, 28, '2024-02-29')[0].marker, '12');
  assert.deepEqual(milestones(2028, 2, 28, '2024-02-29'), []);
  assert.equal(milestones(2028, 2, 29, '2024-02-29')[0].marker, '48');
});

test('monthly anniversaries count across years and only appear on the matching day after the start', () => {
  for (const [year, month, count] of [[2024, 3, 1], [2024, 12, 10], [2025, 1, 11], [2025, 3, 13]]) {
    const events = milestones(year, month, 14);
    assert.equal(events.length, 1);
    assert.equal(events[0].marker, String(count));
    assert.equal(events[0].name, `Kỷ niệm ${count} tháng bên nhau`);
    assert.deepEqual(milestones(year, month, 13), []);
    assert.deepEqual(milestones(year, month, 15), []);
  }
  assert.deepEqual(milestones(2024, 1, 14), []);
  assert.deepEqual(milestones(2024, 2, 14), []);
});

test('month-end anniversaries clamp to shorter months and return to the original day', () => {
  for (const [year, month, day, count] of [[2024, 2, 29, 1], [2024, 3, 31, 2], [2024, 4, 30, 3], [2025, 2, 28, 13]]) {
    const events = milestones(year, month, day, '2024-01-31');
    assert.equal(events.length, 1);
    assert.equal(events[0].marker, String(count));
    assert.deepEqual(milestones(year, month, day - 1, '2024-01-31'), []);
  }
  assert.deepEqual(milestones(2024, 3, 29, '2024-01-31'), []);
});

test('monthly anniversaries keep overlapping holidays and birthdays visible', () => {
  const events = getCalendarEvents(3, 14, [{ name: 'Linh', birthDate: '2000-03-14' }], { year: 2024, anniversaryDate: '2024-02-14' });
  assert.deepEqual(events.map(event => event.icon), ['whiteHeart', 'birthday', 'milestone']);
  assert.equal(events[2].marker, '1');
});

test('missing and impossible anniversary dates add no milestone', () => {
  for (const date of ['', '2024-02-30', 'not-a-date']) assert.deepEqual(milestones(2025, 3, 1, date), []);
});

test('every special day has a short message; milestones take priority when events overlap', () => {
  for (const [month, day] of [[2, 14], [3, 14], [3, 8], [6, 1], [10, 20], [11, 19], [12, 25]]) {
    const events = getCalendarEvents(month, day);
    assert.ok(getCalendarQuote(events).length > 0);
    assert.ok(getCalendarQuote(events).length < 100);
  }
  assert.notEqual(getCalendarQuote(getCalendarEvents(2, 14)), getCalendarQuote(getCalendarEvents(3, 14)));
  const birthday = getCalendarEvents(2, 14, [{ name: 'Linh', birthDate: '2000-02-14' }]);
  assert.equal(getCalendarQuote(birthday), birthday[1].quote);
  const anniversary = getCalendarEvents(2, 14, undefined, { year: 2025, anniversaryDate: '2024-02-14' });
  assert.equal(getCalendarQuote(anniversary), anniversary[1].quote);
  assert.ok(getCalendarQuote([]));
});

test('both members birthdays are visible regardless of who opens the calendar', () => {
  const members = [
    { id: 'minh', name: 'Minh', birthDate: '1998-04-15' },
    { id: 'linh', name: 'Linh', birthDate: '2000-09-10' },
  ];
  assert.equal(getCalendarEvents(4, 15, members)[0].name, 'Sinh nhật Minh');
  assert.equal(getCalendarEvents(9, 10, members)[0].name, 'Sinh nhật Linh');
  assert.deepEqual(getCalendarEvents(4, 16, members), []);
  assert.deepEqual(getCalendarEvents(4, 15, [members[0], { id: 'linh', name: 'Linh' }]).map(event => event.name), ['Sinh nhật Minh']);
});

test('same-day birthdays keep unique identities even when names and holidays overlap', () => {
  const members = [
    { id: 'minh', name: 'An', birthDate: '1998-02-14' },
    { id: 'linh', name: 'An', birthDate: '2000-02-14' },
  ];
  const events = getCalendarEvents(2, 14, members, { year: 2025, anniversaryDate: '2024-02-14' });
  assert.deepEqual(events.map(event => event.icon), ['heart', 'birthday', 'birthday', 'milestone']);
  const birthdays = events.filter(event => event.icon === 'birthday');
  assert.equal(new Set(birthdays.map(event => event.id)).size, 2);
});

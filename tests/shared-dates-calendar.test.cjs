const assert = require('node:assert/strict');
const { test } = require('node:test');
const { localDate, formatDate, parseDate } = require('../src/features/dates.ts');
const { calendarMonth } = require('../src/features/calendar/month.ts');

test('local dates keep the device day around midnight and month boundaries', () => {
  for (const [year, month, day] of [[2026, 0, 1], [2024, 1, 29], [2026, 9, 1]]) {
    const expected = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    for (const hour of [0, 23]) assert.equal(localDate(new Date(year, month, day, hour, 30)), expected);
    assert.equal(parseDate(formatDate(expected)), expected);
  }
  assert.equal(parseDate('29/02/2025'), null);
  assert.equal(parseDate('31/04/2026'), null);
});

test('calendar grids align every day to Monday-first columns across leap years', () => {
  for (const year of [1900, 2000, 2024, 2025, 2026, 2100]) {
    for (let month = 0; month < 12; month++) {
      const short = calendarMonth(year, month);
      const full = calendarMonth(year, month, true);
      const count = new Date(year, month + 1, 0).getDate();
      assert.equal(full.length % 7, 0);
      assert.ok(full.length >= short.length && full.length - short.length < 7);
      assert.deepEqual(full.filter(day => day !== null), Array.from({ length: count }, (_, index) => index + 1));
      assert.deepEqual(full.slice(0, short.length), short);
      full.forEach((day, index) => {
        if (day !== null) assert.equal(index % 7, (new Date(year, month, day).getDay() + 6) % 7);
      });
    }
  }
});

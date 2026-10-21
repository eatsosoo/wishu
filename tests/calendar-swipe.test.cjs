const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createCalendarSwipeHandlers, shiftCalendarMonth } = require('../src/features/calendar/swipe.ts');

const gesture = (dx, dy = 0, numberActiveTouches = 1) => ({ dx, dy, numberActiveTouches });

test('calendar captures deliberate horizontal gestures while leaving taps, vertical scrolling and multitouch alone', () => {
  const handlers = createCalendarSwipeHandlers(() => {});
  assert.equal(handlers.onStartShouldSetPanResponder({}, gesture(0)), false);
  for (const move of [gesture(10), gesture(20, 40), gesture(30, 25), gesture(70, 0, 2)]) {
    assert.equal(handlers.onMoveShouldSetPanResponderCapture({}, move), false);
  }
  assert.equal(handlers.onMoveShouldSetPanResponderCapture({}, gesture(-30, 5)), true);
  assert.equal(handlers.onMoveShouldSetPanResponderCapture({}, gesture(30, 5)), true);
});

test('one completed swipe changes exactly one month and supports repeated opposite gestures', () => {
  const changes = [];
  const handlers = createCalendarSwipeHandlers(direction => changes.push(direction));
  handlers.onPanResponderGrant();
  handlers.onPanResponderRelease({}, gesture(-80));
  handlers.onPanResponderRelease({}, gesture(-80));
  assert.deepEqual(changes, [1]);
  handlers.onPanResponderGrant();
  handlers.onPanResponderRelease({}, gesture(100));
  assert.deepEqual(changes, [1, -1]);
});

test('short, vertical, cancelled and interrupted swipes do not change months', () => {
  const changes = [];
  const handlers = createCalendarSwipeHandlers(direction => changes.push(direction));
  for (const move of [gesture(-30), gesture(-70, 70), gesture(0)]) {
    handlers.onPanResponderGrant();
    handlers.onPanResponderRelease({}, move);
  }
  handlers.onPanResponderGrant();
  handlers.onPanResponderTerminate();
  handlers.onPanResponderRelease({}, gesture(-100));
  handlers.onPanResponderGrant();
  handlers.onPanResponderMove({}, gesture(-100, 0, 2));
  handlers.onPanResponderRelease({}, gesture(-100));
  assert.deepEqual(changes, []);
});

test('month navigation handles year boundaries and never skips short months', () => {
  const dateParts = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  assert.deepEqual(dateParts(shiftCalendarMonth(new Date(2026, 0, 31), 1)), [2026, 2, 1]);
  assert.deepEqual(dateParts(shiftCalendarMonth(new Date(2026, 2, 31), -1)), [2026, 2, 1]);
  assert.deepEqual(dateParts(shiftCalendarMonth(new Date(2026, 11, 31), 1)), [2027, 1, 1]);
  assert.deepEqual(dateParts(shiftCalendarMonth(new Date(2026, 0, 1), -1)), [2025, 12, 1]);
});

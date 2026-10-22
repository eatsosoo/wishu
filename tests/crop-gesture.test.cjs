const assert = require('node:assert/strict');
const { test } = require('node:test');
const { startCropGesture, moveCropGesture, cropTouchKey } = require('../src/features/photos/crop-gesture.ts');
const point = (id, x, y) => ({ id, x, y });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);

test('one-finger drag moves the image in the same direction without changing zoom', () => {
  const start = startCropGesture(4000, 3000, 300, { centerX: 0.5, centerY: 0.5, zoom: 2 }, [point(1, 150, 150)]);
  const next = moveCropGesture(4000, 3000, 300, start, [point(1, 180, 180)]);
  near(next.centerX, 0.4625); near(next.centerY, 0.45); near(next.zoom, 2);
});

test('two-finger pinch preserves the source point under the fingers while zooming', () => {
  const touches = [point(1, 50, 100), point(2, 150, 100)];
  const start = startCropGesture(4000, 3000, 300, { centerX: 0.5, centerY: 0.5, zoom: 1 }, touches);
  const next = moveCropGesture(4000, 3000, 300, start, [point(1, 0, 100), point(2, 200, 100)]);
  near(next.zoom, 2);
  near(next.centerX * 4000 + (100 - 150) / 0.2, start.anchorX);
  near(next.centerY * 3000 + (100 - 150) / 0.2, start.anchorY);
});

test('pinch can pan and clamps zoom and crop to valid bounds', () => {
  const start = startCropGesture(4000, 3000, 300, { centerX: 0.5, centerY: 0.5, zoom: 2 }, [point(1, 100, 150), point(2, 200, 150)]);
  const zoomed = moveCropGesture(4000, 3000, 300, start, [point(1, -500, 180), point(2, 1000, 180)]);
  near(zoomed.zoom, 4);
  const reduced = moveCropGesture(4000, 3000, 300, start, [point(1, 149, 150), point(2, 151, 150)]);
  near(reduced.zoom, 1);
  near(reduced.centerY, 0.5);
});

test('lifting a finger and rebasing does not jump before the next drag', () => {
  const selection = { centerX: 0.48, centerY: 0.43, zoom: 2 };
  const remaining = [point(2, 190, 120)];
  const start = startCropGesture(4000, 3000, 300, selection, remaining);
  assert.deepEqual(moveCropGesture(4000, 3000, 300, start, remaining), selection);
  assert.equal(cropTouchKey([point(2, 1, 1), point(1, 2, 2)]), cropTouchKey([point(1, 2, 2), point(2, 1, 1)]));
});

test('rectangular template crops pan to the edges without exposing empty space', () => {
  for (const aspectRatio of [2, 0.5]) {
    const width = 1200, height = 1600, previewWidth = 300;
    const selection = { centerX: 0.5, centerY: 0.5, zoom: 1 };
    const touch = [{ id: 1, x: 150, y: previewWidth / aspectRatio / 2 }];
    const start = startCropGesture(width, height, previewWidth, selection, touch, aspectRatio);
    const moved = moveCropGesture(width, height, previewWidth, start, [{ id: 1, x: 2000, y: 2000 }], aspectRatio);
    const { squareCrop } = require('../src/features/photos/square-crop.ts');
    const crop = squareCrop(width, height, moved, aspectRatio);
    assert.equal(crop.width / crop.height, aspectRatio);
    assert.equal(crop.originX, 0);
    assert.equal(crop.originY, 0);
    assert.ok(crop.width <= width && crop.height <= height);
  }
});

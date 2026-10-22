const assert = require('node:assert/strict');
const { test } = require('node:test');
const { checkInTemplates, coverCrop } = require('../src/features/check-in/templates.ts');

test('all templates fill a square without overlapping cells', () => {
  for (const template of checkInTemplates) {
    assert.equal(template.cells.reduce((area, cell) => area + cell.width * cell.height, 0), 1);
    for (const [index, cell] of template.cells.entries()) {
      assert.ok(cell.width > 0 && cell.height > 0 && cell.x >= 0 && cell.y >= 0);
      assert.ok(cell.x + cell.width <= 1 && cell.y + cell.height <= 1);
      for (const other of template.cells.slice(index + 1)) {
        assert.ok(cell.x + cell.width <= other.x || other.x + other.width <= cell.x || cell.y + cell.height <= other.y || other.y + other.height <= cell.y);
      }
    }
  }
});

test('portrait, landscape and square images keep the preview cover crop inside every cell', () => {
  for (const [width, height] of [[1200, 1600], [1600, 900], [1000, 1000]]) {
    for (const template of checkInTemplates) for (const cell of template.cells) {
      const crop = coverCrop(width, height, cell);
      assert.ok(Math.abs(crop.width / crop.height - cell.width / cell.height) < 0.00001);
      assert.ok(crop.originX >= 0 && crop.originY >= 0);
      assert.ok(crop.originX + crop.width <= width && crop.originY + crop.height <= height);
      assert.equal(crop.originX * 2 + crop.width, width);
      assert.equal(crop.originY * 2 + crop.height, height);
    }
  }
  assert.deepEqual(coverCrop(1200, 1600, checkInTemplates[1].cells[0]), { originX: 0, originY: 500, width: 1200, height: 600 });
});

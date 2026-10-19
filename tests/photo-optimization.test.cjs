const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const limits = require('../src/features/photos/limits.ts');
const cropping = require('../src/features/photos/square-crop.ts');

function harness(sizes) {
  const calls = [];
  const rendered = {
    saveAsync: async options => { calls.push(['save', options]); return { uri: `optimized-${calls.length}` }; },
    release: () => calls.push(['release-image']),
  };
  const context = {
    crop: area => calls.push(['crop', area]),
    resize: size => calls.push(['resize', size]),
    renderAsync: async () => rendered,
    release: () => calls.push(['release-context']),
  };
  const output = ts.transpileModule(readFileSync(require.resolve('../src/services/optimize-photo.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require: name => {
    if (name === 'expo-image-manipulator') return { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg' } };
    if (name === '../features/photos/limits') return limits;
    if (name === '../features/photos/square-crop') return cropping;
    if (name === './photo-bytes') return { photoSize: async () => sizes.shift() };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { optimize: module.exports.optimizePickedPhoto, calls };
}
const asset = { uri: 'local-photo', width: 4000, height: 3000, fileSize: 8 * 1024 * 1024, mimeType: 'image/jpeg' };

test('resize preserves aspect ratio, caps the long edge and never enlarges small images', () => {
  assert.deepEqual(limits.photoResize(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(limits.photoResize(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(limits.photoResize(48000, 1), { width: 1600, height: 1 });
  assert.deepEqual(limits.photoResize(1, 48000), { width: 1, height: 1600 });
  assert.equal(limits.photoResize(600, 800), null);
});

test('Expo web resize receives valid dimensions for landscape and portrait images', () => {
  const output = ts.transpileModule(readFileSync(require.resolve('expo-image-manipulator/src/web/actions/ResizeAction.web.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const allocations = [];
  const context = {
    getImageData: (_x, _y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    createImageData: (width, height) => {
      assert.ok(Number.isInteger(width) && width > 0);
      assert.ok(Number.isInteger(height) && height > 0);
      allocations.push([width, height]);
      return { data: new Uint8ClampedArray(width * height * 4) };
    },
    putImageData: () => {},
  };
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module, exports: module.exports,
    require: name => {
      if (name === '../utils.web') return { getContext: () => context };
      throw new Error(`Unexpected import: ${name}`);
    },
    document: { createElement: () => ({ getContext: () => context }) },
  });
  for (const [width, height] of [[2000, 2], [2, 2000]]) {
    const size = limits.photoResize(width, height);
    const result = module.exports.default({ width, height }, size);
    assert.equal(result.width, size.width);
    assert.equal(result.height, size.height);
  }
  assert.deepEqual(allocations, [[1600, 2], [2, 1600]]);
});
test('oversized files and extreme dimensions are rejected before decoding', async () => {
  const h = harness([]);
  await assert.rejects(h.optimize({ ...asset, fileSize: 21 * 1024 * 1024 }), /20 MB/);
  await assert.rejects(h.optimize({ ...asset, width: 10000, height: 10000 }), /48 megapixel/);
  await assert.rejects(h.optimize({ ...asset, mimeType: 'image/svg+xml' }), /JPEG/);
  assert.equal(h.calls.length, 0);
});
test('compression retries until the output fits and releases native image references', async () => {
  const h = harness([3 * 1024 * 1024, 500000]);
  const result = await h.optimize(asset);
  assert.ok(result.uri.startsWith('optimized-'));
  assert.equal(h.calls[0][0], 'resize');
  assert.deepEqual(h.calls.filter(call => call[0] === 'save').map(call => call[1].compress), [0.8, 0.6]);
  assert.deepEqual(h.calls.slice(-2), [['release-image'], ['release-context']]);
});
test('images still exceeding the upload limit are rejected and references are released', async () => {
  const h = harness(Array(3).fill(3 * 1024 * 1024));
  await assert.rejects(h.optimize(asset), /2 MB/);
  assert.deepEqual(h.calls.slice(-2), [['release-image'], ['release-context']]);
});

test('memory photo center crops are square for landscape, portrait and square sources', () => {
  assert.deepEqual(cropping.squareCrop(4000, 3000), { originX: 500, originY: 0, width: 3000, height: 3000 });
  assert.deepEqual(cropping.squareCrop(3000, 4000), { originX: 0, originY: 500, width: 3000, height: 3000 });
  assert.deepEqual(cropping.squareCrop(800, 800), { originX: 0, originY: 0, width: 800, height: 800 });
});

test('user cropping clamps pan and zoom to the source boundaries without empty pixels', () => {
  for (const [width, height] of [[4000, 3000], [3000, 4000], [801, 801], [1, 2000]]) {
    for (const zoom of [0, 1, 2, 4, 9]) {
      for (const center of [-1, 0, 0.5, 1, 2]) {
        const crop = cropping.squareCrop(width, height, { centerX: center, centerY: center, zoom });
        assert.equal(crop.width, crop.height);
        assert.ok(crop.width >= 1);
        assert.ok(crop.originX >= 0 && crop.originY >= 0);
        assert.ok(crop.originX + crop.width <= width);
        assert.ok(crop.originY + crop.height <= height);
        assert.ok(Object.values(crop).every(Number.isInteger));
      }
    }
  }
});

test('memory uploads crop before resizing, while wish covers keep their original aspect ratio', async () => {
  const memory = harness([500000]);
  await memory.optimize(asset, cropping.centeredSquare);
  assert.equal(memory.calls[0][0], 'crop');
  assert.equal(memory.calls[0][1].originX, 500);
  assert.equal(memory.calls[0][1].width, 3000);
  assert.equal(memory.calls[1][0], 'resize');
  assert.deepEqual(memory.calls[1][1], { width: 1600, height: 1600 });
  const cover = harness([500000]);
  await cover.optimize(asset);
  assert.equal(cover.calls.some(call => call[0] === 'crop'), false);
});

test('recropping uses the original selected file and chosen region', async () => {
  const h = harness([500000, 500000]);
  await h.optimize(asset, cropping.centeredSquare);
  await h.optimize(asset, { centerX: 1, centerY: 1, zoom: 2 });
  const crops = h.calls.filter(call => call[0] === 'crop').map(call => call[1]);
  assert.equal(crops[0].width, 3000);
  assert.equal(crops[1].width, 1500);
  assert.equal(crops[1].originX, 2500);
  assert.equal(crops[1].originY, 1500);
});

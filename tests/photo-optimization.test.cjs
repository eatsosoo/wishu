const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const limits = require('../src/features/photos/limits.ts');

function harness(sizes) {
  const calls = [];
  const rendered = {
    saveAsync: async options => { calls.push(['save', options]); return { uri: `optimized-${calls.length}` }; },
    release: () => calls.push(['release-image']),
  };
  const context = {
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
    if (name === './photo-bytes') return { photoSize: async () => sizes.shift() };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { optimize: module.exports.optimizePickedPhoto, calls };
}
const asset = { uri: 'local-photo', width: 4000, height: 3000, fileSize: 8 * 1024 * 1024, mimeType: 'image/jpeg' };

test('resize preserves aspect ratio, caps the long edge and never enlarges small images', () => {
  assert.deepEqual(limits.photoResize(4000, 3000), { width: 1600, height: null });
  assert.deepEqual(limits.photoResize(3000, 4000), { width: null, height: 1600 });
  assert.equal(limits.photoResize(600, 800), null);
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

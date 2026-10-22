const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function harness(fail = false) {
  const calls = []; let renders = 0;
  const context = {
    crop: area => calls.push(['crop', area]), resize: size => calls.push(['resize', size]),
    renderAsync: async () => ++renders === 1 ? { width: 400, height: 200, release: () => calls.push('release-original') } : {
      release: () => calls.push('release-thumbnail'),
      saveAsync: async options => { calls.push(['save', options]); if (fail) throw new Error('encode failed'); return { uri: 'local-thumbnail', base64: 'AQID' }; },
    },
    release: () => calls.push('release-context'),
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/check-in-thumbnail.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: name => name === 'expo-image-manipulator'
    ? { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg' } }
    : { CHECK_IN_THUMBNAIL_SIZE: 144 } });
  return { calls, create: module.exports.createCheckInThumbnail };
}
test('thumbnail center-crops before resizing to 144 square and encodes a separate JPEG', async () => {
  const h = harness();
  assert.equal(await h.create('original'), 'local-thumbnail');
  assert.equal(JSON.stringify(h.calls[0]), JSON.stringify(['crop', { originX: 100, originY: 0, width: 200, height: 200 }]));
  assert.equal(JSON.stringify(h.calls[1]), JSON.stringify(['resize', { width: 144, height: 144 }]));
  assert.equal(h.calls[2][1].format, 'jpeg');
  assert.equal(h.calls[2][1].compress, 0.72);
  assert.deepEqual(h.calls.slice(-3), ['release-thumbnail', 'release-original', 'release-context']);
  assert.equal(await harness().create('original', true), 'data:image/jpeg;base64,AQID');
});
test('thumbnail encoding failures release all native image references', async () => {
  const h = harness(true);
  await assert.rejects(h.create('original'), /encode failed/);
  assert.deepEqual(h.calls.slice(-3), ['release-thumbnail', 'release-original', 'release-context']);
});

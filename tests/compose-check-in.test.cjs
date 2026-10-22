const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { checkInTemplates } = require('../src/features/check-in/templates.ts');

function harness(platform, fail = false) {
  const calls = [];
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/compose-check-in.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: name => {
    if (name === 'react-native') return { Platform: { OS: platform }, PixelRatio: { get: () => 3 } };
    if (name === 'react-native-view-shot') return {
      captureRef: async (view, options) => { calls.push(['capture', view, options]); return 'file:///capture.jpg'; },
      releaseCapture: uri => calls.push(['release', uri]),
    };
    if (name === './optimize-photo') return { optimizePickedPhoto: async asset => { calls.push(['optimize', asset]); if (fail) throw new Error('too large'); return { uri: 'file:///optimized.jpg' }; } };
    throw new Error(name);
  } });
  return { compose: module.exports.composeCheckIn, calls };
}

test('native export targets 1600 physical pixels on both iOS Retina and Android', async () => {
  for (const platform of ['ios', 'android']) {
    const { compose, calls } = harness(platform);
    const view = { current: {} };
    await compose(view, ['photo'], checkInTemplates[0]);
    assert.equal(calls[0][1], view);
    const options = calls[0][2];
    assert.equal(options.width * (platform === 'ios' ? 3 : 1), 1600);
    assert.equal(options.width, options.height);
    assert.equal(calls[1][1].width, 1600);
    assert.equal(calls[2][0], 'release');
  }
});

test('native export rejects missing cells and releases temporary captures on failure', async () => {
  const { compose, calls } = harness('ios', true);
  await assert.rejects(compose({ current: {} }, ['photo'], checkInTemplates[1]), /đủ ảnh/);
  assert.equal(calls.length, 0);
  await assert.rejects(compose({ current: {} }, ['photo'], checkInTemplates[0]), /too large/);
  assert.equal(calls.at(-1)[0], 'release');
});

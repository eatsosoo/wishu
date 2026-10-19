const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(path, requireMock) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(require.resolve(path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: requireMock });
  return module.exports;
}

function layersHarness() {
  let state;
  const react = {
    useState: initial => {
      state ??= initial;
      return [state, update => { state = typeof update === 'function' ? update(state) : update; }];
    },
    useCallback: callback => callback,
  };
  return loadModule('../src/hooks/use-reveal-layers.ts', name => {
    assert.equal(name, 'react'); return react;
  }).useRevealLayers;
}

test('a cold reveal waits for both layers, regardless of load order', () => {
  for (const [first, second] of [[1, 2], [2, 1]]) {
    const render = layersHarness();
    assert.equal(render().ready, false);
    render().loaded(first);
    assert.equal(render().ready, false);
    render().loaded(second);
    assert.equal(render().ready, true);
  }
});

test('a failed layer cannot start the animation; retry requires both fresh loads', () => {
  const render = layersHarness();
  const old = render();
  old.loaded(1); old.failed(); old.loaded(2);
  assert.equal(render().error, true);
  assert.equal(render().ready, false);
  render().retry();
  assert.equal(render().error, false);
  assert.equal(render().attempt, 1);
  old.loaded(1); old.loaded(2); old.failed();
  assert.equal(render().ready, false);
  assert.equal(render().error, false);
  render().loaded(1); render().loaded(2);
  assert.equal(render().ready, true);
});

test('duplicate cache-load events do not make a half-loaded reveal ready', () => {
  const render = layersHarness();
  render().loaded(1); render().loaded(1);
  assert.equal(render().ready, false);
  render().loaded(2);
  assert.equal(render().ready, true);
});

test('gift and jar preloads are separate, deduplicated, and retryable after a network error', async () => {
  const calls = [];
  let rejectGift = true;
  const api = loadModule('../src/components/reveal-artwork.ts', name => {
    if (name === 'expo-image') return { Image: { prefetch: async (urls, policy) => {
      calls.push({ urls: Array.from(urls), policy });
      if (rejectGift && urls[0].includes('gift-body')) throw new Error('Offline');
      return true;
    } } };
    if (name === 'expo-asset') return { Asset: { fromModule: source => ({ uri: source }) } };
    if (name.endsWith('.webp')) return name;
    throw new Error(`Unexpected import: ${name}`);
  });
  const first = api.prefetchRevealArtwork('jar');
  assert.equal(api.prefetchRevealArtwork('jar'), first);
  assert.equal(await first, true);
  assert.equal(await api.prefetchRevealArtwork('gift'), false);
  rejectGift = false;
  assert.equal(await api.prefetchRevealArtwork('gift'), true);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.urls.length === 2 && call.urls.every(url => url.endsWith('.webp')) && call.policy === 'memory-disk'));
});

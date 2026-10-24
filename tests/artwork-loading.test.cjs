const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness(prefetch) {
  const output = ts.transpileModule(readFileSync(require.resolve('../src/components/Artwork.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module, exports: module.exports,
    require: name => {
      if (name === 'expo-image') return { Image: { prefetch } };
      if (name === 'expo-asset') return { Asset: { fromModule: source => ({ uri: source }) } };
      if (name === 'react-native') return {};
      if (name === '../hooks/use-private-photo' || name === '../hooks/use-app-theme' || name === './ui' || name === './WishLoading' || name === './PhotoImage') return {};
      if (/\.(png|webp)$/.test(name)) return name;
      if (name === 'react/jsx-runtime') return require(name);
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return module.exports.prefetchCategoryArtwork;
}

test('screen visits share one prefetch and request only the five small category covers', async () => {
  const requests = [];
  let complete;
  const preload = harness((urls, policy) => {
    requests.push({ urls: Array.from(urls), policy });
    return new Promise(resolve => { complete = resolve; });
  });
  const first = preload();
  assert.equal(preload(), first);
  assert.equal(requests.length, 1);
  assert.equal(new Set(requests[0].urls).size, 5);
  assert.ok(requests[0].urls.every(url => /categories\/.+\.webp$/.test(url)));
  assert.equal(requests[0].policy, 'memory-disk');
  complete(true);
  assert.equal(await first, true);
  assert.equal(await preload(), true);
  assert.equal(requests.length, 1);
});

test('a failed preload can retry when the user revisits the form', async () => {
  let attempts = 0;
  const preload = harness(async () => ++attempts > 1);
  assert.equal(await preload(), false);
  assert.equal(await preload(), true);
  assert.equal(attempts, 2);
});

test('network rejections do not break the form or permanently disable preloading', async () => {
  let attempts = 0;
  const preload = harness(async () => {
    if (++attempts === 1) throw new Error('Offline');
    return true;
  });
  assert.equal(await preload(), false);
  assert.equal(await preload(), true);
});

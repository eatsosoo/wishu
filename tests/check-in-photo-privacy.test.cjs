const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { checkInThumbnailPath, privateCheckInPath, createPrivatePhotoCache } = require('../src/features/check-in/privacy.ts');
const space = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user = '11111111-1111-4111-8111-111111111111';
const storagePath = `${space}/${user}/private.jpg`;
const photo = { uri: `storage://${storagePath}`, storagePath };
const image = 'data:image/jpeg;base64,AQID';

test('only normalized private storage paths in the current space are accepted', () => {
  assert.equal(privateCheckInPath(photo, space), storagePath);
  for (const bad of [
    { uri: 'https://example.com/public.jpg' }, { art: 'bear' },
    { ...photo, storagePath: `other/${user}/private.jpg` },
    { ...photo, storagePath: `${space}/${user}/../private.jpg` },
    { ...photo, storagePath: `${space}/${user}/%2e%2e` },
    { ...photo, storagePath: `${space}/${user}/private.jpg?token=shared` },
  ]) assert.equal(privateCheckInPath(bad, space), null);
});

test('private photo cache deduplicates within a session and clears on logout, space or account change', async () => {
  const cache = createPrivatePhotoCache();
  let count = 0;
  const download = async () => { count++; return image; };
  const read = cache.begin('first:space', new Set([storagePath]));
  await Promise.all([read(storagePath, download), read(storagePath, download)]);
  assert.equal(count, 1);
  cache.clear();
  await assert.rejects(read(storagePath, download), /thay đổi/);
  await cache.begin('second:space', new Set([storagePath]))(storagePath, download);
  assert.equal(count, 2);
  await cache.begin('second:other-space', new Set([storagePath]))(storagePath, download);
  assert.equal(count, 3);
});

test('logout invalidates a pending private download and failures never become reusable cache entries', async () => {
  const cache = createPrivatePhotoCache();
  let complete;
  const read = cache.begin('first:space', new Set([storagePath]));
  const pending = read(storagePath, () => new Promise(resolve => { complete = resolve; }));
  cache.clear(); complete(image);
  await assert.rejects(pending, /thay đổi/);
  const next = cache.begin('second:space', new Set([storagePath]));
  await assert.rejects(next(storagePath, async () => { throw new Error('denied'); }), /denied/);
  assert.equal(await next(storagePath, async () => image), image);
});

function cloudHarness({ fail = false, inputPhoto = photo } = {}) {
  const calls = [];
  const couple = { id: space, actor: 'minh', snapshot: { wishes: [], memories: [], checkIns: [{ id: 'one', photo: inputPhoto }] } };
  const client = {
    functions: { invoke: async (_name, { body }) => { couple.snapshot.checkIns = [{ id: body.input.id, photo: body.input.photo }]; return { data: couple }; } },
    auth: { getUser: async () => ({ data: { user: { id: user } } }), getSession: async () => ({ data: { session: { user: { id: user } } } }) },
    rpc: async () => ({ data: couple }),
    storage: { from: () => ({
      upload: async (path, bytes) => { calls.push(['upload', path, bytes.byteLength]); return { error: null }; },
      download: async (path, _options, parameters) => { assert.equal(parameters.cache, 'no-store'); calls.push(['authenticated-download', path]); return fail === 'missing-thumbnail' && path.endsWith('.thumb-144.jpg') ? { error: { statusCode: '404', message: 'Object not found' } } : fail === true ? { error: new Error('403') } : { data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }) }; },
      createSignedUrls: async paths => { calls.push(['signed', paths]); return { data: [] }; },
    }) },
  };
  class Reader {
    readAsDataURL(blob) { blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload(); }); }
  }
  const output = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/cloud.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, FileReader: Reader, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://test.invalid', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test' } }, require: name => {
    if (name === 'react-native-url-polyfill/auto') return {};
    if (name === '@react-native-async-storage/async-storage') return {};
    if (name === '@supabase/supabase-js') return { createClient: () => client };
    if (name === '../features/check-in/privacy') return { checkInThumbnailPath, privateCheckInPath, createPrivatePhotoCache };
    if (name === '../features/photos/limits') return { PHOTO_LIMITS: {} };
    if (name === '../features/input-validation') return require('../src/features/input-validation.ts');
    if (name === './photo-bytes') return { photoBytes: async () => ({ bytes: new Uint8Array([1,2,3]).buffer, type: 'image/jpeg' }) };
    if (name === './check-in-thumbnail') return { createCheckInThumbnail: async (_uri, inline) => inline ? image : 'local-thumbnail' };
    throw new Error(name);
  } });
  return { cloud: module.exports, calls };
}

test('metadata loads without image downloads; thumbnail and full size load independently on demand', async () => {
  const h = cloudHarness();
  const result = await h.cloud.loadCloudCouple();
  assert.equal(result.snapshot.checkIns[0].photo.private, true);
  assert.equal(result.snapshot.checkIns[0].photo.uri, photo.uri);
  assert.equal(h.calls.length, 0, 'RPC must not wait for any check-in image');
  const scope = `${user}:${space}`;
  assert.equal(await h.cloud.loadPrivatePhoto(photo, 'thumbnail', scope), image);
  assert.deepEqual(h.calls, [['authenticated-download', checkInThumbnailPath(storagePath)]]);
  await h.cloud.loadCloudCouple();
  await h.cloud.loadPrivatePhoto(photo, 'thumbnail', scope);
  assert.equal(h.calls.length, 1, 'refresh must reuse the session thumbnail cache');
  await h.cloud.loadPrivatePhoto(photo, 'full', scope);
  assert.deepEqual(h.calls[1], ['authenticated-download', storagePath]);
  h.cloud.clearPrivatePhotos();
  await assert.rejects(h.cloud.loadPrivatePhoto(photo, 'full', scope), /thay đổi/);
  await h.cloud.loadCloudCouple();
  await h.cloud.loadPrivatePhoto(photo, 'full', scope);
  assert.equal(h.calls.length, 3);
});

test('denied downloads never fall back to full or signed/public links', async () => {
  const denied = cloudHarness({ fail: true });
  await denied.cloud.loadCloudCouple();
  await assert.rejects(denied.cloud.loadPrivatePhoto(photo, 'thumbnail', `${user}:${space}`), /ảnh riêng tư/);
  assert.deepEqual(denied.calls, [['authenticated-download', checkInThumbnailPath(storagePath)]]);
  const legacy = cloudHarness({ inputPhoto: { uri: 'https://example.com/public.jpg' } });
  await assert.rejects(legacy.cloud.loadCloudCouple(), /chọn lại/);
  assert.equal(legacy.calls.length, 0);
});

test('missing derivatives from older clients get a private local thumbnail fallback', async () => {
  const h = cloudHarness({ fail: 'missing-thumbnail' });
  await h.cloud.loadCloudCouple();
  assert.equal(await h.cloud.loadPrivatePhoto(photo, 'thumbnail', `${user}:${space}`), image);
  assert.deepEqual(h.calls, [['authenticated-download', checkInThumbnailPath(storagePath)], ['authenticated-download', storagePath]]);
});

test('saving a newly picked check-in uploads both originals and deterministic private thumbnails before committing', async () => {
  const h = cloudHarness();
  const saved = await h.cloud.cloudCommand({ kind: 'checkIn', input: { id: 'new', title: 'Đà Lạt', latitude: 11.94, longitude: 108.44, visitedAt: '2026-10-22', companion: '', note: '', photo: { uri: 'file:///local-photo.jpg' } } });
  const uploads = h.calls.filter(([kind]) => kind === 'upload');
  assert.equal(uploads.length, 2);
  assert.equal(uploads[1][1], checkInThumbnailPath(uploads[0][1]));
  assert.ok(uploads[0][1].startsWith(`${space}/${user}/`));
  assert.equal(saved.snapshot.checkIns[0].photo.storagePath, uploads[0][1]);
  assert.equal(h.calls.some(([kind]) => kind === 'authenticated-download'), false);
});

test('invalid check-in input fails before uploading any photo', async () => {
  const h = cloudHarness();
  await assert.rejects(h.cloud.cloudCommand({ kind: 'checkIn', input: { id: 'bad', photo: { uri: 'file:///local-photo.jpg' } } }));
  assert.equal(h.calls.length, 0);
});

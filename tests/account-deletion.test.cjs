const assert = require('node:assert/strict');
const { test } = require('node:test');
const { deleteAccountData } = require('../supabase/functions/_shared/delete-account.ts');

test('removes every photo batch before deleting only the authenticated user', async () => {
  const events = [];
  const batches = [['couple/user/a.jpg', 'couple/partner/b.jpg'], ['couple/user/c.jpg'], []];
  await deleteAccountData('user', {
    prepare: async id => { events.push(['prepare', id]); },
    photos: async id => { assert.equal(id, 'user'); return batches.shift(); },
    removePhotos: async paths => { events.push(['photos', paths]); },
    deleteUser: async id => { events.push(['auth', id]); },
  });
  assert.deepEqual(events, [
    ['prepare', 'user'],
    ['photos', ['couple/user/a.jpg', 'couple/partner/b.jpg']],
    ['photos', ['couple/user/c.jpg']],
    ['auth', 'user'],
  ]);
});

for (const stage of ['prepare', 'photos', 'removePhotos']) {
  test(`a ${stage} failure preserves Auth for a retry`, async () => {
    let deleted = false;
    const backend = {
      prepare: async () => {},
      photos: async () => ['couple/user/a.jpg'],
      removePhotos: async () => {},
      deleteUser: async () => { deleted = true; },
    };
    backend[stage] = async () => { throw new Error('offline'); };
    await assert.rejects(deleteAccountData('user', backend), /offline/);
    assert.equal(deleted, false);
  });
}

test('a retry resumes after partial photo cleanup and an Auth failure', async () => {
  const remaining = new Set(['a.jpg', 'b.jpg']);
  let attempts = 0;
  let removed = 0;
  const backend = {
    prepare: async () => {},
    photos: async () => [...remaining].slice(0, 1),
    removePhotos: async paths => { paths.forEach(path => remaining.delete(path)); removed += paths.length; },
    deleteUser: async id => { assert.equal(id, 'user'); if (++attempts === 1) throw new Error('Auth unavailable'); },
  };
  await assert.rejects(deleteAccountData('user', backend), /Auth unavailable/);
  await deleteAccountData('user', backend);
  assert.equal(removed, 2);
  assert.equal(attempts, 2);
});

test('an account without uploaded photos can be deleted', async () => {
  let deleted = false;
  await deleteAccountData('unpaired-user', {
    prepare: async () => {},
    photos: async () => [],
    removePhotos: async () => assert.fail('no photos to remove'),
    deleteUser: async id => { assert.equal(id, 'unpaired-user'); deleted = true; },
  });
  assert.equal(deleted, true);
});

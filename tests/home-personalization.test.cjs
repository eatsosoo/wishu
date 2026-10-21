const assert = require('node:assert/strict');
const { test } = require('node:test');
const { homeJarMembers, localGreeting } = require('../src/features/couple/selectors.ts');

test('home jars follow gender instead of creator/partner roles without changing member identities', () => {
  const members = [
    { id: 'minh', name: 'First', gender: 'female' },
    { id: 'linh', name: 'Second', gender: 'male' },
  ];
  const ordered = homeJarMembers(members);
  assert.strictEqual(ordered[0], members[1]);
  assert.strictEqual(ordered[1], members[0]);
  assert.equal(members[0].id, 'minh');
  assert.deepEqual(homeJarMembers(ordered), ordered);
});

test('other and unset genders keep stable positions while male/female placement takes precedence', () => {
  for (const gender of [undefined, 'other', 'male', 'female']) {
    const members = [{ id: 'minh', name: 'A', gender }, { id: 'linh', name: 'B', gender }];
    assert.deepEqual(homeJarMembers(members), members);
  }
  assert.equal(homeJarMembers([{ id: 'minh', name: 'A', gender: 'female' }, { id: 'linh', name: 'B' }])[1].id, 'minh');
  assert.equal(homeJarMembers([{ id: 'minh', name: 'A', gender: 'other' }, { id: 'linh', name: 'B', gender: 'male' }])[0].id, 'linh');
});

test('greetings use local time at every morning/noon/afternoon/evening/night boundary', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'đêm'], [4, 59, 'đêm'], [5, 0, 'sáng'], [10, 59, 'sáng'],
    [11, 0, 'trưa'], [12, 59, 'trưa'], [13, 0, 'chiều'], [17, 59, 'chiều'],
    [18, 0, 'tối'], [22, 59, 'tối'], [23, 0, 'đêm'], [23, 59, 'đêm'],
  ]) assert.equal(localGreeting(new Date(2026, 9, 21, hour, minute)), `Chào buổi ${expected},`);
});

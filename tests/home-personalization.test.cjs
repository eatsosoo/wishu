const assert = require('node:assert/strict');
const { test } = require('node:test');
const { homeJarMembers, homeJarSlots, localGreeting } = require('../src/features/couple/selectors.ts');

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

test('all gender combinations get independent characters in inward-facing left/right slots', () => {
  for (const first of ['male', 'female', 'other', undefined]) {
    for (const second of ['male', 'female', 'other', undefined]) {
      const members = [{ id: 'minh', name: 'A', gender: first, joined: true }, { id: 'linh', name: 'B', gender: second, joined: true }];
      const slots = homeJarSlots(members);
      assert.deepEqual(slots.map(slot => slot.side), ['left', 'right']);
      assert.equal(new Set(slots.map(slot => slot.member.id)).size, 2);
      for (const slot of slots) {
        assert.strictEqual(slot.member, members.find(member => member.id === slot.member.id));
        assert.equal(slot.appearance, slot.member.gender === 'male' || slot.member.gender === 'female' ? slot.member.gender : 'neutral');
      }
    }
  }
});

test('an unjoined partner becomes a silhouette instead of a gender assumption', () => {
  for (const gender of ['male', 'female', 'other', undefined]) {
    const owner = { id: 'minh', name: 'A', gender, joined: true };
    const slots = homeJarSlots([owner, { id: 'linh', name: 'Người ấy', joined: false }]);
    const own = slots.find(slot => slot.member);
    assert.strictEqual(own.member, owner);
    assert.equal(own.side, gender === 'female' ? 'right' : 'left');
    const waiting = slots.find(slot => !slot.member);
    assert.equal(waiting.appearance, 'waiting');
    assert.notEqual(waiting.side, own.side);
  }
});

test('joining replaces the silhouette even if the new member has no gender or uses the placeholder name', () => {
  const owner = { id: 'minh', name: 'A', gender: 'male', joined: true };
  const slots = homeJarSlots([owner, { id: 'linh', name: 'Người ấy', joined: true }]);
  assert.equal(slots[1].appearance, 'neutral');
  assert.equal(slots[1].member.id, 'linh');
  assert.equal(homeJarSlots([owner])[1].appearance, 'waiting');
  assert.deepEqual(homeJarSlots([]).map(slot => slot.appearance), ['waiting', 'waiting']);
});

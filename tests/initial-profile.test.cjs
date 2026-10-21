const assert = require('node:assert/strict');
const { test } = require('node:test');
const { completeProfile, readProfile } = require('../src/features/auth/profile.ts');

const today = new Date(2026, 9, 21);
test('initial profile requires an actual gender and a valid, nonfuture birth date', () => {
  for (const gender of ['male', 'female', 'other']) {
    assert.equal(completeProfile({ gender, birthDate: '2000-02-29' }, today), true);
  }
  assert.equal(completeProfile({ gender: 'other', birthDate: '2026-10-21' }, today), true);
  for (const value of [null, {}, { gender: 'male' }, { birthDate: '2000-01-01' },
    { gender: null, birthDate: '2000-01-01' }, { gender: 'invalid', birthDate: '2000-01-01' },
    ...['', '2001-02-29', '2000-13-01', '2026-10-22', '1899-12-31', '01/01/2000', 123].map(birthDate => ({ birthDate, gender: 'male' }))]) {
    assert.equal(completeProfile(value, today), false, JSON.stringify(value));
  }
});

test('account metadata is read safely and keeps partially completed profiles', () => {
  assert.deepEqual(readProfile({ birthDate: '2000-01-01', gender: 'female' }), { birthDate: '2000-01-01', gender: 'female' });
  assert.deepEqual(readProfile({ birthDate: '2000-01-01' }), { birthDate: '2000-01-01', gender: null });
  for (const value of [null, 'invalid', { birthDate: 123, gender: 'invalid' }]) {
    assert.deepEqual(readProfile(value), { birthDate: null, gender: null });
  }
});

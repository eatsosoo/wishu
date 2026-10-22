const assert = require('node:assert/strict');
const { test } = require('node:test');
const { defaultAvatar, defaultAvatarForGender, optionsForGender, normalizeAvatarForGender, parseAvatar, randomAvatar } = require('../src/features/avatar/catalog.ts');

test('dress is available for female profiles and follows the shared unspecified-gender policy', () => {
  for (const gender of ['female', 'other', null]) {
    assert.ok(optionsForGender('outfit', gender).some(option => option.id === 'dressRose'));
  }
  assert.ok(!optionsForGender('outfit', 'male').some(option => option.id === 'dressRose'));
  assert.deepEqual(optionsForGender('outfit', 'female').map(option => option.id), ['dressRose']);
  assert.deepEqual(optionsForGender('outfit', 'male').map(option => option.id), ['rose', 'sage', 'lavender']);
});

test('existing female avatars switch to a dress while preserving all other customizations', () => {
  for (const outfit of ['rose', 'sage', 'lavender', 'dressRose']) {
    const config = { ...defaultAvatar, outfit, skin: 'deep', hair: 'spaceBuns', hairColor: 'caramel', eyes: 'smile', glasses: 'round' };
    assert.deepEqual(parseAvatar(JSON.stringify(config)), config);
    const normalized = normalizeAvatarForGender(config, 'female');
    assert.deepEqual(normalized, { ...config, outfit: 'dressRose' });
    assert.deepEqual(normalizeAvatarForGender(normalized, 'female'), normalized);
  }
  assert.equal(normalizeAvatarForGender({ ...defaultAvatar, outfit: 'dressRose' }, 'male').outfit, 'sage');
});

test('new female avatars start in a dress, and other profile defaults stay unchanged', () => {
  assert.equal(defaultAvatarForGender('female').outfit, 'dressRose');
  assert.equal(defaultAvatarForGender('male').outfit, 'sage');
  for (const gender of ['other', null]) assert.equal(defaultAvatarForGender(gender).outfit, 'lavender');
});

test('random outfits respect the same gender eligibility as manual selection', () => {
  for (const gender of ['male', 'female', 'other', null]) {
    const allowed = new Set(optionsForGender('outfit', gender).map(option => option.id));
    for (let i = 0; i < 25; i++) assert.ok(allowed.has(randomAvatar(gender).outfit));
  }
});

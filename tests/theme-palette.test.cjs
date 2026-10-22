const { test } = require('node:test');
const assert = require('node:assert/strict');
const { themes, mapThemeColor, isThemeId } = require('../src/features/theme/palette.ts');
const { colors } = require('../src/constants/design-tokens.cjs');

function luminance(hex) {
  return hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('monochrome has neutral colors and readable text on dark surfaces and accent buttons', () => {
  const c = themes.monochrome.colors;
  for (const value of Object.values(c)) assert.equal(new Set(value.slice(1).match(/../g)).size, 1);
  for (const background of [c.background, c.surface, c.rose]) {
    for (const foreground of [c.ink, c.muted, c.primary, c.burgundy]) assert.ok(contrast(background, foreground) >= 4.5, `${foreground} on ${background}`);
  }
  assert.ok(contrast(c.primary, c.onPrimary) >= 7);
});

test('legacy palette colors map to the chosen theme without recoloring white photo overlays', () => {
  for (const id of Object.keys(themes)) {
    for (const [key, value] of Object.entries(colors)) assert.equal(mapThemeColor(value, id), themes[id].colors[key]);
  }
  assert.equal(mapThemeColor('#FFFDFC', 'monochrome'), themes.monochrome.colors.surface);
  assert.equal(mapThemeColor('#222222', 'monochrome'), themes.monochrome.colors.ink);
  assert.equal(mapThemeColor('#FFFFFF', 'monochrome'), '#FFFFFF');
  assert.equal(mapThemeColor('rgba(73,37,47,0.25)', 'monochrome'), 'rgba(0,0,0,0.25)');
  assert.equal(mapThemeColor('rgba(255,250,247,0.76)', 'monochrome'), 'rgba(28,28,28,0.76)');
});

test('stored theme IDs accept the new theme and reject unknown or inherited keys', () => {
  for (const id of Object.keys(themes)) assert.equal(isThemeId(id), true);
  for (const id of [null, undefined, '', 'dark', '__proto__', 'toString']) assert.equal(isThemeId(id), false);
});

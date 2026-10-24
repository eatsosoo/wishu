// Real MapLibre renderer with local style data; no account or production writes.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mapDocument } = require('../src/features/check-in/map-document.ts');
const { colors } = require('../src/constants/design-tokens.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://tiles.openfreemap.org/styles/positron', route => route.fulfill({ json: {
      version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#fff' } }],
    } }));
    await page.setContent(mapDocument());
    await page.waitForFunction(() => !!window.maplibregl);
    await page.evaluate(colors => window.receiveMapConfig({ colors, items: [{ id: 'saved', title: 'Sau khi lưu', latitude: 11.94, longitude: 108.44, uri: '' }] }), colors);
    await page.getByRole('button', { name: 'Xem kỷ niệm Sau khi lưu', exact: true }).waitFor();
    await page.waitForFunction(() => map.loaded());
    await page.evaluate(() => {
      window.metrics = { renders: 0, data: 0, paint: 0 };
      map.on('render', () => window.metrics.renders++);
      const source = map.getSource('checkins');
      const setData = source.setData.bind(source);
      source.setData = (...args) => { window.metrics.data++; return setData(...args); };
      const setPaint = map.setPaintProperty.bind(map);
      map.setPaintProperty = (...args) => { window.metrics.paint++; return setPaint(...args); };
      for (let i = 0; i < 30; i++) window.receiveMapConfig({ ...config, viewport: { center: [108.44, 11.94], zoom: 15 } });
    });
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => ({ ...window.metrics }));
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => ({ ...window.metrics }));
    assert.equal(after.data, 0, 'Viewport feedback must not trigger worker clustering');
    assert.equal(after.paint, 0, 'Viewport feedback must not restyle the map');
    assert.equal(after.renders, before.renders, 'The stationary map must stop rendering');
    const uri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    await page.evaluate(uri => window.receiveMapConfig({ ...config, items: [{ ...config.items[0], uri }] }), uri);
    assert.equal(await page.locator('.pin img').getAttribute('src'), uri);
    assert.equal(await page.evaluate(() => window.metrics.data), 0, 'Thumbnail arrival must not recluster');
    await page.evaluate(() => {
      window.messages = [];
      window.ReactNativeWebView = { postMessage: text => window.messages.push(JSON.parse(text)) };
    });
    await page.getByRole('button', { name: 'Xem kỷ niệm Sau khi lưu', exact: true }).click();
    assert.equal(await page.evaluate(() => window.messages.some(message => message.type === 'open' && message.id === 'saved')), true);
    await page.evaluate(() => window.receiveMapConfig({ ...config, picking: true, selected: { latitude: 11.94, longitude: 108.44 } }));
    await page.mouse.click(50, 50);
    assert.equal(await page.evaluate(() => window.messages.some(message => message.type === 'pick')), true);
    assert.deepEqual(errors, []);
    console.log('PASS: real MapLibre stops rendering while idle; 30 viewport updates and thumbnail arrival cause zero reclustering/restyling; pin open and location picking work.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

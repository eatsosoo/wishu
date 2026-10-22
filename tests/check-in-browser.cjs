// Local browser integration: real app + real map renderer + isolated SQL database.
// Usage: export web to tmp/check-in-web, then NODE_PATH=<playwright modules> node this-file.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');
const { mapDocument } = require('../src/features/check-in/map-document.ts');
const { colors } = require('../src/constants/design-tokens.cjs');

(async () => {
  const h = await database();
  await h.db.exec("update wish_members set birth_date='2000-01-01',gender='other'");
  const output = path.resolve(__dirname, '../tmp/check-in-web');
  const icon = fs.readFileSync(path.resolve(__dirname, '../assets/icon.png'));
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/test-photo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(icon); return; }
    const candidate = path.resolve(output, '.' + decodeURIComponent(pathname));
    if (path.relative(output, candidate).startsWith('..')) { res.writeHead(403).end(); return; }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(output, 'index.html');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  const cloudUrl = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
  const storageKey = `sb-${new URL(cloudUrl).hostname.split('.')[0]}-auth-token`;
  const user = { id: users[0], aud: 'authenticated', role: 'authenticated', email: 'test@example.com', user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() };
  const token = ['e30', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test'].join('.');
  const session = { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['geolocation'], geolocation: { latitude: 11.94, longitude: 108.44 } });
    await context.addInitScript(({ storageKey, session }) => { if (window.top !== window) return; localStorage.setItem('ourwish:onboarded', 'yes'); localStorage.setItem(storageKey, JSON.stringify(session)); }, { storageKey, session });
    await context.route(`${cloudUrl}/**`, async route => {
      const url = route.request().url();
      if (url.includes('/storage/v1/object/sign/') && route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'image/png', body: icon }); return; }
      let body = {};
      if (url.includes('/auth/v1/user')) body = user;
      else if (url.includes('/rest/v1/rpc/get_my_couple')) body = await h.state(users[0]);
      else if (url.includes('/functions/v1/wish-action')) {
        await h.command(users[0], route.request().postDataJSON()); body = await h.state(users[0]);
      } else if (url.includes('/storage/v1/object/sign/')) {
        const request = route.request().postDataJSON(); body = request.paths.map(name => ({ path: name, signedURL: `/object/sign/wish-photos/${name}`, error: null }));
      } else if (url.includes('/storage/v1/object/')) body = { Key: 'wish-photos/test-photo.png' };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' || message.text().startsWith('Map ')) console.log('Browser:', message.text().slice(0, 300)); });
    const pending = new Set(); page.on('request', request => pending.add(request.url())); page.on('requestfinished', request => pending.delete(request.url()));
    const networkErrors = []; page.on('requestfailed', request => { pending.delete(request.url()); networkErrors.push(`${new URL(request.url()).hostname}: ${request.failure()?.errorText}`); });
    await page.goto(`${base}/check-in-map`);
    await page.getByText('Thêm kỷ niệm đầu tiên', { exact: false }).waitFor({ timeout: 45000 }).catch(async error => { console.log('UI', await page.locator('body').innerText(), 'ERRORS', errors); throw error; });
    await page.getByRole('button', { name: 'Thêm kỷ niệm đầu tiên', exact: false }).click();
    await page.getByRole('button', { name: 'Dùng vị trí hiện tại', exact: false }).click();
    await page.getByText('11.94000, 108.44000', { exact: false }).waitFor();
    await page.getByLabel('Tên địa điểm *', { exact: true }).fill('Đà Lạt của hai đứa');
    await page.getByLabel('Lời nhắn', { exact: true }).fill('Một ngày thật vui ♡');
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Chọn ảnh check-in', exact: true }).click();
    await (await chooserPromise).setFiles(path.resolve(__dirname, '../assets/icon.png'));
    await page.getByText('Chạm để đổi ảnh', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chỉnh vùng cắt ảnh check-in', exact: true }).click();
    const cropFrame = page.getByLabel('Vùng cắt ảnh hình vuông', { exact: true });
    await cropFrame.waitFor();
    await cropFrame.click({ trial: true }); // Wait for the modal's slide animation to settle.
    await cropFrame.evaluate(async element => {
      const animations = [];
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) animations.push(...ancestor.getAnimations());
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    });
    const area = await cropFrame.boundingBox();
    const cropHeader = page.getByTestId('subpage-header').filter({ hasText: 'Chọn vùng ảnh' });
    assert.equal(Math.round((await cropHeader.boundingBox()).height), 64, 'Crop modal should use the shared header');
    await cropHeader.getByRole('button', { name: 'Đóng chỉnh ảnh', exact: true }).waitFor();
    assert.ok(area.width > 320, 'Crop preview should use the available text width');
    const cdp = await context.newCDPSession(page);
    const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: center.x - 35, y: center.y }, { id: 2, x: center.x + 35, y: center.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: center.x - 70, y: center.y }, { id: 2, x: center.x + 70, y: center.y }] });
    await page.getByText('2.00×', { exact: true }).waitFor().catch(async error => { await page.screenshot({ path: 'tmp/screenshots/check-in-crop-error.png', fullPage: true }); console.log('Crop UI', await page.locator('body').innerText()); throw error; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    assert.deepEqual(await cropFrame.boundingBox(), area, 'Pinching must not move the crop viewport');
    const transformsBefore = await cropFrame.locator('div').evaluateAll(elements => elements.map(element => element.style.transform).filter(Boolean));
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 25, { steps: 5 });
    await page.mouse.up();
    const transformsAfter = await cropFrame.locator('div').evaluateAll(elements => elements.map(element => element.style.transform).filter(Boolean));
    assert.notDeepEqual(transformsAfter, transformsBefore, 'Mouse dragging must still pan the image');
    assert.deepEqual(await cropFrame.boundingBox(), area, 'Dragging must not move the crop viewport');
    await page.screenshot({ path: 'tmp/screenshots/check-in-crop.png', fullPage: true });
    await page.getByRole('button', { name: 'Dùng vùng ảnh này', exact: true }).click();
    await page.getByText('Chọn vùng ảnh', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Lưu kỷ niệm', exact: true }).click();
    await page.getByText('Đã lưu một dấu chân của hai đứa ♡', { exact: true }).waitFor();
    assert.equal((await h.state(users[1])).snapshot.checkIns.length, 1);
    await page.getByRole('img', { name: 'Ảnh check-in tại Đà Lạt của hai đứa' }).waitFor();
    await page.locator('iframe:visible').last().scrollIntoViewIfNeeded();
    const debugFrame = page.frames().at(-1);
    await debugFrame.waitForFunction(() => typeof map !== 'undefined' && typeof map.on === 'function');
    await debugFrame.evaluate(() => { map.on('error', event => console.log('Map actual error', event.error?.message)); });
    await page.frameLocator('iframe:visible').last().getByRole('button', { name: 'Xem kỷ niệm Đà Lạt của hai đứa', exact: true }).waitFor({ timeout: 30000 }).catch(async error => {
      console.log('Map diagnostics', await page.frames().at(-1).evaluate(() => ({ text: document.body.innerText, renderer: typeof maplibregl, ready: typeof ready === 'boolean' && ready, configured: typeof config !== 'undefined', items: typeof config !== 'undefined' && config?.items?.length, styleLoaded: map?.isStyleLoaded(), canvas: !!map?.getCanvas(), style: map?.getStyle()?.name, sources: Object.keys(map?.getStyle()?.sources || {}), features: typeof map !== 'undefined' && map?.getSource('checkins') ? map.querySourceFeatures('checkins').length : -1 })), errors, networkErrors.slice(-8));
      console.log('Pending maps', [...pending].filter(url => url.includes('tiles.openfreemap.org')));
      console.log('Style internals', await debugFrame.evaluate(() => ({ visible: document.visibilityState, size: [innerWidth, innerHeight], container: [map.getContainer().clientWidth,map.getContainer().clientHeight], loaded: map.style._loaded, styleKeys: Object.keys(map.style), sources: Object.fromEntries(Object.keys(map.getStyle().sources).map(id => [id,{ loaded:map.isSourceLoaded(id), sourceKeys:Object.keys(map.getSource(id)), tiles:map.getSource(id).tiles }])) })));
      await page.screenshot({ path: 'tmp/screenshots/check-in-error.png', fullPage: true }); throw error;
    });
    await page.screenshot({ path: 'tmp/screenshots/check-in-detail.png', fullPage: true });
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    const frame = page.frameLocator('iframe:visible').last();
    await frame.getByRole('button', { name: 'Xem kỷ niệm Đà Lạt của hai đứa', exact: true }).waitFor({ timeout: 45000 });
    const pinGeometry = await frame.locator('.pin').first().evaluate(pin => {
      const image = pin.querySelector('img').getBoundingClientRect();
      const button = pin.getBoundingClientRect();
      const arrow = getComputedStyle(pin, '::after');
      return { imageBottom: image.bottom - button.top, arrowTop: parseFloat(arrow.top), arrowHeight: parseFloat(arrow.borderTopWidth), height: button.height };
    });
    assert.ok(pinGeometry.arrowTop >= pinGeometry.imageBottom, 'Marker triangle must sit below the photo');
    assert.equal(pinGeometry.arrowTop + pinGeometry.arrowHeight, pinGeometry.height, 'Triangle tip must align with the map anchor');
    const attribution = frame.locator('#map-attribution');
    assert.equal(await attribution.getAttribute('open'), null, 'Map credits should start compact');
    await attribution.locator('summary').click();
    await attribution.getByRole('link', { name: '© OpenMapTiles', exact: true }).waitFor();
    await attribution.getByRole('link', { name: 'OpenStreetMap', exact: true }).waitFor();
    assert.equal(await attribution.getByRole('link', { name: 'OpenFreeMap', exact: true }).count(), 0);
    await attribution.locator('summary').click();
    await page.screenshot({ path: 'tmp/screenshots/check-in-map.png', fullPage: true });
    await frame.getByRole('button', { name: 'Xem kỷ niệm Đà Lạt của hai đứa', exact: true }).click();
    await page.getByText('Một ngày thật vui ♡', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sửa check-in', exact: true }).click();
    await page.getByLabel('Lời nhắn', { exact: true }).fill('Đã sửa lời nhắn');
    await page.getByRole('button', { name: 'Lưu kỷ niệm', exact: true }).click();
    await page.getByText('Đã sửa lời nhắn', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xoá check-in', exact: true }).click();
    await page.getByRole('button', { name: 'Xoá check-in', exact: true }).last().click();
    await page.getByText('Thêm kỷ niệm đầu tiên', { exact: false }).waitFor();
    assert.equal((await h.state(users[1])).snapshot.checkIns.length, 0);

    // The shared header must stay outside scrolling content on every subpage.
    const routes = ['/wish/new', '/wish/bear', '/preparing', '/wish/bear/complete', '/notifications', '/avatar', '/memory-day/2026-10-22', '/memory/missing', '/gift/missing', '/check-in/new', '/check-in-map'];
    for (const route of routes) {
      await page.goto(`${base}${route}`);
      const header = page.locator('[data-testid="subpage-header"]:visible');
      await header.waitFor();
      const before = await header.boundingBox();
      assert.equal(before.height, 64, `${route}: shared header height`);
      const content = page.locator('[data-testid="screen-scroll"]:visible');
      await content.evaluate(element => { element.scrollTop = 500; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.deepEqual(await header.boundingBox(), before, `${route}: header moved with the content`);
      assert.equal(await header.getByRole('button').first().isVisible(), true, `${route}: back button remains visible`);
      if (route === '/wish/new') {
        assert.ok(await content.evaluate(element => element.scrollTop > 0), 'The form should actually scroll under its header');
        await page.screenshot({ path: 'tmp/screenshots/sticky-subpage-header.png', fullPage: true });
      }
    }

    // Exercise real OpenFreeMap tiles, clustering, theme switching and picking.
    await page.setContent(mapDocument());
    await page.evaluate(({ colors, base }) => window.receiveMapConfig({ colors, picking: true, items: [0, 1].map(i => ({ id: `p${i}`, title: `Kỷ niệm ${i}`, latitude: 11.94 + i * 0.0001, longitude: 108.44, uri: `${base}/test-photo.png` })) }), { colors, base });
    await page.getByRole('button', { name: '2 kỷ niệm, chạm để phóng to', exact: true }).waitFor({ timeout: 45000 });
    await page.getByRole('button', { name: '2 kỷ niệm, chạm để phóng to', exact: true }).click();
    await page.getByRole('button', { name: 'Xem kỷ niệm Kỷ niệm 0', exact: true }).waitFor();
    const themeColor = '#62846C';
    await page.evaluate(themeColor => {
      window.receiveMapConfig({ ...config, colors: { ...config.colors, primary: themeColor, background: '#EEF4EE' } });
    }, themeColor);
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--accent')), themeColor);
    assert.equal(await page.evaluate(() => map.getPaintProperty(map.getStyle().layers.find(layer => layer.type === 'background').id, 'background-color')), '#EEF4EE');
    await page.evaluate(() => { window.__mapMessages = []; window.ReactNativeWebView = { postMessage: text => window.__mapMessages.push(JSON.parse(text)) }; });
    await page.locator('canvas').click({ position: { x: 100, y: 100 } });
    assert.ok(await page.evaluate(() => window.__mapMessages.some(message => message.type === 'pick' && Number.isFinite(message.latitude))));
    assert.deepEqual(errors, []);
    console.log('PASS: 11 sticky subpage headers; pinch zoom, mouse pan and fixed crop viewport; check-in CRUD, map clustering, theme changes and picking.');
  } finally { await browser.close(); await h.db.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

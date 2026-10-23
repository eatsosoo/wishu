// Camera integration: export web to tmp/check-in-camera-web, then run with Playwright.
// Set CHROME_PATH if Chrome is installed outside the default macOS location.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { database, users, coupleId } = require('./helpers/relational-db.cjs');

(async () => {
  const h = await database();
  await h.db.exec("update wish_members set birth_date='2000-01-01',gender='other'");
  const output = path.resolve(__dirname, '../tmp/check-in-camera-web');
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
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['geolocation', 'camera'], geolocation: { latitude: 11.94, longitude: 108.44 } });
    await context.addInitScript(({ storageKey, session }) => { if (window.top !== window) return; localStorage.setItem('ourwish:onboarded', 'yes'); localStorage.setItem(storageKey, JSON.stringify(session)); }, { storageKey, session });
    await context.route(`${cloudUrl}/**`, async route => {
      const url = route.request().url();
      if (url.includes('/storage/v1/object/') && route.request().method() === 'GET') { await route.fulfill({ status: 200, contentType: 'image/png', body: icon }); return; }
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
    await page.addInitScript(() => {
      const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      window.locationRequests = 0;
      navigator.geolocation.getCurrentPosition = (success, failure, options) => {
        window.locationRequests++;
        if (window.holdLocation) window.finishLocation = () => success({ coords: { latitude: 11.94, longitude: 108.44, accuracy: 10 }, timestamp: Date.now() });
        else original(success, failure, options);
      };
    });
    async function mapFrame(target) {
      const frame = await (await target.locator('iframe[title="Bản đồ kỷ niệm"]').elementHandle()).contentFrame();
      await frame.evaluate(() => {
        window.addEventListener('message', event => { if (event.data?.type === 'config') window.testConfig = event.data.config; });
        parent.postMessage(JSON.stringify({ type: 'ready' }), '*');
      });
      await frame.waitForFunction(() => window.testConfig);
      return frame;
    }
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const next = () => page.getByRole('button', { name: 'Dùng ảnh này · Tiếp tục', exact: true });
    const shutter = () => page.getByRole('button', { name: 'Chụp ảnh check-in', exact: true });
    async function enabled(button) {
      await button.locator('xpath=self::*[not(@aria-disabled="true")]').waitFor().catch(async error => { console.log('UI', await page.locator('body').innerText(), 'ERRORS', errors); await page.screenshot({ path: 'tmp/screenshots/check-in-camera-error.png', fullPage: true }); throw error; });
      assert.equal(await button.isEnabled(), true);
    }
    async function upload(file) {
      const before = await page.getByRole('slider').locator('img').evaluateAll(images => images.map(image => image.src));
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Chọn ảnh từ thư viện', exact: true }).click();
      await (await chooser).setFiles(file);
      await page.waitForFunction(previous => [...document.querySelectorAll('[role="slider"] img')].some(image => !previous.includes(image.src)), before);
    }
    await page.goto(`${base}/check-in/new`);
    await page.getByRole('button', { name: 'Template Một ảnh', exact: true }).waitFor({ timeout: 45000 });
    assert.equal(await next().isEnabled(), false);
    await page.getByRole('button', { name: 'Template Trên / dưới', exact: true }).click();
    // Exercise the embedded camera with Chromium's fake video device.
    const permission = page.getByRole('button', { name: 'Cho phép camera', exact: true });
    if (await permission.count()) await permission.click();
    await enabled(shutter());
    await page.waitForFunction(() => document.querySelector('video')?.readyState === 4);
    assert.equal(await page.locator('video').count(), 1);
    await page.evaluate(() => { window.previewBefore = document.querySelector('video'); window.streamBefore = window.previewBefore.srcObject; });
    for (const [label, ratio] of [['Trái / phải', 0.5], ['Bốn ảnh', 1], ['Một ảnh', 1], ['Trên / dưới', 2]]) {
      await page.getByRole('button', { name: `Template ${label}`, exact: true }).click();
      const preview = await page.locator('video').evaluate(video => {
        const bounds = video.getBoundingClientRect();
        const frame = video.parentElement.getBoundingClientRect();
        return { sameVideo: video === window.previewBefore, sameStream: video.srcObject === window.streamBefore, ratio: bounds.width / bounds.height, fillsFrame: Math.abs(bounds.width - frame.width) < 1 && Math.abs(bounds.height - frame.height) < 1, fit: getComputedStyle(video).objectFit };
      });
      assert.ok(preview.sameVideo && preview.sameStream, 'Template changes must preserve the running camera');
      assert.ok(preview.fillsFrame && Math.abs(preview.ratio - ratio) < 0.01, 'Preview must fill the new cell immediately');
      assert.equal(preview.fit, 'cover');
      assert.equal(await shutter().isEnabled(), true, 'Changing template must not restart camera readiness');
    }
    await page.getByRole('button', { name: 'Ô ảnh 2 · chưa có ảnh', exact: true }).click();
    assert.equal(await page.locator('video').evaluate(video => video === window.previewBefore && video.srcObject === window.streamBefore), true, 'Empty cell changes preserve the stream');
    await page.getByRole('button', { name: 'Ô ảnh 1 · chưa có ảnh', exact: true }).click();
    for (let flip = 0; flip < 2; flip++) {
      await page.getByRole('button', { name: 'Đổi camera trước sau', exact: true }).click();
      await enabled(shutter());
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
      assert.equal(await page.locator('video').count(), 1, 'Camera switching must leave only one preview');
      assert.equal(await page.locator('video').evaluate(video => video === window.previewBefore), false, 'Facing changes reopen the camera');
      await page.evaluate(() => { window.previewBefore = document.querySelector('video'); window.streamBefore = window.previewBefore.srcObject; });
    }
    await shutter().click();
    await page.getByText('Chụp ảnh 2/2 · 1 ảnh đã chọn', { exact: true }).waitFor();
    assert.equal(await next().isEnabled(), false);
    await enabled(shutter());
    await page.waitForFunction(() => document.querySelector('video')?.readyState === 4);
    assert.equal(await page.locator('video').evaluate(video => video === window.previewBefore && video.srcObject === window.streamBefore), true, 'Sequential capture preserves the stream');
    await shutter().click();
    await enabled(next());
    assert.equal(await page.locator('video').count(), 0);
    // Tapping edits inline; only X deletes that cell and reopens the camera.
    const first = page.getByRole('slider', { name: 'Ô ảnh 1 · chỉnh vùng ảnh', exact: true });
    await first.click();
    const bounds = await first.boundingBox();
    assert.ok(Math.abs(bounds.width / bounds.height - 2) < 0.01);
    assert.equal(await page.locator('video').count(), 0);
    assert.equal(await page.getByRole('button', { name: /Chụp lại ô ảnh|Chỉnh vùng cắt ảnh|Đóng chỉnh ảnh/ }).count(), 0);
    const secondUri = await page.getByRole('slider', { name: 'Ô ảnh 2 · chỉnh vùng ảnh', exact: true }).locator('img').getAttribute('src');
    await page.getByRole('button', { name: 'Xóa ảnh ô 1', exact: true }).click();
    assert.equal(await next().isEnabled(), false);
    assert.equal(await page.getByRole('button', { name: 'Ô ảnh 1 · chưa có ảnh', exact: true }).count(), 1);
    assert.equal(await page.getByRole('slider', { name: 'Ô ảnh 2 · chỉnh vùng ảnh', exact: true }).locator('img').getAttribute('src'), secondUri);
    await enabled(shutter());
    await page.waitForFunction(() => document.querySelector('video')?.readyState === 4);
    await shutter().click();
    await enabled(next());
    await page.getByRole('button', { name: 'Template Một ảnh', exact: true }).click();
    await page.getByRole('button', { name: 'Giữ template hiện tại', exact: true }).click();
    assert.equal(await page.getByRole('slider', { name: /Ô ảnh .*chỉnh vùng ảnh/ }).count(), 2);
    await page.getByRole('button', { name: 'Template Một ảnh', exact: true }).click();
    await page.getByRole('button', { name: 'Đổi template và bỏ ảnh dư', exact: true }).click();
    await enabled(next());
    await page.getByRole('button', { name: 'Template Bốn ảnh', exact: true }).click();
    await page.getByText('Chụp ảnh 2/4 · 1 ảnh đã chọn', { exact: true }).waitFor();
    assert.equal(await next().isEnabled(), false);
    // Fill the other cells from the library; do not require camera permission for it.
    for (let i = 0; i < 3; i++) {
      await upload(path.resolve(__dirname, '../assets/icon.png'));
      if (i < 2) await page.getByText(`Chụp ảnh ${i + 3}/4 · ${i + 2} ảnh đã chọn`, { exact: true }).waitFor();
    }
    await enabled(next());
    // Verify actual output pixels, not just that a photo can be displayed.
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    for (let index = 0; index < colors.length; index++) {
      const data = await page.evaluate(color => {
        const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 360;
        const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 240, 360);
        return canvas.toDataURL('image/png').split(',')[1];
      }, colors[index]);
      const slot = page.getByRole('slider', { name: `Ô ảnh ${index + 1} · chỉnh vùng ảnh`, exact: true });
      await slot.click();
      await slot.locator('xpath=self::*[@aria-selected="true"]').waitFor();
      await upload({ name: `color-${index}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
      await page.getByText('Kéo để căn ảnh · Chụm hai ngón tay để thu phóng', { exact: true }).waitFor();
      await enabled(next());
    }
    // A dragged crop must be reflected in the exported JPEG, not only the preview.
    const stripes = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 720;
      const context = canvas.getContext('2d');
      ['red', 'lime', 'blue'].forEach((color, index) => { context.fillStyle = color; context.fillRect(0, index * 240, 240, 240); });
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.getByRole('slider', { name: 'Ô ảnh 1 · chỉnh vùng ảnh', exact: true }).click();
    await upload({ name: 'stripes.png', mimeType: 'image/png', buffer: Buffer.from(stripes, 'base64') });
    await enabled(next());
    await page.getByRole('slider', { name: 'Ô ảnh 1 · chỉnh vùng ảnh', exact: true }).click();
    const crop = page.getByRole('slider', { name: 'Ô ảnh 1 · chỉnh vùng ảnh', exact: true });
    await crop.waitFor();
    await crop.click({ trial: true });
    await crop.evaluate(async element => {
      const animations = [];
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) animations.push(...ancestor.getAnimations());
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    });
    // Force a scrollable screen: photo gestures must never move its viewport.
    await page.setViewportSize({ width: 390, height: 560 });
    await crop.scrollIntoViewIfNeeded();
    const area = await crop.boundingBox();
    const screen = page.locator('[data-testid="screen-scroll"]:visible').last();
    const scrollBefore = await screen.evaluate(el => el.scrollTop);
    async function scrollLocked(locked) {
      await page.waitForFunction(expected => {
        const screens = [...document.querySelectorAll('[data-testid="screen-scroll"]')].filter(el => el.getBoundingClientRect().height > 0);
        return (getComputedStyle(screens.at(-1)).overflowY === 'hidden') === expected;
      }, locked);
    }
    async function fixedViewport() {
      assert.equal(await screen.evaluate(el => el.scrollTop), scrollBefore, 'Editing a cell must not scroll the screen');
      assert.deepEqual(await crop.boundingBox(), area, 'Editing a cell must not move or resize the template');
    }
    const client = await context.newCDPSession(page);
    const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
    async function pinch(from, to) {
      const points = distance => [{ x: center.x - distance, y: center.y, id: 1 }, { x: center.x + distance, y: center.y, id: 2 }];
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from) });
      await scrollLocked(true);
      assert.equal(await next().isEnabled(), false, 'Cannot export an unfinished gesture');
      for (let step = 1; step <= 8; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(from + (to - from) * step / 8) });
      await fixedViewport();
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: points(to).slice(0, 1) });
      await scrollLocked(true);
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await scrollLocked(false);
    }
    await pinch(20, 40);
    await page.screenshot({ path: 'tmp/screenshots/check-in-inline-pinch.png', fullPage: true });
    await page.waitForFunction(() => document.querySelector('[aria-label="Ô ảnh 1 · chỉnh vùng ảnh"]')?.getAttribute('aria-valuetext') === '2.00×');
    await pinch(40, 20);
    await page.waitForFunction(() => document.querySelector('[aria-label="Ô ảnh 1 · chỉnh vùng ảnh"]')?.getAttribute('aria-valuetext') === '1.00×');
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, id: 1 }] });
    await scrollLocked(true);
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x + 18, y: center.y, id: 1 }] });
    await fixedViewport();
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await scrollLocked(false);
    await client.detach();
    await page.mouse.move(area.x + area.width / 2, area.y + 20);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width / 2, area.y + area.height - 20, { steps: 8 });
    await page.mouse.up();
    await enabled(next());
    await fixedViewport();
    await page.mouse.move(375, 450);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction(before => [...document.querySelectorAll('[data-testid="screen-scroll"]')].some(el => el.scrollTop > before), scrollBefore);
    await page.setViewportSize({ width: 390, height: 844 });
    await crop.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'tmp/screenshots/check-in-camera-grid.png', fullPage: true });
    await next().click();
    await page.getByLabel('Tên địa điểm *', { exact: true }).waitFor();
    await page.getByText('Đã chọn vị trí · kéo ghim để điều chỉnh', { exact: true }).waitFor();
    const map = await mapFrame(page);
    assert.deepEqual(await map.evaluate(() => window.testConfig.selected), { latitude: 11.94, longitude: 108.44 }, 'Step 2 automatically uses current GPS coordinates');
    assert.equal(await page.evaluate(() => window.locationRequests), 1, 'One automatic request');
    assert.equal(await page.locator('video').count(), 0);
    const pixels = await page.locator('img').last().evaluate(async image => {
      await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1600;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 1600, 1600);
      return [[400, 400], [1200, 400], [400, 1200], [1200, 1200]].map(([x, y]) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3));
    });
    const expected = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
    pixels.forEach((pixel, index) => pixel.forEach((channel, i) => assert.ok(Math.abs(channel - expected[index][i]) < 8, `wrong output color at cell ${index}`)));
    await page.getByLabel('Tên địa điểm *', { exact: true }).fill('Kỷ niệm với ảnh ghép');
    // A late GPS result must not overwrite a pin chosen during the request.
    await page.evaluate(() => { window.holdLocation = true; });
    await page.getByRole('button', { name: 'Dùng vị trí hiện tại', exact: true }).click();
    await page.waitForFunction(() => window.finishLocation);
    await map.evaluate(() => parent.postMessage(JSON.stringify({ type: 'pick', latitude: 10.8, longitude: 106.7 }), '*'));
    await page.getByRole('button', { name: 'Dùng vị trí hiện tại', exact: true }).waitFor();
    await page.evaluate(async () => {
      window.finishLocation();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.deepEqual(await map.evaluate(() => window.testConfig.selected), { latitude: 10.8, longitude: 106.7 });
    await page.getByRole('button', { name: 'Quay lại chọn ảnh', exact: true }).click();
    await enabled(next());
    assert.equal(await page.getByRole('slider', { name: /Ô ảnh .*chỉnh vùng ảnh/ }).count(), 4);
    await next().click();
    await page.getByLabel('Tên địa điểm *', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Tên địa điểm *', { exact: true }).inputValue(), 'Kỷ niệm với ảnh ghép');
    assert.equal(await page.evaluate(() => window.locationRequests), 2, 'Returning to details preserves the selected location without another GPS request');
    const returnedMap = await mapFrame(page);
    assert.deepEqual(await returnedMap.evaluate(() => window.testConfig.selected), { latitude: 10.8, longitude: 106.7 });
    await context.grantPermissions([], { origin: base });
    const denied = await context.newPage();
    await denied.goto(`${base}/check-in/new`);
    await denied.getByRole('button', { name: 'Cho phép camera', exact: true }).waitFor();
    assert.equal(await denied.locator('video').count(), 0);
    const chooser = denied.waitForEvent('filechooser');
    await denied.getByRole('button', { name: 'Chọn ảnh từ thư viện', exact: true }).click();
    await (await chooser).setFiles(path.resolve(__dirname, '../assets/icon.png'));
    await denied.getByText('Kéo để căn ảnh · Chụm hai ngón tay để thu phóng', { exact: true }).waitFor();
    await enabled(denied.getByRole('button', { name: 'Dùng ảnh này · Tiếp tục', exact: true }));
    await denied.getByRole('slider', { name: 'Ô ảnh 1 · chỉnh vùng ảnh', exact: true }).click();
    await enabled(denied.getByRole('button', { name: 'Dùng ảnh này · Tiếp tục', exact: true }));
    await denied.getByRole('button', { name: 'Dùng ảnh này · Tiếp tục', exact: true }).click();
    await denied.getByText('Chưa được cấp quyền vị trí. Bạn vẫn có thể chạm bản đồ để chọn nơi đã đến.', { exact: true }).waitFor();
    const deniedMap = await mapFrame(denied);
    await deniedMap.evaluate(() => parent.postMessage(JSON.stringify({ type: 'pick', latitude: 10.8, longitude: 106.7 }), '*'));
    await denied.getByText('Đã chọn vị trí · kéo ghim để điều chỉnh', { exact: true }).waitFor();
    assert.equal(await denied.getByRole('alert').count(), 0, 'Manual selection clears permission error');
    await denied.close();
    const memories = await context.newPage();
    memories.on('pageerror', error => errors.push(error.message));
    await memories.goto(`${base}/memories`);
    const latest = memories.getByRole('button', { name: 'Về tháng có kỷ niệm mới nhất', exact: true });
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Tất cả', exact: true }).waitFor();
    assert.equal(await latest.innerText(), '', 'Latest month should be an icon only');
    assert.equal(await memories.getByRole('checkbox').count(), 0, 'Categories stay inside the filter sheet');
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Tất cả', exact: true }).click();
    assert.equal(await memories.getByRole('button', { name: 'Xong', exact: true }).count(), 0);
    for (const label of ['Tất cả kỷ niệm', 'Quà tặng', 'Du lịch', 'Trải nghiệm', 'Khoảnh khắc']) {
      const option = memories.getByRole('checkbox', { name: label, exact: true });
      const text = option.getByText(label, { exact: true });
      await text.waitFor();
      const bounds = await text.boundingBox();
      assert.ok(bounds.width > 40 && bounds.height >= 20, `${label} must have visible text, not only an accessibility label`);
    }
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true, checked: true }).waitFor();
    await memories.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Du lịch', exact: true }).waitFor();
    await latest.click();
    await memories.getByText('Tháng 9, 2024', { exact: true }).waitFor();
    await memories.getByText('1 ngày đáng nhớ · 2 ảnh', { exact: true }).waitFor();
    await memories.getByRole('button', { name: 'Tháng trước', exact: true }).click();
    await memories.getByText('0 ngày đáng nhớ · 0 ảnh', { exact: true }).waitFor();
    await latest.click();
    await memories.getByText('Tháng 9, 2024', { exact: true }).waitFor();
    await memories.getByRole('button', { name: /Ngày 15 tháng 9 năm 2024/ }).click({ trial: true });
    await memories.screenshot({ path: 'tmp/screenshots/check-in-memories-filtered.png', fullPage: true });
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Du lịch', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Quà tặng', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true, checked: true }).waitFor();
    await memories.getByRole('checkbox', { name: 'Quà tặng', exact: true, checked: true }).waitFor();
    await memories.getByRole('checkbox', { name: 'Tất cả kỷ niệm', exact: true, checked: false }).waitFor();
    await memories.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Du lịch, Quà tặng', exact: true }).waitFor();
    await latest.click();
    await memories.getByText('Tháng 10, 2024', { exact: true }).waitFor();
    await memories.getByRole('button', { name: /Ngày 20 tháng 10 năm 2024/ }).click();
    await memories.getByText('4 ảnh kỷ niệm của hai đứa ♡', { exact: true }).waitFor();
    assert.equal(new URL(memories.url()).searchParams.get('category'), 'Du lịch,Quà tặng');
    await memories.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Du lịch, Quà tặng', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Quà tặng', exact: true, checked: true }).waitFor();
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true, checked: false }).waitFor();
    await memories.getByRole('checkbox', { name: 'Tất cả kỷ niệm', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Tất cả kỷ niệm', exact: true, checked: true }).waitFor();
    await memories.getByRole('checkbox', { name: 'Quà tặng', exact: true, checked: false }).waitFor();
    await memories.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await latest.click();
    await memories.getByText('Tháng 10, 2024', { exact: true }).waitFor();
    await memories.getByText('1 ngày đáng nhớ · 4 ảnh', { exact: true }).waitFor();
    await memories.getByRole('button', { name: 'Bộ lọc kỷ niệm: Tất cả', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Khoảnh khắc', exact: true }).waitFor();
    await memories.getByRole('checkbox', { name: 'Khoảnh khắc', exact: true }).click({ trial: true });
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Quà tặng', exact: true }).click();
    await memories.getByRole('checkbox', { name: 'Du lịch', exact: true, checked: true }).waitFor();
    await memories.getByRole('checkbox', { name: 'Quà tặng', exact: true, checked: true }).waitFor();
    await memories.screenshot({ path: 'tmp/screenshots/check-in-memories-filter-sheet.png', fullPage: true });
    await memories.close();
    assert.deepEqual(errors, []);
    console.log('PASS: embedded capture, sequential cells, library, inline editing, per-cell deletion and recapture, template confirmation, composition, fixed gesture viewport, scroll recovery, automatic GPS, manual pin priority, location persistence, denied permission fallback, visible filter labels, multiple memory categories, day navigation and latest-month icon');
  } finally { await browser.close(); server.close(); await h.db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

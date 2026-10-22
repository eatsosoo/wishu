// Theme integration: export web to tmp/theme-web, then run with Playwright.
// Set CHROME_PATH if Chrome is installed outside the default macOS location.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { database, users } = require('./helpers/relational-db.cjs');

(async () => {
  const h = await database();
  await h.db.exec("update wish_members set birth_date='2000-01-01',gender='other'");
  const output = path.resolve(__dirname, '../tmp/theme-web');
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
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/us`);
    const appearance = () => page.getByRole('button', { name: 'Giao diện', exact: true });
    await appearance().waitFor({ timeout: 45000 });
    await appearance().click();
    assert.equal(await page.getByRole('radio').count(), 5);
    await page.getByRole('radio', { name: 'Dưới ánh trăng', exact: true }).click();
    await page.getByRole('radio', { name: 'Dưới ánh trăng', exact: true, checked: true }).waitFor();
    await page.waitForFunction(() => localStorage.getItem('ourwish:theme') === 'monochrome');
    const closeSheet = () => page.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.screenshot({ path: 'tmp/screenshots/check-in-monochrome-picker.png', fullPage: true });
    await closeSheet();
    await page.getByRole('radio', { name: 'Dưới ánh trăng', exact: true }).waitFor({ state: 'hidden' });
    await page.reload();
    await appearance().getByText('Dưới ánh trăng', { exact: true }).waitFor();
    assert.equal(await page.getByText('Của chúng ta', { exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(244, 244, 244)');
    await page.screenshot({ path: 'tmp/screenshots/check-in-monochrome-profile.png', fullPage: true });
    await page.getByRole('button', { name: /Thông báo, .* chưa đọc/ }).click();
    await page.getByText('Bất ngờ đang trên đường đến', { exact: true }).waitFor();
    await page.screenshot({ path: 'tmp/screenshots/check-in-monochrome-notifications.png', fullPage: true });
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await page.getByRole('tab', { name: 'Kỷ niệm', exact: true }).click();
    await page.getByRole('button', { name: 'Bộ lọc kỷ niệm: Tất cả', exact: true }).click();
    const all = page.getByRole('checkbox', { name: 'Tất cả kỷ niệm', exact: true });
    await all.click({ trial: true });
    assert.equal(await all.getByText('Tất cả kỷ niệm', { exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(21, 21, 21)');
    await page.screenshot({ path: 'tmp/screenshots/check-in-monochrome-filters.png', fullPage: true });
    await page.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByRole('tab', { name: 'Của chúng ta', exact: true }).click();
    await appearance().click();
    await page.getByRole('radio', { name: 'Chớm thương', exact: true }).click();
    await page.waitForFunction(() => localStorage.getItem('ourwish:theme') === 'rose');
    await closeSheet();
    await page.getByRole('radio').first().waitFor({ state: 'hidden' });
    assert.equal(await page.getByText('Của chúng ta', { exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(120, 46, 60)');
    assert.deepEqual(errors, []);
    console.log('PASS: monochrome selection, persistence after reload, readable controls and restoration of the original theme');
  } finally { await browser.close(); server.close(); await h.db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

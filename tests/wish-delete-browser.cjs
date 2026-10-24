// Export to tmp/loading-web, then run with Playwright available via NODE_PATH.
// All Auth/API responses use local fixtures; no production wish is deleted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { database, users } = require('./helpers/relational-db.cjs');

(async () => {
  const h = await database();
  await h.db.exec("update wish_members set birth_date='2000-01-01',gender='other'");
  const coverUrl = 'https://wish-image.test/cover.png';
  const wishTitle = h.snapshot.wishes.find(wish => wish.id === 'bear').title;
  await h.db.query("update wishes set cover=$1 where id='bear'", [JSON.stringify({ uri: coverUrl })]);
  const root = path.resolve('tmp/loading-web');
  const screenshots = path.resolve('tmp/loading-screenshots'); fs.mkdirSync(screenshots, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path.relative(root, file).startsWith('..')) { res.writeHead(403).end(); return; }
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' }); fs.createReadStream(target).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const cloudUrl = fs.readFileSync('.env', 'utf8').match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
  const key = `sb-${new URL(cloudUrl).hostname.split('.')[0]}-auth-token`;
  const user = { id: users[1], aud: 'authenticated', role: 'authenticated', email: 'preview@example.com', user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() };
  const expires = Math.floor(Date.now() / 1000) + 36000;
  const token = ['e30', Buffer.from(JSON.stringify({ sub: user.id, exp: expires, role: 'authenticated' })).toString('base64url'), 'preview'].join('.');
  const session = { access_token: token, refresh_token: 'preview', token_type: 'bearer', expires_at: expires, expires_in: 36000, user };
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let requests = 0, fail = true, release;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    await context.addInitScript(({ key, session }) => { localStorage.setItem('ourwish:theme', 'rose'); localStorage.setItem('ourwish:onboarded', 'yes'); localStorage.setItem(key, JSON.stringify(session)); }, { key, session });
    await context.route(`${cloudUrl}/**`, async route => {
      const url = route.request().url(); let data = {};
      if (url.includes('/auth/v1/user')) data = user;
      else if (url.includes('/rest/v1/rpc/get_my_couple')) data = await h.state(users[1]);
      else if (url.includes('/functions/v1/wish-action')) {
        requests++;
        const command = route.request().postDataJSON(); assert.equal(command.kind, 'delete');
        if (fail) { await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Chưa xoá được, bạn thử lại nhé.' }) }); return; }
        await new Promise(resolve => { release = resolve; });
        await h.command(users[1], command); data = await h.state(users[1]);
      } else if (url.includes('/storage/v1/object/sign/')) data = route.request().postDataJSON().paths.map(name => ({ path: name, signedURL: `/object/sign/wish-photos/${name}`, error: null }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    let imageRequests = 0, releaseImage;
    await context.route(coverUrl, async route => {
      imageRequests++;
      if (imageRequests <= 2) await new Promise(resolve => { releaseImage = resolve; });
      if (imageRequests === 1) await route.fulfill({ status: 503, body: 'Image unavailable' });
      else await route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync('public/icon.png') });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/wishes?owner=linh`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: /Hoàn thành/ }).click();
    const card = page.getByRole('button', { name: `Xem ${wishTitle}, đã hoàn thành`, exact: true });
    const imageLoading = page.getByRole('progressbar', { name: `Đang tải ảnh ${wishTitle}`, exact: true });
    await imageLoading.waitFor();
    const placeholderBounds = await imageLoading.locator('..').boundingBox();
    assert.equal(placeholderBounds.width, 90); assert.equal(placeholderBounds.height, 100);
    await page.screenshot({ path: path.join(screenshots, 'wish-image-loading.png') });
    while (!releaseImage) await new Promise(resolve => setTimeout(resolve, 10));
    releaseImage(); releaseImage = undefined;
    await page.getByRole('button', { name: `Tải lại ảnh ${wishTitle}`, exact: true }).click();
    await imageLoading.waitFor();
    assert.ok(page.url().includes('/wishes'), 'retry does not navigate to the wish');
    while (!releaseImage) await new Promise(resolve => setTimeout(resolve, 10));
    releaseImage();
    await imageLoading.waitFor({ state: 'detached' });
    const imageBounds = await card.locator('img').first().boundingBox();
    assert.equal(imageBounds.width, placeholderBounds.width); assert.equal(imageBounds.height, placeholderBounds.height);
    assert.equal(imageRequests, 2);
    console.log('PASS: wish cover loading, failed image/retry, no accidental navigation and stable image dimensions.');
    await page.goto(`http://127.0.0.1:${server.address().port}/wish/bear`, { waitUntil: 'domcontentloaded' });
    const options = page.getByRole('button', { name: 'Thêm lựa chọn', exact: true });
    await options.waitFor(); await options.click();
    await page.getByRole('button', { name: 'Xoá điều ước', exact: true }).click();
    await page.getByText('Xoá điều ước?', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(screenshots, 'wish-delete-confirm.png') });
    await page.getByRole('button', { name: 'Giữ lại', exact: true }).click();
    assert.equal(requests, 0, 'cancel does not call delete');
    await options.click(); await page.getByRole('button', { name: 'Xoá điều ước', exact: true }).click();
    await page.getByText('Xoá điều ước?', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xoá điều ước', exact: true }).click();
    await page.waitForFunction(() => document.body.textContent.includes('Chưa xoá được'));
    assert.equal(requests, 1);
    assert.equal((await h.state(users[1])).snapshot.wishes.some(wish => wish.id === 'bear'), true);
    const closeNotice = page.getByRole('button', { name: 'Đóng thông báo', exact: true });
    if (await closeNotice.isVisible()) await closeNotice.click();
    fail = false;
    await page.getByRole('button', { name: 'Xoá điều ước', exact: true }).click();
    const pending = page.getByRole('button', { name: 'Đang xoá…', exact: true }); await pending.waitFor();
    assert.equal(await pending.isDisabled(), true); assert.equal(await pending.getAttribute('aria-busy'), 'true');
    const rotation = () => pending.locator('svg').evaluate(svg => getComputedStyle(svg.parentElement).transform);
    const firstRotation = await rotation(); await page.waitForTimeout(180);
    assert.notEqual(await rotation(), firstRotation, 'button spinner rotates while waiting');
    await page.screenshot({ path: path.join(screenshots, 'button-loading-delete.png') });
    while (!release) await new Promise(resolve => setTimeout(resolve, 10));
    release(); await page.waitForURL('**/wishes?owner=linh');
    const state = (await h.state(users[1])).snapshot;
    assert.equal(state.wishes.some(wish => wish.id === 'bear'), false);
    assert.equal(state.memories.length, h.snapshot.memories.length);
    assert.equal(requests, 2); assert.deepEqual(errors, []);
    console.log('PASS: confirmation opens in one modal; cancel, failed delete/retry, busy spinner, successful delete and preserved memories.');
  } finally { await browser.close(); server.close(); await h.db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

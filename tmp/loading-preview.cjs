const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve('tmp/loading-web');
const output = path.resolve('tmp/loading-screenshots');
fs.mkdirSync(output, { recursive: true });
const env = fs.readFileSync('.env', 'utf8');
const projectUrl = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
const key = `sb-${new URL(projectUrl).hostname.split('.')[0]}-auth-token`;
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'preview@example.com', user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() };
const expires = Math.floor(Date.now() / 1000) + 36000;
const token = ['e30', Buffer.from(JSON.stringify({ sub: user.id, exp: expires, role: 'authenticated' })).toString('base64url'), 'preview'].join('.');
const session = { access_token: token, refresh_token: 'preview-refresh', token_type: 'bearer', expires_in: 36000, expires_at: expires, user };
const server = http.createServer((req, res) => {
  const candidate = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (path.relative(root, candidate).startsWith('..')) { res.writeHead(403).end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const [theme, width, height, reducedMotion] of [['rose', 390, 844, 'no-preference'], ['monochrome', 390, 844, 'reduce'], ['sage', 320, 568, 'reduce']]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const pending = [];
      await page.route(`${projectUrl}/**`, route => new Promise(resolve => pending.push(() => route.abort().then(resolve))));
      await page.addInitScript(({ theme, key, session }) => { localStorage.setItem('ourwish:theme', theme); localStorage.setItem('ourwish:onboarded', 'yes'); localStorage.setItem(key, JSON.stringify(session)); }, { theme, key, session });
      await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('progressbar', { name: /Yêu thương đang đến/ }).waitFor();
      await page.waitForFunction(() => document.fonts.check('23px Pacifico-Regular'));
      await page.waitForTimeout(700);
      const progress = page.getByRole('progressbar', { name: /Yêu thương đang đến/ });
      assert.equal(await progress.count(), 1);
      assert.equal(await progress.getAttribute('aria-busy'), 'true');
      const foot = progress.locator('svg').nth(1);
      const transform = () => foot.evaluate(svg => getComputedStyle(svg.parentElement).transform);
      const first = await transform(); await page.waitForTimeout(180);
      if (reducedMotion === 'reduce') assert.equal(await transform(), first, 'Reduce Motion keeps duck still');
      else assert.notEqual(await transform(), first, 'duck feet step instead of spinning');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `${theme}-${width}.png`) });
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ theme, viewport: `${width}x${height}`, reducedMotion, errors: errors.length, screenshot: `${theme}-${width}.png` }));
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

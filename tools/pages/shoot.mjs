// Screenshots of a rich project page, section by section, for checking a page before handing it in.
//   node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug> [1440 900]
//   node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug>-phone 390 844
//   add --only=drivetrain,throttle to shoot just the sections holding those ids, --p=0,0.5,1 for
//   the scrolly positions (default 0, 0.25, 0.5, 0.75, 1), --video to see the videos play: this
//   Chromium has no H.264, so each mp4 is served as a WebM copy (made once with ffmpeg, cached in
//   /tmp/shoot-webm); without it videos show their posters
// Writes <prefix>-00-top.png, then one shot per section (demos are given time to go live) and
// five shots through each scrolly (progress 0, 0.25, 0.5, 0.75, 1). Prints console errors, failed
// requests, blocks that did not go live, and whether the page scrolls sideways.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const [url, prefix, w = '1440', h = '900'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ONLY = flags.only ? flags.only.split(',') : null;
const PS = flags.p ? flags.p.split(',').map(Number) : [0, 0.25, 0.5, 0.75, 1];
if (!url || !prefix) { console.log('usage: node tools/pages/shoot.mjs <url> <out-prefix> [width height]'); process.exit(1); }
const phone = +w < 600;
await (await import('./pwlock.mjs')).acquire(); // wait for a free browser slot
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })).newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
if (flags.video != null) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), CACHE = '/tmp/shoot-webm';
  mkdirSync(CACHE, { recursive: true });
  await page.route(/\.mp4(\?|$)/, async (route) => {
    const file = join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
    if (!existsSync(file)) return route.continue();
    const out = join(CACHE, `${createHash('sha1').update(`${file}|${statSync(file).mtimeMs}`).digest('hex').slice(0, 16)}.webm`);
    try {
      if (!existsSync(out)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-deadline', 'realtime', '-cpu-used', '8', out]);
      await route.fulfill({ status: 200, contentType: 'video/webm', body: readFileSync(out) });
    } catch (e) { console.log('webm copy failed for', file, e.message.split('\n')[0]); await route.continue(); }
  });
}
await page.goto(url, { waitUntil: 'load' });
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
await page.waitForTimeout(1000);
let n = 0;
const shot = async (name) => { const f = `${prefix}-${String(n++).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: f, timeout: 240000 }); console.log('wrote', f); };
const settle = async (sel) => {
  // wait for any interactive block in view to finish mounting (or fail)
  await page.waitForFunction((s) => [...document.querySelectorAll(`${s} [data-rx-block], ${s}[data-rx-block]`)].every((b) => !['idle', 'loading'].includes(b.dataset.state) || b.getBoundingClientRect().top > innerHeight + 300), sel, { timeout: 120000 }).catch(() => console.log('timed out waiting for', sel));
  await page.waitForTimeout(1200);
};
if (!ONLY) await shot('top');
const secs = await page.$$eval('main .rx-sec', (els) => els.map((e, i) => { e.dataset.shootIdx = i; return { i, scrolly: !!e.querySelector('[data-rx-block="scrolly"]'), ids: [e.id, ...[...e.querySelectorAll('[id]')].map((x) => x.id)].filter(Boolean) }; }));
for (const s of secs) {
  if (ONLY && !s.ids.some((x) => ONLY.includes(x))) continue;
  const sel = `[data-shoot-idx="${s.i}"]`;
  if (!s.scrolly) {
    await page.evaluate((q) => { const e = document.querySelector(q); scrollTo(0, e.getBoundingClientRect().top + scrollY - 40); }, sel);
    await settle(sel);
    await shot(`section${s.i + 1}`);
    continue;
  }
  for (const p of PS) {
    await page.evaluate(([q, p]) => {
      const b = document.querySelector(`${q} .rx-scrolly-body`), st = b.querySelector('.rx-scrolly-stage');
      const top = b.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(st).top);
      scrollTo(0, top + (b.offsetHeight - st.offsetHeight) * p + 1);
    }, [sel, p]);
    await settle(sel);
    await shot(`section${s.i + 1}-scrolly-${p}`);
  }
}
const end = await page.evaluate(() => ({ sideways: document.documentElement.scrollWidth > innerWidth, blocks: [...document.querySelectorAll('[data-rx-block]')].map((b) => `${b.id}: ${b.dataset.state}`) }));
if (end.sideways) console.log('WARNING: the page scrolls sideways at this width');
console.log('blocks:', end.blocks.join(', ') || 'none');
await browser.close();

// Load every built page, scroll to the bottom in big steps and report page errors, console errors,
// failed requests and interactive blocks that failed to start. A quick check that nothing is broken
// before a push. Aborted video/image loads are not errors (this Chromium has no H.264 and the page
// cancels media it scrolls past).
//   node tools/pages/smoke.mjs [slug ...] [--phone]   (default: every page in projects/ plus the
//   landing, at 1440 x 900; --phone: 390 x 844 as a touch device).
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8123';
const PHONE = process.argv.includes('--phone');
const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const slugs = want.length ? want : ['', ...readdirSync(new URL('../../projects/', import.meta.url)).filter((f) => f.endsWith('.html') && !f.startsWith('_')).map((f) => f.replace('.html', ''))];

await (await import('./pwlock.mjs')).acquire();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const slug of slugs) {
  const url = slug ? `${BASE}/projects/${slug}.html` : `${BASE}/`;
  const ctx = await browser.newContext(PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`error: ${e.message.split('\n')[0]}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url()) && !(/ERR_ABORTED/.test(r.failure()?.errorText || '') && /\.(mp4|webm|jpg|webp)(\?|$)/.test(r.url()))) errs.push(`failed: ${r.url().replace(BASE, '')} ${r.failure()?.errorText || ''}`); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()}: ${r.url().replace(BASE, '')}`); });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(1500);
    // blocks that could not start (WebGL is on here, so a failed block is a real failure)
    for (const f of await page.$$eval('[data-rx-block][data-state="failed"]', (bs) => bs.map((b) => `${b.id || b.dataset.rxBlock}: ${b.querySelector('[data-rx-note]')?.textContent || 'failed'}`))) errs.push(`block failed: ${f}`);
  } catch (e) { errs.push(`load: ${e.message.split('\n')[0]}`); }
  const uniq = [...new Set(errs)];
  if (uniq.length) bad++;
  console.log(`${uniq.length ? 'FAIL' : 'ok  '} ${slug || '(landing)'}${uniq.length ? '\n    ' + uniq.slice(0, 8).join('\n    ') : ''}`);
  await ctx.close();
}
await browser.close();
console.log(`${slugs.length - bad}/${slugs.length} clean`);
process.exit(0); // always 0: read the FAIL lines

// Screenshots of a rich project page, section by section, for checking a page before handing it in.
//   node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug> [1440 900]
//   node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug>-phone 390 844
//   add --only=drivetrain,throttle to shoot just the sections holding those ids, --p=0,0.5,1 for
//   the scrolly positions (default 0, 0.25, 0.5, 0.75, 1)
// Writes <prefix>-00-top.png, then one shot per section (demos are given time to go live) and
// five shots through each scrolly (progress 0, 0.25, 0.5, 0.75, 1). Prints console errors, failed
// requests, blocks that did not go live, and whether the page scrolls sideways.
import { chromium } from 'playwright';

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [url, prefix, w = '1440', h = '900'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ONLY = flags.only ? flags.only.split(',') : null;
const PS = flags.p ? flags.p.split(',').map(Number) : [0, 0.25, 0.5, 0.75, 1];
if (!url || !prefix) { console.log('usage: node tools/pages/shoot.mjs <url> <out-prefix> [width height]'); process.exit(1); }
const phone = +w < 600;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone })).newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
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

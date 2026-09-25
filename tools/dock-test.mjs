import { chromium } from 'playwright';
const out = process.argv[2], W = +(process.argv[3] || 1280), H = +(process.argv[4] || 800);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
await page.goto('http://127.0.0.1:8123/drive.html?__step', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready || window.__err, null, { timeout: 300000 });
if (await page.evaluate(() => window.__err)) { console.log('ERR', await page.evaluate(() => window.__err)); process.exit(1); }
const st = () => page.evaluate(() => { const D = window.__world.DOCK; return `${D.mode}/${D.phase} t=${D.t.toFixed(2)} split=${D.split.toFixed(2)} latch=${D.latch.toFixed(2)} sec=${D.section.toFixed(2)}`; });
const step = (s) => page.evaluate((s) => window.__worldStep(s), s);
let n = 0;
const shot = async (label) => { await page.screenshot({ path: `${out}-${String(n++).padStart(2, '0')}-${label}.png` }); console.log(n - 1, label, await st()); };
await step(0.5); await shot('docked');
await page.evaluate(() => window.__world.toggle());
let t = 0;
for (const T of [0.8, 1.5, 2.0, 2.6, 3.2, 3.9, 4.6, 5.3, 5.9, 6.4, 6.8]) { await step(T - t); t = T; await shot('det' + T); }
await page.keyboard.down('w'); await step(2.0); await page.keyboard.up('w'); await shot('flyW');
await page.keyboard.down('a'); await page.keyboard.down('w'); await step(1.5); await page.keyboard.up('a'); await page.keyboard.up('w');
await page.keyboard.down('ArrowUp'); await step(1.5); await page.keyboard.up('ArrowUp'); await shot('both');
await page.evaluate(() => window.__world.toggle());
for (let i = 0; i < 26; i++) {
  await step(0.8);
  const s = await st();
  if (i % 2 === 0 || /approach|lock|descend|close|docked/.test(s)) await shot('att' + i);
  if (/^docked/.test(s)) break;
}
await browser.close();

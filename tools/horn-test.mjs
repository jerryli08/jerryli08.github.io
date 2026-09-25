// latch cutaway frames: closed, half, open, cropped on the servo gear and horn
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(180000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://127.0.0.1:8123/drive.html?__step', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready || window.__err, null, { timeout: 300000 });
const step = (s) => page.evaluate((s) => window.__worldStep(s), s);
await step(0.5); await page.evaluate(() => window.__world.toggle());
const want = [0.02, 0.5, 1]; let k = 0;
for (let i = 0; i < 60 && k < want.length; i++) {
  await step(0.1);
  const d = await page.evaluate(() => ({ l: window.__world.DOCK.latch, s: window.__world.DOCK.section }));
  if (d.s > 0.95 && d.l >= want[k]) { await page.screenshot({ path: `${out}-${k}.png` }); console.log('shot', k, d.l.toFixed(2)); k++; }
}
await page.screenshot({ path: `${out}-chip.png`, clip: { x: 0, y: 0, width: 520, height: 60 } });
await browser.close();

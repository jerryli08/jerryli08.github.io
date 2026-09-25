import { chromium } from 'playwright';
const [,, url, out, w='1440', h='900', times='1,3,5,7,12'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', m => { if (['error','warning'].includes(m.type())) console.log('console:', m.type(), m.text().slice(0,300)); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready || window.__err, null, { timeout: 300000 });
if (await page.evaluate(() => window.__err)) { console.log('ERR', await page.evaluate(() => window.__err)); process.exit(1); }
let cur = 0;
for (const t of times.split(',').map(Number)) {
  await page.evaluate((d) => window.__worldStep(d), t - cur); cur = t;
  await page.screenshot({ path: `${out}-${t}.png` });
}
await browser.close();

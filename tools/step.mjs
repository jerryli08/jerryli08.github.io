import { chromium } from 'playwright';
const [,, url, out, w='1440', h='900', times='1,3,4.5,5.5,7,12,25'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', m => { if (m.type()==='error') console.log('console:', m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__heroStep, null, { timeout: 180000 });
let cur = 0;
for (const t of times.split(',').map(Number)) {
  await page.evaluate((d) => window.__heroStep(d), t - cur); cur = t;
  await page.screenshot({ path: `${out}-${t}.png` });
}
await browser.close();

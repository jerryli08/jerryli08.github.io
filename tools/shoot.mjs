import { chromium } from 'playwright';
const [,, url, out, w='1440', h='900', times='0.5,2,3.5,5,6,8,14'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', m => { if (m.type()==='error' || m.type()==='warning') console.log('console:', m.type(), m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(url, { waitUntil: 'load' });
const t0 = Date.now();
for (const t of times.split(',').map(Number)) {
  const wait = t*1000 - (Date.now()-t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}-${t}.png` });
}
await browser.close();

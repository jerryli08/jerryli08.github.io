import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://127.0.0.1:8123/drive.html?__step', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready || window.__err, null, { timeout: 300000 });
const st = () => page.evaluate(() => { const w = window.__world; return `${w.DOCK.mode} y=${(w.R.y).toFixed(2)} x=${w.R.x.toFixed(2)} z=${w.R.z.toFixed(2)} btn=${document.querySelector('[data-fly-label]').textContent}|x:${getComputedStyle(document.querySelector('.x-btn')).display}`; });
let n = 0; const shot = async (l) => { await page.screenshot({ path: `${out}-${n++}-${l}.png` }); console.log(l, await st()); };
await page.evaluate(() => window.__worldStep(0.5)); await shot('docked');
await page.keyboard.press('f');
await page.evaluate(() => window.__worldStep(1.2)); await shot('lift1');
await page.evaluate(() => window.__worldStep(2.5)); await shot('lift2');
await page.keyboard.down('w'); await page.evaluate(() => window.__worldStep(2.5)); await shot('fwd');
await page.keyboard.down('a'); await page.evaluate(() => window.__worldStep(1.5)); await page.keyboard.up('a'); await page.keyboard.up('w'); await shot('turn');
await page.keyboard.press('f');
for (let i = 0; i < 8; i++) { await page.evaluate(() => window.__worldStep(1)); const s = await st(); if (i % 2 || /^docked/.test(s)) await shot('land' + i); if (/^docked/.test(s)) break; }
await page.evaluate(() => window.__worldStep(1.5)); await shot('after');
await browser.close();

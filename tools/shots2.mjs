// Landing page screenshots (3D off): node tools/shots2.mjs <outdir> [w] [h] [base]
import { chromium } from 'playwright';
const S = process.argv[2], W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900), BASE = process.argv[5] || 'http://127.0.0.1:8123';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, isMobile: W < 600, hasTouch: W < 600 });
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => { if (m.type()==='error' || m.type()==='warning') console.log('console:', m.text().slice(0, 200)); });
page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) console.log('HTTP', r.status(), r.url()); });
await page.goto(`${BASE}/?no3d`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${S}/L0.png` });
if (W >= 960) { await page.locator('.fcard').nth(1).hover(); await page.waitForTimeout(600); await page.screenshot({ path: `${S}/L1.png` }); await page.mouse.move(W - 40, 100); }
await page.evaluate(() => scrollTo(0, innerHeight * 0.55)); await page.waitForTimeout(700);
await page.screenshot({ path: `${S}/L2.png` });
await page.evaluate(() => document.querySelector('#work').scrollIntoView()); await page.waitForTimeout(900);
await page.screenshot({ path: `${S}/L3.png` });
if (W >= 960) { await page.locator('.tile').nth(2).hover(); await page.waitForTimeout(600); await page.screenshot({ path: `${S}/L4.png` }); }
await page.evaluate(() => { const a = document.querySelector('#archive'); if (a) scrollTo({ top: a.getBoundingClientRect().top + scrollY - 140, behavior: 'instant' }); }); await page.waitForTimeout(900);
await page.screenshot({ path: `${S}/L5.png` });
await browser.close();

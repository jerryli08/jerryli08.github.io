// keys bar in each mode + servo horn check (horn found, coaxial with the servo gear, turning)
import { chromium } from 'playwright';
const out = process.argv[2], W = +(process.argv[3] || 1280), H = +(process.argv[4] || 800);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const touch = process.argv[5] === 'touch';
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch }); page.setDefaultTimeout(180000);
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://127.0.0.1:8123/drive.html?__step', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready || window.__err, null, { timeout: 300000 });
const step = (s) => page.evaluate((s) => window.__worldStep(s), s);
const bar = async (label) => { const b = await page.locator('.drive-keys').boundingBox(); if (!b) { console.log(label, '(bar hidden)'); return; } await page.screenshot({ path: `${out}-bar-${label}.png`, clip: { x: Math.max(0, b.x - 10), y: b.y - 8, width: Math.min(W, b.width + 20), height: b.height + 16 } }); console.log(label, JSON.stringify(await page.locator('.drive-keys').innerText())); };
const horn = () => page.evaluate(() => {
  const { V } = window.__world; let h = null, g = null;
  V.roverRoot.traverse((o) => { if (/SERVO_ARM_HORN/.test(o.name)) h = o; if (/Spur_Gear/.test(o.name)) g = o; });
  const c = (o) => { const THREE = o.position.constructor; return null; };
  return { horn: !!h, pivotRot: h?.parent?.rotation.x.toFixed(4), gearRot: g?.parent?.rotation.x.toFixed(4), latch: window.__world.DOCK.latch.toFixed(2), children: h?.children.length };
});
await step(0.5); await page.keyboard.down('ArrowUp'); await step(1.2); await bar('docked'); await page.keyboard.up('ArrowUp'); await page.screenshot({ path: `${out}-docked.png` });
console.log('horn docked', JSON.stringify(await horn()));
await page.evaluate(() => window.__world.toggle());
let t = 0, maxL = 0;
for (let i = 0; i < 40; i++) { await step(0.2); t += 0.2; const h = await horn(); if (+h.latch > maxL) maxL = +h.latch; if (i % 4 === 0) console.log(t.toFixed(1), JSON.stringify(h)); if (+h.latch > 0.99 && !globalThis.shotOpen) { globalThis.shotOpen = 1; await page.screenshot({ path: `${out}-latch-open.png`, timeout: 180000 }); } if (+h.latch > 0.3 && +h.latch < 0.6 && !globalThis.shotMid) { globalThis.shotMid = 1; await page.screenshot({ path: `${out}-latch-mid.png`, timeout: 180000 }); } }
await bar('detaching');
await step(4);
await page.keyboard.down('w'); await page.keyboard.down('ArrowUp'); await step(1.6); await bar('split'); await page.keyboard.up('w'); await page.keyboard.up('ArrowUp');
await page.screenshot({ path: `${out}-split.png`, timeout: 180000 });
await page.evaluate(() => window.__world.toggle()); await step(1.5); await bar('attaching');
for (let i = 0; i < 30; i++) { await step(0.8); if (await page.evaluate(() => window.__world.DOCK.mode) === 'docked') break; }
await step(1); await page.evaluate(() => window.__world.fly()); await step(4); await page.keyboard.down('w'); await step(1.5); await bar('carried'); await page.keyboard.up('w');
await browser.close();

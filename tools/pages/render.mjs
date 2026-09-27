// Render a GLB to a PNG for card thumbnails and posters (software WebGL, so give it time).
// usage: node tools/pages/render.mjs /assets/models/<slug>/<name>.glb out.png [az] [el] [w] [h] [bg] [pad]
import { chromium } from 'playwright';
const [,, src, out, az = 35, el = 22, w = 1600, h = 1000, bg = '#0b0b0c', pad = 1.1] = process.argv;
await (await import('./pwlock.mjs')).acquire(); // wait for a free browser slot
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', (e) => console.error('page error', e.message));
const u = new URL('http://localhost:8123/tools/pages/render.html');
Object.entries({ src, az, el, bg, pad }).forEach(([k, val]) => u.searchParams.set(k, val));
await page.goto(u.href);
await page.waitForSelector('body[data-ready="1"]', { timeout: 240000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, timeout: 240000 });
await browser.close();
console.log('wrote', out);

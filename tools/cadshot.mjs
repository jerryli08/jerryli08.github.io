import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', e => console.log('pageerror:', e.message)); page.on('console', m => { if (m.type()==='error') console.log(m.text()); });
await page.goto('http://localhost:8765/tools/dev/_cadcheck.html');
await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
const views = [[0.8,0.35,1.1,0],[2.4,0.25,1.1,0],[-1.6,0.5,1.2,0.25],[0.3,-0.05,0.9,0.28]];
let i=0; for (const v of views) { await page.evaluate((v)=>window.shot(...v), v); await page.screenshot({ path: `${out}-${i++}.png` }); }
await browser.close();

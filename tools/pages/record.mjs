// Record a WebM of a reader scrolling through one scrolly with the mouse wheel, to check its pace
// and smoothness by eye, plus numbers: the scroll each step's animation plays over, and how far the
// animation moves in one frame against how far the page does (the glide in assets/js/project.js).
//   node tools/pages/record.mjs http://localhost:8123/projects/<slug>.html '#<scrolly-id>' <out-prefix>
//        [--w=1440 --h=900 --vw=960 --steps=0-2 --tick=100 --every=110]
// --steps: which steps to scroll through (default all); --tick px per wheel tick; --every ms between
// ticks (a steady reader); --vw the video's width (default 960, scaled from the viewport).
// Writes <out-prefix>.webm and prints JSON. Headless wheel ticks jump the page at once (no smooth
// scrolling), the worst case for jitter. Software WebGL draws only a few frames a second here, so the
// video shows the path, not the frame rate of a real GPU.
import { chromium } from 'playwright';
import { renameSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const [url, id, prefix] = args.filter((a) => !a.startsWith('--'));
if (!url || !id || !prefix) { console.log("usage: node tools/pages/record.mjs <url> '#id' <out-prefix> [--steps=0-2]"); process.exit(1); }
const W = +(opt.w || 1440), H = +(opt.h || 900), TICK = +(opt.tick || 100), EVERY = +(opt.every || 110);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers'; // Playwright's own ffmpeg records the video
const tmp = `${prefix}-rec-tmp`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
await (await import('./pwlock.mjs')).acquire();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VW = +(opt.vw || Math.min(W, 960)); // the video is scaled down (cheaper to encode on a busy machine)
const log = (...a) => console.error(`[record ${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
const T0 = Date.now();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width: VW, height: Math.round(VW * H / W) } } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(url, { waitUntil: 'load' });
log('loaded');
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
const sel = id.startsWith('#') ? id : `#${id}`;
// park just above the section and wait for its block to go live
const g0 = await page.evaluate((q) => { const b = document.querySelector(q); b.scrollIntoView(); return b.rxState.geom; }, sel);
if (!g0) { console.log('no scrolly', sel); process.exit(1); }
const n = g0.starts.length;
const [s0, s1] = (opt.steps || `0-${Math.max(0, n - 1)}`).split('-').map(Number);
const from = n ? g0.starts[s0] - 200 : g0.p0 - 200;
const to = n ? g0.ends[Math.min(n - 1, s1 ?? s0)] + 150 : g0.p1 + 150;
await page.evaluate((y) => scrollTo(0, y), from);
await page.waitForFunction((q) => document.querySelector(q).dataset.state !== 'loading' && document.querySelector(q).dataset.state !== 'idle', sel, { timeout: 180000 }).catch(() => console.log('block not live'));
log('live, scrolling', Math.round(to - from), 'px');
await page.waitForTimeout(2500);
// sample every frame: the page's scroll and the position the module follows
await page.evaluate((q) => {
  const b = document.querySelector(q), S = (window.__rec = []);
  const f = () => { const st = b.rxState; S.push([performance.now(), scrollY, st.y ?? scrollY, st.step, st.stepP]); if (!window.__recStop) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}, sel);
await page.mouse.move(W * 0.7, H * 0.5);
const t0 = Date.now();
let k = 0;
for (let y = from; y < to; y += TICK) { await page.mouse.wheel(0, TICK); await page.waitForTimeout(EVERY); if (++k % 10 === 0) log('tick', k); }
await page.waitForTimeout(1200);
const S = await page.evaluate(() => { window.__recStop = true; return window.__rec; });
const g = await page.evaluate((q) => document.querySelector(q).rxState.geom, sel);
await ctx.close();
await browser.close();
const vid = readdirSync(tmp).filter((f) => f.endsWith('.webm')).map((f) => [f, statSync(join(tmp, f)).mtimeMs]).sort((a, b) => b[1] - a[1])[0]?.[0];
if (vid) renameSync(join(tmp, vid), `${prefix}.webm`);
rmSync(tmp, { recursive: true, force: true });
// how far things moved per frame, while scrolling
let maxPage = 0, maxAnim = 0, frames = 0;
for (let i = 1; i < S.length; i++) {
  const dp = Math.abs(S[i][1] - S[i - 1][1]), da = Math.abs(S[i][2] - S[i - 1][2]);
  if (dp || da) frames++;
  maxPage = Math.max(maxPage, dp); maxAnim = Math.max(maxAnim, da);
}
const pinned = g.starts.map((s, i) => Math.round(g.ends[i] - s));
console.log(JSON.stringify({
  video: vid ? `${prefix}.webm` : null, viewport: `${W}x${H}`, pace: g.pace, steps: `${s0}-${s1 ?? s0} of ${n}`,
  pinnedPx: pinned, pinnedVh: pinned.map((p) => +(p / H * 100).toFixed(0)), round3Px: g.base,
  handoffPx: g.starts.slice(1).map((s, i) => Math.round(s - g.ends[i])),
  wheelTickPx: TICK, framesMoving: frames, frameMsMedian: Math.round(S.slice(1).map((x, i) => x[0] - S[i][0]).sort((a, b) => a - b)[Math.floor(S.length / 2)] || 0), maxPageJumpPerFramePx: Math.round(maxPage), maxAnimationJumpPerFramePx: Math.round(maxAnim),
  wallS: Math.round((Date.now() - t0) / 1000),
}, null, 1));

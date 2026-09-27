// Scroll a rich page in headless Chromium and measure what the 3D costs: frames rendered, WebGL
// draw calls per frame, script time per frame, long frames, and whether anything keeps rendering
// or requesting animation frames once the page is idle.
//   node tools/pages/perf.mjs http://localhost:8123/projects/<slug>.html [#section-id ...] [--w=1440 --h=900]
// With section ids it scrolls through each of those sections (top to bottom, in wheel steps);
// without, through the whole page. Then it parks inside each section and watches for 5 s of idle.
// Software WebGL (SwiftShader) is far slower than a real GPU: compare runs with each other, not
// with a laptop. Draw calls and idle activity are exact either way.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a));
const ids = args.filter((a) => a.startsWith('#'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const W = +(opt.w || 1440), H = +(opt.h || 900);
const STEP = +(opt.step || 120); // px per wheel tick
if (!url) { console.log('usage: node tools/pages/perf.mjs <url> [#id ...] [--w=1440 --h=900 --step=120]'); process.exit(1); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.addInitScript(() => {
  const P = (window.__perf = { draws: 0, frames: new Map(), raf: 0, rafTime: 0, ts: 0, longest: 0, loaf: [] });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    P.raf++;
    return raf((ts) => {
      P.ts = ts;
      const t0 = performance.now();
      try { cb(ts); } finally { const d = performance.now() - t0; P.rafTime += d; const f = P.frames.get(ts) || { draws: 0, script: 0 }; f.script += d; P.frames.set(ts, f); }
    });
  };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
      const f = C.prototype[k];
      if (!f) continue;
      C.prototype[k] = function (...a) {
        P.draws++;
        const fr = P.frames.get(P.ts) || { draws: 0, script: 0 };
        fr.draws++;
        P.frames.set(P.ts, fr);
        return f.apply(this, a);
      };
    }
  }
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) P.loaf.push(e.duration); }).observe({ type: 'long-animation-frame', buffered: true });
  } catch { /* older Chromium */ }
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'load' });
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
await page.waitForTimeout(1500);
const reset = () => page.evaluate(() => { const P = window.__perf; P.draws = 0; P.frames = new Map(); P.raf = 0; P.rafTime = 0; P.loaf = []; if (window.__rxStats) for (const k of Object.keys(window.__rxStats)) window.__rxStats[k] = 0; });
const read = () => page.evaluate(() => {
  const P = window.__perf;
  const fr = [...P.frames.entries()].filter(([, f]) => f.draws > 0).sort((a, b) => a[0] - b[0]);
  const gaps = fr.slice(1).map(([t], i) => t - fr[i][0]);
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.95)] : 0; };
  return {
    rendered: fr.length, draws: P.draws, drawsPerFrame: fr.length ? Math.round(P.draws / fr.length) : 0,
    maxDrawsPerFrame: Math.max(0, ...fr.map(([, f]) => f.draws)),
    frameGapMedianMs: +med(gaps).toFixed(1), frameGapP95Ms: +p95(gaps).toFixed(1),
    scriptPerFrameMedianMs: +med(fr.map(([, f]) => f.script)).toFixed(1),
    rafRequests: P.raf, longFrames: P.loaf.length, longFrameMaxMs: Math.round(Math.max(0, ...P.loaf)),
    // from stage.js (absent on pages built before it): frames drawn while things moved, their draw
    // calls including shadow passes, refined frames at rest, shadow map updates, contact bakes
    stage: window.__rxStats ? { liveFrames: window.__rxStats.live, drawsPerLiveFrame: window.__rxStats.live ? Math.round(window.__rxStats.liveCalls / window.__rxStats.live) : 0, refinedFrames: window.__rxStats.refined, shadowUpdates: window.__rxStats.shadows, contactBakes: window.__rxStats.bakes } : null,
    live: [...document.querySelectorAll('[data-rx-block]')].filter((b) => b.dataset.state === 'live').map((b) => b.id),
    canvases: document.querySelectorAll('canvas').length,
  };
});
const settle = async () => {
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-rx-block]')].some((b) => b.dataset.state === 'loading'), null, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(1500);
};

const report = {};
const targets = ids.length ? ids : [null];
for (const id of targets) {
  const range = await page.evaluate((id) => {
    const e = id ? document.querySelector(id)?.closest('section') || document.querySelector(id) : document.body;
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { top: Math.max(0, r.top + scrollY - 100), bottom: r.bottom + scrollY - innerHeight * 0.5 };
  }, id);
  if (!range) { console.log('no section', id); continue; }
  await page.evaluate((y) => scrollTo(0, y), range.top);
  await settle();
  await reset();
  const s0 = Date.now();
  await page.mouse.move(W / 2, H / 2);
  let y = range.top;
  while (y < range.bottom) { await page.mouse.wheel(0, STEP); y += STEP; await page.waitForTimeout(16); }
  await page.waitForTimeout(600);
  const scroll = await read();
  scroll.wallMs = Date.now() - s0;
  // park in the middle of the section and watch it idle
  await page.evaluate((y) => scrollTo(0, y), (range.top + range.bottom) / 2);
  await settle();
  await reset();
  await page.waitForTimeout(5000);
  const idle = await read();
  report[id || 'page'] = { scroll, idle: { rendered: idle.rendered, draws: idle.draws, rafRequests: idle.rafRequests, stage: idle.stage, live: idle.live, canvases: idle.canvases } };
}
console.log(JSON.stringify(report, null, 1));
console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();

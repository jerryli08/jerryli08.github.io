// What a page costs before the reader scrolls: requests, bytes, the biggest files, and when the
// hero is on screen, optionally over an emulated slow connection.
//   node tools/pages/load.mjs [slug ...] [--slow] [--phone] [--json=out.json] [--before [--oldjs=file]]
// (default: every page plus the landing, at 1440 x 900.) It loads each page, waits for the load
// event plus 5 s of idle without scrolling, and counts every response. The local server does not
// compress, so text files (HTML, CSS, JS, JSON, SVG) are also given as gzip -6 sizes ("wire"), about
// what Vercel sends; media is sent as is. --slow: 1.6 Mbit/s down, 150 ms round trip ("fast 3G").
import { chromium } from 'playwright';
import { readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const want = args.filter((a) => !a.startsWith('--'));
const slugs = want.length ? want.map((s) => (s === 'landing' ? '' : s)) : ['', ...readdirSync(new URL('../../projects/', import.meta.url)).filter((f) => f.endsWith('.html') && !f.startsWith('_')).map((f) => f.replace('.html', ''))];
const phone = opt.phone != null;
await (await import('./pwlock.mjs')).acquire();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const TEXT = /\.(html?|css|m?js|json|svg)(\?|$)|\/(\?|$)|\/[^./?]+(\?|$)/;
const out = [];
for (const slug of slugs) {
  const url = slug ? `${BASE}/projects/${slug}.html` : `${BASE}/`;
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (opt.slow != null) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  // --before: the page as round 3 shipped it (every video poster in the HTML, no hero preload, the
  // font from Google Fonts)
  if (opt.before != null) await page.route((u) => u.pathname.endsWith('.html') || u.pathname === '/' || !/\.\w+$/.test(u.pathname), async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const r = await route.fetch();
    const GF = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@75..125,200..900&display=swap">\n';
    const body = (await r.text()).replace(/ data-rx-poster=/g, ' poster=').replace(/<link rel="preload" as="image"[^>]*>\n?/g, '')
      .replace(/<link rel="preload" href="\/assets\/fonts\/[^>]*>\n?<style>@font-face[^<]*<\/style>\n?/, GF);
    await route.fulfill({ response: r, body });
  });
  if (opt.before != null && opt.oldjs) { // and the round 3 runtime (a copy of that project.js)
    const old = (await import('node:fs')).readFileSync(opt.oldjs, 'utf8');
    await page.route(/\/assets\/js\/project\.js/, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: old }));
  }
  const reqs = new Map();
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId) || {}; reqs.set(e.requestId, { ...r, url: e.response.url, type: e.type, status: e.response.status }); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.done = true; } });
  const t0 = Date.now();
  await page.addInitScript(() => {
    window.__lcp = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  });
  try { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); } catch (e) { console.log(slug, 'load:', e.message.split('\n')[0]); }
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(opt.slow != null ? 8000 : 5000);
  const lcp = await page.evaluate(() => Math.round(window.__lcp)).catch(() => 0);
  const list = [];
  for (const [id, r] of reqs) {
    if (!r.url || r.url.startsWith('data:')) continue;
    let wire = r.bytes || 0;
    if (r.url.startsWith(BASE) && TEXT.test(r.url.replace(BASE, '')) && r.status === 200) {
      try { const b = await cdp.send('Network.getResponseBody', { requestId: id }); wire = gzipSync(Buffer.from(b.body, b.base64Encoded ? 'base64' : 'utf8'), { level: 6 }).length; } catch {}
    }
    list.push({ url: r.url.replace(BASE, ''), type: r.type, bytes: r.bytes || 0, wire });
  }
  const sum = (k) => list.reduce((a, r) => a + r[k], 0);
  const byType = {};
  for (const r of list) byType[r.type] = (byType[r.type] || 0) + r.wire;
  const rec = { page: slug || '(landing)', requests: list.length, wireKB: Math.round(sum('wire') / 1024), rawKB: Math.round(sum('bytes') / 1024), loadMs, lcpMs: lcp, byTypeKB: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])), unhashed: list.filter((r) => r.url.startsWith('/assets/') && !/[?&]v=/.test(r.url)).map((r) => r.url), biggest: list.sort((a, b) => b.wire - a.wire).slice(0, 6).map((r) => `${Math.round(r.wire / 1024)} KB ${r.url.replace(/\?v=\w+/, '')}`) };
  out.push(rec);
  if (rec.unhashed.length) console.log(`  unhashed: ${rec.unhashed.slice(0, 6).join(' ')}`);
  console.log(`${rec.page.padEnd(28)} ${String(rec.requests).padStart(3)} req  ${String(rec.wireKB).padStart(6)} KB wire  load ${loadMs} ms  LCP ${lcp} ms  | ${rec.biggest.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();
if (opt.json) writeFileSync(opt.json, JSON.stringify(out, null, 1));

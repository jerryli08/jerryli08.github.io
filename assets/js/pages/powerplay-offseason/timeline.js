// The robot going from Fusion 360 to the practice field, April to August 2023, one dated picture at
// a time. Every picture is a real CAD screenshot, photo, or a still from a clip; the dates come from
// the files. A date rail along the bottom has two bands, CAD and Build (they overlap in August), and a
// cursor that walks to each picture's date. Each picture gets an equal share of the scroll (so the
// quiet June and July do not eat the scroll) and fades in over the first 20 % of its share. The
// picture is a pure function of the scroll progress p; with reduced motion it cuts.
//   data: { aria, from, to, items: [{ d, i | v, band: 'cad' | 'build', label, c, when? }] }
import { css, h, clamp, smooth, setter, urls, loader, painter } from './kit.js';

const LOCAL_CSS = `
.pp-tl .pp-count { right: 14px; top: 14px; font-variant-numeric: tabular-nums; }
.pp-tl .pp-cap { left: 0; top: 0; }
.pp-tl-rail { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; padding: 12px 26px 10px 86px; border-top: 1px solid var(--line); background: rgba(12, 10, 9, 0.9); }
.pp-tl-track { position: relative; }
.pp-tl-row { position: relative; height: 22px; }
.pp-tl-row > b { position: absolute; left: -66px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 650; letter-spacing: 0.02em; color: var(--muted); }
.pp-tl-band { position: absolute; top: 50%; height: 6px; margin-top: -3px; border-radius: 3px; background: rgba(255, 255, 255, 0.1); }
.pp-tl-row.is-cad .pp-tl-band { background: rgba(120, 170, 255, 0.22); }
.pp-tl-row.is-build .pp-tl-band { background: rgba(255, 107, 53, 0.22); }
.pp-tl-dot { position: absolute; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%; border: 2px solid var(--line-strong); background: var(--bg); }
.pp-tl-dot.seen { border-color: rgba(255, 107, 53, 0.65); }
.pp-tl-dot.on { background: var(--accent); border-color: var(--accent); transform: scale(1.35); z-index: 2; }
.pp-tl-axis { position: relative; height: 16px; margin-top: 3px; }
.pp-tl-axis span { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--muted); white-space: nowrap; }
.pp-tl-axis span::before { content: ''; position: absolute; left: 50%; top: -5px; width: 1px; height: 4px; background: var(--line-strong); }
.pp-tl-now { position: absolute; top: -4px; bottom: 16px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--accent); }
@media (max-width: 640px) {
  .pp-tl-rail { padding: 8px 12px 6px 56px; }
  .pp-tl-row { height: 18px; }
  .pp-tl-row > b { left: -48px; font-size: 10.5px; }
  .pp-tl-dot { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }
  .pp-tl-axis span { font-size: 10px; }
  .pp-tl .pp-count { right: 8px; top: 8px; }
}
`;
const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (t) => { const d = new Date(t); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };

export function mount(el, ctx) {
  css('pp-tl-css', LOCAL_CSS);
  const D = ctx.data || {};
  const U = urls(ctx);
  const S = setter();
  const reduced = ctx.reducedMotion;
  const t0 = day(D.from), t1 = day(D.to);
  const items = (D.items || []).map((x) => ({ ...x, t: day(x.d), name: x.i || x.v }));
  const N = items.length;
  if (!N) return {};
  const pct = (t) => `${((clamp((t - t0) / (t1 - t0), 0, 1)) * 100).toFixed(3)}%`;

  const root = h('div', 'pp pp-tl');
  root.setAttribute('role', 'img');
  el.appendChild(root);
  const paint = painter(root);
  const count = h('p', 'pp-chip pp-count');
  const cap = h('p', 'pp-cap');

  // the rail: CAD and Build bands, a dot per picture, month ticks, and the cursor
  const rail = h('div', 'pp-tl-rail');
  const track = h('div', 'pp-tl-track');
  const dots = [];
  for (const [key, label] of [['cad', 'CAD'], ['build', 'Build']]) {
    const row = h('div', `pp-tl-row is-${key}`); // not a bare .cad: the site styles that class
    row.append(h('b', null, label));
    const mine = items.filter((it) => it.band === key);
    if (mine.length) {
      const band = h('span', 'pp-tl-band');
      const a = Math.min(...mine.map((x) => x.t)), b = Math.max(...mine.map((x) => x.t));
      band.style.left = pct(a);
      band.style.width = `calc(${pct(b)} - ${pct(a)})`;
      row.append(band);
    }
    items.forEach((it, j) => {
      if (it.band !== key) return;
      const d = h('span', 'pp-tl-dot');
      d.style.left = pct(it.t);
      row.append(d);
      dots[j] = d;
    });
    track.append(row);
  }
  const axis = h('div', 'pp-tl-axis');
  const y0 = new Date(t0).getUTCFullYear();
  for (let m = new Date(t0).getUTCMonth(); Date.UTC(y0, m, 1) <= t1; m++) {
    const first = Date.UTC(y0, m, 1);
    if (first < t0) continue;
    const s = h('span', null, MONTHS[new Date(first).getUTCMonth()]);
    s.style.left = pct(first);
    axis.append(s);
  }
  const now = h('div', 'pp-tl-now');
  track.append(axis, now);
  rail.append(track);
  root.append(count, cap, rail);

  let small = false;
  let redraw = 0;
  // redraw when a picture the screen is waiting for arrives (not for pictures loading ahead)
  const missing = new Set();
  const load = loader((url) => { if (missing.has(url) && !redraw) redraw = requestAnimationFrame(() => { redraw = 0; draw(); }); });
  const want = (url) => { const im = load.get(url); if (!im && url) missing.add(url); return im; };
  const src = (it) => U.media(it.name, small);

  let area = { x: 0, y: 0, w: 1, h: 1 };
  function layout() {
    paint.size();
    small = paint.W < 700;
    const phone = paint.W < 640;
    const pad = phone ? 8 : 20;
    const railH = rail.offsetHeight || 80;
    const capH = phone ? 44 : 52;
    area = { x: pad, y: pad, w: paint.W - pad * 2, h: Math.max(40, paint.H - railH - pad * 2 - capH) };
    cap.style.maxWidth = `${Math.round(Math.min(area.w, 760))}px`;
    capSize = null;
  }

  let planned = -1;
  function plan(i) {
    if (planned === i) return;
    planned = i;
    const list = [];
    for (const j of [i, i + 1, i - 1, i + 2, i + 3]) {
      const it = items[j];
      if (!it) continue;
      list.push(src(it), U.bg(it.name));
    }
    load.plan(list);
  }

  let lastP = 0, capSize = null, shown = -1;
  function draw() {
    const u = clamp(lastP, 0, 0.99999) * N;
    const i = Math.min(N - 1, Math.floor(u)), f = u - i;
    const k = i === 0 ? 1 : reduced ? 1 : smooth(0, 0.2, f);
    plan(i);
    missing.clear();
    paint.clear();
    const prev = k < 1 ? items[i - 1] : null;
    if (prev) paint.cover(want(U.bg(prev.name)), 0.5);
    paint.cover(want(U.bg(items[i].name)), 0.5 * k);
    paint.shade(0.35);
    let fr = null;
    if (prev) fr = paint.contain(want(src(prev)), area, 1);
    const fc = paint.contain(want(src(items[i])), area, k);
    if (fc && k >= 0.5) fr = fc;
    const cur = k >= 0.5 || !prev ? i : i - 1;
    if (cur !== shown) {
      shown = cur;
      const it = items[cur];
      S.text(count, `${cur + 1} / ${N}`);
      dots.forEach((d, j) => { if (d) { d.classList.toggle('on', j === cur); d.classList.toggle('seen', j < cur); } });
      root.setAttribute('aria-label', `${D.aria ? `${D.aria}. ` : ''}${it.when || fmt(it.t)}: ${it.c || it.label || ''}`);
    }
    const it = items[cur];
    if (S.cap(cap, it.when || fmt(it.t), it.c || it.label || '') || !capSize) capSize = [cap.offsetWidth, cap.offsetHeight];
    const box = fr || { x: area.x, y: area.y, w: area.w, h: area.h };
    const cx = clamp(box.x + box.w / 2 - capSize[0] / 2, area.x, area.x + area.w - capSize[0]);
    S.style(cap, 'transform', `translate(${Math.round(cx)}px, ${Math.round(Math.min(area.y + area.h + 8, box.y + box.h + 10))}px)`);
    // the cursor walks from the last picture's date to this one's while this one fades in
    const t = i > 0 && !reduced ? items[i - 1].t + (items[i].t - items[i - 1].t) * smooth(0, 0.2, f) : items[i].t;
    S.style(now, 'left', pct(t));
  }

  function setProgress(p) { lastP = clamp(p, 0, 1); draw(); }
  const ro = new ResizeObserver(() => { layout(); draw(); });
  ro.observe(el);
  layout();
  setProgress(0);
  return {
    setProgress,
    dispose() { ro.disconnect(); if (redraw) cancelAnimationFrame(redraw); load.dispose(); root.remove(); },
  };
}

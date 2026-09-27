// The extension's width, driven by the scroll: four real renders of the robot from my CAD, Sep 12
// and Sep 17 2024, one per step. Each render fades in over the one before; on the two front views
// the orange marks draw themselves over the extension as you scroll and the readout fills in the
// width (15 in, then 3 in: Jerry's numbers). The renders are from different camera angles, so they
// follow each other rather than overlay. The marks are annotations drawn over the renders, not
// geometry. No CAD model exists for this season, so nothing here is 3D and nothing is modelled.
// Every picture is a pure function of (step, progress through the step).
import { css, h, mediaUrl, clamp, smooth } from './kit.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};
const LOCAL_CSS = `
.itd-w-layer { position: absolute; inset: 12px; opacity: 0; }
.itd-w-layer svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.itd-w-mark { fill: none; stroke: #ff6b35; stroke-linecap: round; stroke-opacity: 0.6; }
.itd-w-core { fill: none; stroke: #ffd2bf; stroke-linecap: round; stroke-opacity: 0.95; }
.itd-w-lead { fill: none; stroke: #ff9a6b; stroke-width: 1.5; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
.itd-w-dot { fill: #ff6b35; }
.itd-w-chip { position: absolute; transform: translate(-50%, -100%); display: grid; gap: 1px; padding: 7px 12px 8px; border-radius: 12px; background: rgba(10, 8, 7, 0.82); border: 1px solid rgba(255, 107, 53, 0.6); white-space: nowrap; }
.itd-w-chip i { font-style: normal; font-size: 12.5px; color: var(--text-2); }
.itd-w-chip b { font-size: 24px; font-weight: 800; font-stretch: 112%; letter-spacing: -0.01em; color: var(--text); line-height: 1.05; }
.itd-w .rx-hud { z-index: 3; }
.itd-w .rx-hud-row + .rx-hud-row { margin-top: 6px; }
.itd-w .rx-hud i em { transition: none; }
.itd-w-date { position: absolute; right: 16px; bottom: 16px; z-index: 3; }
@media (min-width: 641px) {
  .itd-w .rx-hud { left: 16px; right: auto; top: 16px; width: min(270px, calc(100% - 32px)); }
}
@media (max-width: 640px) {
  .itd-w-layer { inset: 6px; }
  .itd-w-chip b { font-size: 17px; }
  .itd-w-chip i { font-size: 11px; }
  .itd-w-chip { padding: 5px 9px 6px; }
  .itd-w-date { right: 8px; bottom: 8px; font-size: 11.5px; padding: 3px 9px; }
}
`;

export function mount(el, ctx) {
  css('itd-w-css', LOCAL_CSS);
  const slides = ctx.data.slides || [];
  const reduced = ctx.reducedMotion;
  const root = h('div', 'itd itd-w');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', ctx.data.aria || 'The extension on Sep 12 and Sep 17, 2024');
  el.appendChild(root);
  const small = el.clientWidth < 700;

  // one layer per render: the render and its marks share one SVG coordinate system (image pixels)
  const layers = slides.map((st) => {
    const layer = h('div', 'itd-w-layer');
    const s = svg('svg', { viewBox: `0 0 ${st.w} ${st.h}`, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' }, layer);
    svg('image', { href: mediaUrl(ctx, st.img, small), x: 0, y: 0, width: st.w, height: st.h }, s);
    const marks = svg('g', {}, s);
    for (const m of st.marks || []) {
      const pts = m.pts.map((p) => p.join(',')).join(' ');
      svg('polyline', { points: pts, class: 'itd-w-mark', 'stroke-width': m.w || 26, pathLength: 1, 'stroke-dasharray': '1 1' }, marks);
      svg('polyline', { points: pts, class: 'itd-w-core', 'stroke-width': Math.max(3, (m.w || 26) * 0.16), pathLength: 1, 'stroke-dasharray': '1 1' }, marks);
    }
    const ann = svg('g', {}, s);
    for (const [x, y] of st.leads || []) {
      svg('line', { x1: st.chip[0], y1: st.chip[1], x2: x, y2: y, class: 'itd-w-lead' }, ann);
      svg('circle', { cx: x, cy: y, r: Math.max(6, st.w / 180), class: 'itd-w-dot' }, ann);
    }
    let chip = null;
    if (st.width) {
      chip = h('div', 'itd-w-chip');
      chip.append(h('i', null, st.chipText), h('b', null, st.width));
      layer.append(chip);
    }
    root.appendChild(layer);
    return { layer, st, lines: [...marks.children], marks, ann, chip, v: {} };
  });

  // readout: Jerry's two widths as bars on one scale, filling in as the marks draw
  const hud = h('div', 'rx-hud');
  hud.append(h('p', 'itd-kicker', ctx.data.meterTitle || 'Extension width'));
  const measured = slides.map((st, j) => ({ st, j })).filter((x) => x.st.inches);
  const max = Math.max(...measured.map((x) => x.st.inches));
  const rows = measured.map(({ st, j }) => {
    const r = h('div', 'rx-hud-row');
    const bar = h('i'); const em = h('em'); bar.append(em);
    r.append(h('span', null, st.short || st.date), h('b', null, st.width), bar);
    hud.append(r);
    return { j, em, frac: st.inches / max, v: '' };
  });
  root.appendChild(hud);
  const date = h('p', 'itd-chip itd-w-date');
  root.appendChild(date);

  // place the HTML chips over the render (the SVG letterboxes it inside the layer); resize only
  function place() {
    for (const { layer, chip, st } of layers) {
      if (!chip) continue;
      const W = layer.clientWidth, H = layer.clientHeight;
      const k = Math.min(W / st.w, H / st.h), ox = (W - st.w * k) / 2, oy = (H - st.h * k) / 2;
      const cw = chip.offsetWidth || 150, ch = chip.offsetHeight || 50;
      const x = clamp(ox + st.chip[0] * k, cw / 2 + 6, W - cw / 2 - 6);
      const y = clamp(oy + st.chip[1] * k, ch + 6, H - 6);
      chip.style.left = `${x}px`; chip.style.top = `${y}px`;
    }
  }
  const put = (o, key, el2, prop, val) => { if (o[key] !== val) { o[key] = val; el2.style[prop] = val; } };

  let cur = -1, hudA = '';
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, slides.length - 1);
    const q = clamp(stepP, 0, 1);
    const fade = s === 0 || reduced ? 1 : smooth(0, 0.35, q);
    const drawOf = (j) => (j < s ? 1 : j > s ? 0 : reduced ? (q >= 0.3 ? 1 : 0) : smooth(0.3, 0.75, q));
    layers.forEach((L, j) => {
      const o = j === s ? fade : j === s - 1 && fade < 1 ? 1 : 0;
      put(L.v, 'o', L.layer, 'opacity', String(o));
      put(L.v, 'z', L.layer, 'zIndex', j === s ? '2' : '1');
      if (o === 0) return;
      const d = L.lines.length ? drawOf(j) : 0;
      const off = (1 - d).toFixed(4);
      if (L.v.off !== off) { L.v.off = off; L.lines.forEach((ln) => ln.setAttribute('stroke-dashoffset', off)); L.marks.style.opacity = d > 0.002 ? '1' : '0'; }
      const a = j < s ? 1 : reduced ? (q >= 0.6 ? 1 : 0) : smooth(0.6, 0.85, q);
      put(L.v, 'a', L.ann, 'opacity', String(a));
      if (L.chip) put(L.v, 'c', L.chip, 'opacity', String(a));
    });
    // the readout comes in with the first marked render
    const first = measured.length ? measured[0].j : 0;
    const ha = s < first ? '0' : s === first ? String(reduced ? 1 : smooth(0.1, 0.35, q)) : '1';
    if (ha !== hudA) { hudA = ha; hud.style.opacity = ha; }
    for (const r of rows) {
      const w = `${(drawOf(r.j) * r.frac * 100).toFixed(2)}%`;
      if (w !== r.v) { r.v = w; r.em.style.width = w; }
    }
    const shown = fade >= 0.5 ? s : Math.max(0, s - 1);
    if (shown !== cur) {
      cur = shown;
      date.replaceChildren(h('b', null, slides[shown].date), document.createTextNode(` ${slides[shown].note || ''}`));
    }
  }

  const ro = new ResizeObserver(place);
  ro.observe(root);
  setProgress(0, 0, 0);
  requestAnimationFrame(place);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}

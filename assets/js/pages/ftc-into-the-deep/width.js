// Extension width, before and after: the two real renders of the robot from Sep 12 and Sep 17 2024,
// switched in the same frame. The renders are from different camera angles, so this is a switch,
// not a pixel-aligned wipe. The orange marks are annotations drawn over the renders to show which
// part is the extension; the widths (15 in, 3 in) are Jerry's numbers. No CAD model exists for this
// season, so nothing here is 3D and nothing is modelled.
import { css, h, mediaUrl } from './kit.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};
const LOCAL_CSS = `
.itd-w { outline: none; }
.itd-w-layer { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.itd-w-layer.on { opacity: 1; }
.itd-w-layer svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.itd-w-mark { fill: none; stroke: #ff6b35; stroke-linecap: round; stroke-opacity: 0.55; }
.itd-w-core { fill: none; stroke: #ffd2bf; stroke-linecap: round; stroke-opacity: 0.9; }
.itd-w-lead { fill: none; stroke: #ff9a6b; stroke-width: 1.5; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
.itd-w-dot { fill: #ff6b35; }
.itd-w-hide .itd-w-ann { opacity: 0; }
.itd-w-ann { transition: opacity 0.25s; }
.itd-reduced .itd-w-ann { transition: none; }
.itd-w-chip { position: absolute; transform: translate(-50%, -100%); display: grid; gap: 1px; padding: 7px 12px 8px; border-radius: 12px; background: rgba(10, 8, 7, 0.8); border: 1px solid rgba(255, 107, 53, 0.55); white-space: nowrap; pointer-events: none; }
.itd-w-chip i { font-style: normal; font-size: 12px; color: var(--text-2); }
.itd-w-chip b { font-size: 22px; font-weight: 800; font-stretch: 112%; letter-spacing: -0.01em; color: var(--text); line-height: 1.05; }
.itd-w-meter { position: absolute; left: 14px; top: 14px; z-index: 2; width: min(250px, calc(100% - 28px)); padding: 10px 12px 11px; border-radius: 12px; background: rgba(10, 8, 7, 0.72); border: 1px solid rgba(255, 255, 255, 0.12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.itd-w-row { display: grid; grid-template-columns: 48px 1fr 40px; align-items: center; gap: 8px; margin-top: 7px; font-size: 12.5px; color: var(--muted); transition: color 0.25s; }
.itd-w-row.on { color: var(--text); }
.itd-w-bar { height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
.itd-w-bar > span { display: block; height: 100%; border-radius: 4px; background: rgba(255, 255, 255, 0.35); transition: background 0.25s; }
.itd-w-row.on .itd-w-bar > span { background: #ff6b35; }
.itd-w-row b { text-align: right; font-weight: 650; font-variant-numeric: tabular-nums; }
.itd-w-date { position: absolute; right: 14px; bottom: 12px; z-index: 2; }
@media (max-width: 640px) {
  .itd-w-chip b { font-size: 17px; }
  .itd-w-chip { padding: 5px 9px 6px; }
  .itd-w-meter { left: 10px; top: 10px; padding: 8px 10px 9px; }
}
`;

export function mount(el, ctx) {
  css();
  if (!document.getElementById('itd-w-css')) {
    const s = h('style'); s.id = 'itd-w-css'; s.textContent = LOCAL_CSS; document.head.appendChild(s);
  }
  const states = ctx.data.states || [];
  const root = h('div', `itd itd-w${ctx.reducedMotion ? ' itd-reduced' : ''}`);
  root.tabIndex = 0;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', ctx.data.aria || 'Extension width, before and after');
  el.appendChild(root);

  // one layer per render: the image and its marks share one SVG coordinate system (image pixels)
  const layers = states.map((st) => {
    const layer = h('div', 'itd-w-layer itd-fade');
    const s = svg('svg', { viewBox: `0 0 ${st.w} ${st.h}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': st.alt || st.label }, layer);
    svg('image', { href: mediaUrl(ctx, st.img), x: 0, y: 0, width: st.w, height: st.h }, s);
    const ann = svg('g', { class: 'itd-w-ann' }, s);
    for (const m of st.marks || []) {
      const pts = m.pts.map((p) => p.join(',')).join(' ');
      svg('polyline', { points: pts, class: 'itd-w-mark', 'stroke-width': m.w || 26 }, ann);
      svg('polyline', { points: pts, class: 'itd-w-core', 'stroke-width': Math.max(3, (m.w || 26) * 0.16) }, ann);
    }
    for (const [x, y] of st.leads || []) {
      svg('line', { x1: st.chip[0], y1: st.chip[1], x2: x, y2: y, class: 'itd-w-lead' }, ann);
      svg('circle', { cx: x, cy: y, r: Math.max(6, st.w / 180), class: 'itd-w-dot' }, ann);
    }
    const chip = h('div', 'itd-w-chip itd-w-ann');
    chip.append(h('i', null, st.chipText), h('b', null, st.width));
    layer.append(chip);
    root.appendChild(layer);
    return { layer, chip, st };
  });

  // width meter: Jerry's two numbers as bars on one scale
  const meter = h('div', 'itd-w-meter');
  meter.append(h('p', 'itd-kicker', ctx.data.meterTitle || 'Extension width'));
  const max = Math.max(...states.map((s) => s.inches));
  const rows = states.map((st) => {
    const r = h('div', 'itd-w-row');
    const bar = h('div', 'itd-w-bar'); const fill = h('span'); fill.style.width = `${(st.inches / max) * 100}%`; bar.append(fill);
    r.append(h('span', null, st.short), bar, h('b', null, st.width));
    meter.append(r);
    return r;
  });
  root.appendChild(meter);
  const date = h('p', 'itd-chip itd-w-date');
  root.appendChild(date);

  // place the HTML chips over the image (the SVG letterboxes the render inside the stage)
  function place() {
    const W = root.clientWidth, H = root.clientHeight;
    for (const { chip, st } of layers) {
      const k = Math.min(W / st.w, H / st.h), ox = (W - st.w * k) / 2, oy = (H - st.h * k) / 2;
      let x = ox + st.chip[0] * k, y = oy + st.chip[1] * k;
      const cw = chip.offsetWidth || 150, ch = chip.offsetHeight || 50;
      x = Math.min(W - cw / 2 - 8, Math.max(cw / 2 + 8, x));
      y = Math.min(H - 8, Math.max(ch + 8, y));
      chip.style.left = `${x}px`; chip.style.top = `${y}px`;
    }
  }

  let cur = -1, marks = true;
  function show(i) {
    i = (i + states.length) % states.length;
    if (i === cur) return;
    cur = i;
    layers.forEach((l, j) => l.layer.classList.toggle('on', j === i));
    rows.forEach((r, j) => r.classList.toggle('on', j === i));
    date.replaceChildren(h('b', null, states[i].date), document.createTextNode(` ${states[i].dateNote || ''}`));
    seg.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    place();
  }

  // controls: the two renders, and marks on / off
  const wrap = h('div', 'rx-ui rx-seg');
  const lab = h('span', 'rx-ui-l', ctx.data.switchLabel || 'Render'); lab.id = `${ctx.id}-lab`;
  const group = h('div', 'rx-seg-g'); group.setAttribute('role', 'group'); group.setAttribute('aria-labelledby', lab.id);
  const seg = states.map((st, j) => {
    const b = h('button', 'rx-seg-b', st.label); b.type = 'button';
    b.addEventListener('click', () => show(j));
    group.append(b);
    return b;
  });
  wrap.append(lab, group);
  const markBtn = h('button', 'rx-ui rx-btn', ctx.data.marksLabel || 'Mark the extension');
  markBtn.type = 'button';
  markBtn.setAttribute('aria-pressed', 'true');
  markBtn.addEventListener('click', () => {
    marks = !marks;
    root.classList.toggle('itd-w-hide', !marks);
    markBtn.setAttribute('aria-pressed', String(marks));
  });
  ctx.panel?.append(wrap, markBtn);

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { show(cur + (e.key === 'ArrowRight' ? 1 : -1)); e.preventDefault(); }
  });
  root.addEventListener('click', () => show(cur + 1)); // tap the picture to switch

  const ro = new ResizeObserver(place);
  ro.observe(root);
  show(0);
  requestAnimationFrame(place);

  return {
    dispose() { ro.disconnect(); root.remove(); },
  };
}

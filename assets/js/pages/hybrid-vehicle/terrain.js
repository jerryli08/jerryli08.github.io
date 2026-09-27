// Terrain test results from the research poster's Table 1, revealed by the scroll: average
// straight-line and turning speed of the rover on six surfaces, 3 trials each at a constant 8.0 V.
// Two separate charts (two units, never one dual axis), the same surface order in both, one hue,
// values at the bar tips. Grass has no bar: the rover could not cross it. Plain SVG, no WebGL.
// u = step + progress through the step (0..6); every picture is a pure function of u:
//   0  the straight-line bars grow in      3  sand: the fastest natural surface for turning
//   1  concrete, the fastest straight      4  forest floor: less than a third of foam's rate
//   2  the turning bars grow; foam and     5  grass: could not cross
//      concrete (synthetic) lead
const DATA = [
  { s: 'Foam', lin: 0.6234, ang: 4.203, syn: true },
  { s: 'Concrete', lin: 0.6276, ang: 4.046, syn: true },
  { s: 'Grass', lin: 0, ang: 0, none: true },
  { s: 'Mulch', lin: 0.5747, ang: 1.882 },
  { s: 'Sand', lin: 0.5980, ang: 3.403 },
  { s: 'Forest floor', lin: 0.5853, ang: 1.254 },
];
const CHARTS = [
  { key: 'lin', title: 'Straight-line speed', unit: 'm/s', max: 0.7, ticks: [0, 0.2, 0.4, 0.6], fmt: (v) => v.toFixed(2), grow: 0 },
  { key: 'ang', title: 'Turning speed', unit: 'rad/s', max: 4.8, ticks: [0, 1, 2, 3, 4], fmt: (v) => v.toFixed(2), grow: 2 },
];
// which bars each step picks out, per chart (surface names); an empty list means none is dimmed
const PICK = [
  { lin: [], ang: [] },
  { lin: ['Concrete'], ang: [] },
  { lin: [], ang: ['Foam', 'Concrete'] },
  { lin: [], ang: ['Sand'] },
  { lin: ['Forest floor'], ang: ['Forest floor', 'Foam'] },
  { lin: ['Grass'], ang: ['Grass'] },
];
const NS = 'http://www.w3.org/2000/svg';
const INK = '#eee9e3', INK2 = '#b8b0a7', MUTED = '#8c847b', GRID = 'rgba(237,232,226,0.1)', BAR = '#ff6b35', GRASS = '#ff9a6b';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:clamp(10px,3vh,34px);padding:clamp(16px,3vw,44px);font-family:inherit';
  el.appendChild(wrap);
  let built = '', rows = [];
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; };

  function build() {
    const key = `${el.clientWidth}x${el.clientHeight}`;
    if (key === built) return;
    built = key;
    wrap.replaceChildren();
    rows = [];
    const pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 24;
    const cw = Math.max(260, el.clientWidth - pad * 2), gap = parseFloat(getComputedStyle(wrap).rowGap) || 16;
    const ch = Math.max(170, Math.min(380, (el.clientHeight - pad * 2 - gap) / 2));
    const small = cw < 520;
    for (const c of CHARTS) {
      const svg = svgEl('svg', { width: cw, height: ch, viewBox: `0 0 ${cw} ${ch}`, role: 'img', 'aria-label': `${c.title} by surface, ${c.unit}: ${DATA.map((d) => `${d.s} ${d.none ? 'could not cross' : c.fmt(d[c.key])}`).join(', ')}` });
      svg.style.display = 'block';
      wrap.appendChild(svg);
      const left = small ? 88 : 110, right = 60, top = 34, bottom = 24;
      const plotW = cw - left - right, rowH = (ch - top - bottom) / DATA.length, barH = Math.min(22, rowH * 0.58);
      const x = (v) => left + (v / c.max) * plotW;
      svgEl('text', { x: 0, y: 16, fill: INK, 'font-size': small ? 15 : 17, 'font-weight': 650 }, svg).textContent = c.title;
      svgEl('text', { x: cw, y: 16, fill: MUTED, 'font-size': 13, 'text-anchor': 'end' }, svg).textContent = c.unit;
      for (const tk of c.ticks) {
        svgEl('line', { x1: x(tk), x2: x(tk), y1: top - 4, y2: ch - bottom, stroke: GRID, 'stroke-width': 1 }, svg);
        svgEl('text', { x: x(tk), y: ch - 6, fill: MUTED, 'font-size': 12, 'text-anchor': 'middle', 'font-variant-numeric': 'tabular-nums' }, svg).textContent = String(tk);
      }
      DATA.forEach((d, i) => {
        const cy = top + rowH * (i + 0.5), v = d[c.key];
        const label = svgEl('text', { x: left - 12, y: cy + 4.5, fill: INK2, 'font-size': small ? 13 : 14.5, 'text-anchor': 'end' }, svg);
        label.textContent = d.s;
        const r = { c, d, i, cy, left, x, barH, label, w: x(v) - left, drawn: {} };
        if (d.none) {
          r.val = svgEl('text', { x: left + 8, y: cy + 4.5, fill: MUTED, 'font-size': 13, 'font-style': 'italic' }, svg);
          r.val.textContent = 'could not cross';
        } else {
          r.bar = svgEl('path', { d: '', fill: BAR }, svg);
          r.val = svgEl('text', { x: left, y: cy + 4.5, fill: INK, 'font-size': 13.5, 'font-weight': 600, 'font-variant-numeric': 'tabular-nums' }, svg);
          r.val.textContent = c.fmt(v);
        }
        if (c.key === 'ang' && d.syn) {
          // written inside the bar's end, so it fits on any width
          r.tag = svgEl('text', { x: left + 8, y: cy + 4, fill: '#24160d', 'font-size': 12, 'font-weight': 600, 'font-style': 'italic', 'text-anchor': 'end' }, svg);
          r.tag.textContent = 'synthetic';
        }
        rows.push(r);
      });
    }
  }
  const put = (r, k, attr, v, node) => { if (r.drawn[k] !== v) { (node || r.bar).setAttribute(attr, v); r.drawn[k] = v; } };
  const pickSet = (s, key) => PICK[clamp(s, 0, PICK.length - 1)][key];

  function setProgress(p, step, stepP) {
    build();
    const u = clamp(step + stepP, 0, 6);
    const s = clamp(step, 0, PICK.length - 1);
    const k = reduced || s === 0 ? 1 : smooth(0, 0.45, stepP);
    for (const r of rows) {
      const { c, d, i } = r;
      // grow in, row by row, over the step that brings the chart in
      const g = reduced ? (u >= c.grow ? 1 : 0) : smooth(c.grow + 0.04 + i * 0.05, c.grow + 0.4 + i * 0.05, u);
      // picked out now (1), dimmed (0.3), or neither (1); blended in from the previous step
      const lvl = (st) => { const set = pickSet(st, c.key); return !set.length || set.includes(d.s) ? 1 : 0.3; };
      const a = lerp(lvl(Math.max(0, s - 1)), lvl(s), k);
      const op = (Math.round(a * g * 100) / 100).toString();
      if (r.bar) {
        const w = r.w * g, h = r.barH, y0 = r.cy - h / 2, L = r.left, rr = Math.min(4, h / 2, w);
        const path = w < 0.5 ? '' : `M${L} ${y0}H${(L + w - rr).toFixed(1)}Q${(L + w).toFixed(1)} ${y0} ${(L + w).toFixed(1)} ${(y0 + rr).toFixed(1)}V${(y0 + h - rr).toFixed(1)}Q${(L + w).toFixed(1)} ${(y0 + h).toFixed(1)} ${(L + w - rr).toFixed(1)} ${(y0 + h).toFixed(1)}H${L}Z`;
        put(r, 'd', 'd', path);
        put(r, 'o', 'opacity', (Math.round(a * 100) / 100).toString());
        put(r, 'vx', 'x', (L + w + 8).toFixed(1), r.val);
        put(r, 'vo', 'opacity', op, r.val);
        put(r, 'lo', 'opacity', (0.55 + 0.45 * a).toFixed(2), r.label);
      } else {
        // grass: the note shows with the chart; the last step lights it up
        const hot = lerp(pickSet(Math.max(0, s - 1), c.key).includes('Grass') ? 1 : 0, pickSet(s, c.key).includes('Grass') ? 1 : 0, k);
        put(r, 'vo', 'opacity', (Math.round(g * (0.3 + 0.7 * a) * 100) / 100).toString(), r.val);
        put(r, 'vf', 'fill', hot > 0.5 ? GRASS : MUTED, r.val);
        put(r, 'lo', 'opacity', (0.55 + 0.45 * a).toFixed(2), r.label);
      }
      if (r.tag) {
        const on = u >= 2 ? g * smooth(2.3, 2.5, u) : 0;
        put(r, 'tx', 'x', (r.left + r.w * g - 8).toFixed(1), r.tag);
        put(r, 'to', 'opacity', (Math.round(on * a * 100) / 100).toString(), r.tag);
      }
    }
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { wrap.remove(); } };
}

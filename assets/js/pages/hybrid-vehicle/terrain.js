// Terrain test results from the research poster's Table 1: average straight-line and turning speed
// of the rover on six surfaces, 3 trials each at a constant 8.0 V. Two separate charts (two units,
// never one dual axis), the same surface order in both, one hue, values at the bar tips and exact
// values on hover. Grass has no bar: the rover could not cross it. Plain SVG, no WebGL.
const DATA = [
  { s: 'Foam', lin: 0.6234, ang: 4.203 },
  { s: 'Concrete', lin: 0.6276, ang: 4.046 },
  { s: 'Grass', lin: 0, ang: 0, none: true },
  { s: 'Mulch', lin: 0.5747, ang: 1.882 },
  { s: 'Sand', lin: 0.5980, ang: 3.403 },
  { s: 'Forest floor', lin: 0.5853, ang: 1.254 },
];
const CHARTS = [
  { key: 'lin', title: 'Straight-line speed', unit: 'm/s', max: 0.7, ticks: [0, 0.2, 0.4, 0.6], fmt: (v) => v.toFixed(2), tip: (v) => `${v.toFixed(4)} m/s` },
  { key: 'ang', title: 'Turning speed', unit: 'rad/s', max: 4.8, ticks: [0, 1, 2, 3, 4], fmt: (v) => v.toFixed(2), tip: (v) => `${v.toFixed(3)} rad/s` },
];
const NS = 'http://www.w3.org/2000/svg';
const INK = '#eee9e3', INK2 = '#b8b0a7', MUTED = '#8c847b', GRID = 'rgba(237,232,226,0.1)', BAR = '#ff6b35', BAR_HI = '#ff9a6b';

export function mount(el) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-wrap:wrap;align-content:center;gap:8px 28px;padding:18px 22px;font-family:inherit';
  el.appendChild(wrap);
  const tipEl = document.createElement('div');
  tipEl.style.cssText = 'position:absolute;z-index:3;pointer-events:none;padding:6px 10px;border-radius:10px;background:rgba(10,8,7,.9);border:1px solid rgba(255,255,255,.16);font-size:12.5px;color:#eee9e3;white-space:nowrap;opacity:0;transition:opacity .15s';
  el.appendChild(tipEl);

  function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; }
  function draw() {
    wrap.replaceChildren();
    // content box: the wrap's padding is 18 px top and bottom, 22 px left and right
    const W = wrap.clientWidth - 44, H = wrap.clientHeight - 36;
    const stacked = W < 640;
    const cw = stacked ? W : Math.floor((W - 28) / 2) - 2, ch = stacked ? Math.floor((H - 8) / 2) : Math.min(H, 360);
    for (const c of CHARTS) {
      const svg = svgEl('svg', { width: cw, height: ch, viewBox: `0 0 ${cw} ${ch}`, role: 'img', 'aria-label': `${c.title} by surface, ${c.unit}` });
      svg.style.display = 'block';
      wrap.appendChild(svg);
      const left = stacked ? 84 : 96, right = 44, top = 30, bottom = 22;
      const plotW = cw - left - right, rowH = (ch - top - bottom) / DATA.length, barH = Math.min(18, rowH * 0.56);
      const x = (v) => left + (v / c.max) * plotW;
      svgEl('text', { x: 0, y: 14, fill: INK, 'font-size': 14, 'font-weight': 650 }, svg).textContent = c.title;
      svgEl('text', { x: cw, y: 14, fill: MUTED, 'font-size': 12, 'text-anchor': 'end' }, svg).textContent = c.unit;
      for (const tk of c.ticks) {
        svgEl('line', { x1: x(tk), x2: x(tk), y1: top - 4, y2: ch - bottom, stroke: GRID, 'stroke-width': 1 }, svg);
        svgEl('text', { x: x(tk), y: ch - 6, fill: MUTED, 'font-size': 11, 'text-anchor': 'middle', 'font-variant-numeric': 'tabular-nums' }, svg).textContent = String(tk);
      }
      DATA.forEach((d, i) => {
        const cy = top + rowH * (i + 0.5), v = d[c.key];
        svgEl('text', { x: left - 10, y: cy + 4, fill: INK2, 'font-size': 12.5, 'text-anchor': 'end' }, svg).textContent = d.s;
        if (d.none) {
          svgEl('text', { x: left + 6, y: cy + 4, fill: MUTED, 'font-size': 12, 'font-style': 'italic' }, svg).textContent = 'could not cross';
          return;
        }
        const w = x(v) - left, r = Math.min(4, barH / 2, w);
        // square at the baseline, 4 px rounded at the data end
        const path = `M${left} ${cy - barH / 2} H${left + w - r} Q${left + w} ${cy - barH / 2} ${left + w} ${cy - barH / 2 + r} V${cy + barH / 2 - r} Q${left + w} ${cy + barH / 2} ${left + w - r} ${cy + barH / 2} H${left} Z`;
        const bar = svgEl('path', { d: path, fill: BAR }, svg);
        svgEl('text', { x: left + w + 6, y: cy + 4, fill: INK, 'font-size': 12, 'font-weight': 600, 'font-variant-numeric': 'tabular-nums' }, svg).textContent = c.fmt(v);
        // the whole row is the hover target, bigger than the bar
        const hit = svgEl('rect', { x: 0, y: cy - rowH / 2, width: cw, height: rowH, fill: 'transparent' }, svg);
        const on = (e) => {
          bar.setAttribute('fill', BAR_HI);
          tipEl.textContent = `${d.s}: ${c.tip(v)}`;
          const r0 = el.getBoundingClientRect();
          const px = (e.touches?.[0] || e).clientX - r0.left, py = (e.touches?.[0] || e).clientY - r0.top;
          tipEl.style.left = `${Math.min(px + 12, r0.width - tipEl.offsetWidth - 6)}px`;
          tipEl.style.top = `${Math.max(4, py - 34)}px`;
          tipEl.style.opacity = '1';
        };
        const off = () => { bar.setAttribute('fill', BAR); tipEl.style.opacity = '0'; };
        hit.addEventListener('pointermove', on); hit.addEventListener('pointerdown', on); hit.addEventListener('pointerleave', off);
      });
    }
  }
  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(el);
  return { dispose() { ro.disconnect(); wrap.remove(); tipEl.remove(); } };
}

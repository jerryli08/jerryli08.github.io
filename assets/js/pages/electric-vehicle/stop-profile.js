// How each sketch brings the car in: scroll-driven, 2D (SVG, no WebGL).
// No physics: each curve is exactly what one sketch in github.com/jerryli08/sciolyEv sends to the
// ESC as a function of the distance the encoder has counted, over the last 4 m before the target.
// The x axis is the counted distance relative to each sketch's own target, so the sketches share
// one chart. One step per sketch, oldest first; the earlier sketches stay as faint lines. In each
// step a cursor (the car) runs from 4 m out to past the target as the reader scrolls, and the
// readout shows the command and the ESC pulse there.
// power is -1..1; the bidirectional sketches send a pulse of 1500 + 500 x power microseconds
// (1500 neutral, 2000 full forward, below 1500 reverse). fullEvCode, the earliest closed loop, is
// forward only: 1050 + 950 x power, and 1000 (motor off) once it is inside its overshoot margin.
// Every picture is a pure function of (step, stepP).
import { hud, clamp, smooth, lerp } from './rig.js';

const SK = [
  {
    label: 'fullEvCode', T: 700,
    f(d, T) { return d < T - 60 ? Math.min(1, (12.5 * (T - 60 - d)) / (T - 60)) : 0; },
    phases: (T) => [['cruise', -Infinity, T - 60 - (T - 60) / 12.5], ['ramp', T - 60 - (T - 60) / 12.5, T - 60], ['motor off, coasting', T - 60, Infinity]],
    pulse: (p, d, T) => (d < T - 60 ? 1050 + 950 * p : 1000),
  },
  {
    label: 'AWDGearedEncoderCode', T: 500 * 0.99142857142,
    f(d, T) {
      const e = T - d;
      let p = d < 100 ? Math.sqrt(Math.max(0, d) / 100) + 0.12 : e > 200 ? 1 : e > 50 ? e / 200 : e > 0 ? 0.1 : 0;
      p = clamp(p, -1, 1);
      if (p > 0) p += 0.053; else if (p < 0) p -= 0.033;
      return p;
    },
    phases: (T) => [['cruise', -Infinity, T - 200], ['proportional', T - 200, T - 50], ['creep', T - 50, T], ['stop', T, Infinity]],
    pulse: (p) => 1500 + 500 * p,
  },
  {
    label: 'regionalsCode', T: 823,
    f(d, T) {
      if (d < T - 300) return 1;
      if (T - d > 20) return clamp((T - 20 - d) / (T - 20) + 0.08, -1, 1);
      if (d < T) return 0.08;
      return 0;
    },
    phases: (T) => [['cruise', -Infinity, T - 300], ['ramp down', T - 300, T - 20], ['creep', T - 20, T], ['stop', T, Infinity]],
    pulse: (p) => 1500 + 500 * p,
  },
  {
    // SOUPCode and PUSOCode are the same sketch with a different target (823 and 888 cm)
    label: 'SOUPCode / PUSOCode', T: 823,
    f(d, T) {
      let p = d < 180 ? d / 180 + 0.08 : d < T - 300 ? 1 : clamp(0.002 * (T - d), -1, 1);
      if (p > 0) p += 0.08;
      return clamp(p, -1, 1);
    },
    phases: (T) => [['cruise', -Infinity, T - 300], ['P approach', T - 300, T], ['reverse', T, Infinity]],
    pulse: (p) => 1500 + 500 * p,
  },
];
const PHASE_COL = { cruise: 'rgba(237,232,226,0.035)', reverse: 'rgba(255,93,93,0.12)', stop: 'rgba(237,232,226,0.07)', 'motor off, coasting': 'rgba(255,93,93,0.09)' };
const X0 = -400, X1 = 25; // cm relative to the target
const Y0 = -0.15, Y1 = 1.12;
const LINE = '#ff6b35', GHOST = 'rgba(237,232,226,0.28)', TARGET = '#4cc38a';

export function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('role', 'img');
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  el.append(svg);
  const H = hud(el, `
    <div class="rx-hud-row"><span>Sketch</span><b data-k="name"></b></div>
    <table class="num"><tbody>
      <tr><td>Distance counted</td><td data-k="d"></td></tr>
      <tr><td>To the target</td><td data-k="left"></td></tr>
      <tr><td>Power command</td><td data-k="p"></td></tr>
      <tr><td>ESC pulse</td><td data-k="us"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);
  H.el.style.zIndex = '2';

  const mk = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
  const txt = (parent, s, attrs) => { const t = mk('text', attrs, parent); t.textContent = s; return t; };
  let G = null, built = '';
  function build() {
    const W = el.clientWidth, Ht = el.clientHeight;
    const key = `${W}x${Ht}`;
    if (!W || !Ht || key === built) return;
    built = key;
    svg.setAttribute('viewBox', `0 0 ${W} ${Ht}`);
    svg.textContent = '';
    const narrow = W < 640;
    // desktop: the readout sits in the empty lower left of the chart; phone: across the top
    if (narrow) Object.assign(H.el.style, { top: '', left: '', right: '', bottom: '' });
    const m = { l: narrow ? 40 : 58, r: narrow ? 14 : 30, t: narrow ? H.el.offsetHeight + 40 : 64, b: 46 };
    const X = (x) => m.l + ((x - X0) / (X1 - X0)) * (W - m.l - m.r);
    const Y = (p) => m.t + ((Y1 - p) / (Y1 - Y0)) * (Ht - m.t - m.b);
    if (!narrow) Object.assign(H.el.style, { top: 'auto', right: 'auto', left: `${m.l + 16}px`, bottom: `${m.b + 22}px`, width: 'min(340px, 40%)' });
    // grid and axes
    const grid = mk('g', {});
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      mk('line', { x1: m.l, x2: W - m.r, y1: Y(p), y2: Y(p), stroke: p === 0 ? 'rgba(237,232,226,0.35)' : 'rgba(237,232,226,0.08)' }, grid);
      txt(grid, p.toFixed(p % 1 ? 2 : 0), { x: m.l - 8, y: Y(p) + 4, 'text-anchor': 'end', fill: '#8c847b', 'font-size': 11 });
    }
    const step = narrow ? 100 : 50;
    for (let x = X0; x <= X1; x += step) {
      mk('line', { x1: X(x), x2: X(x), y1: Ht - m.b, y2: Ht - m.b + 5, stroke: 'rgba(237,232,226,0.3)' }, grid);
      txt(grid, String(x), { x: X(x), y: Ht - m.b + 18, 'text-anchor': 'middle', fill: '#8c847b', 'font-size': 11 });
    }
    txt(grid, 'distance counted, relative to the target (cm)', { x: W - m.r, y: Ht - 8, 'text-anchor': 'end', fill: '#b8b0a7', 'font-size': 11.5 });
    txt(grid, 'power command', { x: m.l, y: m.t - 16, fill: '#b8b0a7', 'font-size': 11.5 });
    if (!narrow) txt(grid, 'earlier sketches in grey', { x: W - m.r, y: m.t - 16, 'text-anchor': 'end', fill: '#8c847b', 'font-size': 11.5 });
    // per sketch: its phases (shaded bands) and its curve, sampled every 0.5 cm (steps are real steps in the code)
    const sk = SK.map((s) => {
      const bands = mk('g', { opacity: 0 });
      for (const [name, a, b] of s.phases(s.T)) {
        const xa = X(Math.max(a - s.T, X0)), xb = X(Math.min(b - s.T, X1));
        if (xb <= xa) continue;
        mk('rect', { x: xa, y: m.t, width: xb - xa, height: Ht - m.t - m.b, fill: PHASE_COL[name] || 'rgba(255,107,53,0.07)' }, bands);
        // the phase's name, only where it fits its band
        if (xb - xa > name.length * (narrow ? 5.6 : 6.2) + 10) txt(bands, name, { x: (xa + xb) / 2, y: m.t + 16, 'text-anchor': 'middle', fill: '#8c847b', 'font-size': narrow ? 10.5 : 11.5 });
      }
      let d = '';
      for (let x = X0; x <= X1; x += 0.5) d += `${x === X0 ? 'M' : 'L'}${X(x).toFixed(1)},${Y(s.f(s.T + x, s.T)).toFixed(1)}`;
      const path = mk('path', { d, fill: 'none', stroke: GHOST, 'stroke-width': 1.5, 'stroke-linejoin': 'round', opacity: 0 });
      return { bands, path };
    });
    svg.insertBefore(grid, svg.firstChild);
    for (const s of sk) svg.insertBefore(s.bands, grid.nextSibling);
    // the target and the car
    mk('line', { x1: X(0), x2: X(0), y1: m.t, y2: Ht - m.b, stroke: TARGET, 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    txt(svg, 'target', { x: X(0) - 5, y: Ht - m.b - 8, 'text-anchor': 'end', fill: TARGET, 'font-size': 11.5, 'font-weight': 600 });
    const cur = mk('line', { y1: m.t, y2: Ht - m.b, stroke: 'rgba(237,232,226,0.45)' });
    const dot = mk('circle', { r: 5.5, fill: LINE, stroke: '#0b0a09', 'stroke-width': 2 });
    const car = txt(svg, 'car', { y: Ht - m.b - 8, 'text-anchor': 'middle', fill: '#eee9e3', 'font-size': 11.5, 'font-weight': 600 });
    G = { X, Y, W, sk, cur, dot, car };
  }

  const set = (node, attr, v) => { if (node[`_${attr}`] !== v) { node[`_${attr}`] = v; node.setAttribute(attr, v); } };
  let last = [0, 0];
  function draw(step, sp) {
    // the car runs from 4 m out to past the target through the step
    const s = SK[step];
    const x = reduced ? -60 : lerp(X0, X1, smooth(0.12, 0.92, sp));
    const d = s.T + x, p = s.f(d, s.T), us = s.pulse(p, d, s.T);
    H.put('name', s.label);
    H.put('d', `${d.toFixed(0)} cm`);
    H.put('left', `${(-x).toFixed(0)} cm`);
    H.put('p', p.toFixed(3));
    H.put('us', `${us.toFixed(0)} µs`);
    H.put('mini', `${(-x).toFixed(0)} cm to go, power ${p.toFixed(3)}, ${us.toFixed(0)} µs`);
    build(); // after the readout has its text: on a phone the chart starts below it
    if (!G) return;
    const k = step === 0 || reduced ? 1 : smooth(0, 0.3, sp);
    // curves: this sketch bold and orange, the earlier ones faint, the later ones hidden
    G.sk.forEach((c, i) => {
      const a = i < step ? (i === step - 1 ? lerp(1, 0.9, k) : 0.9) : i === step ? k : 0;
      set(c.path, 'opacity', a.toFixed(3));
      set(c.path, 'stroke', i === step ? LINE : GHOST);
      set(c.path, 'stroke-width', i === step ? '2.6' : '1.5');
      // the phase bands hand over without their labels overlapping: the old ones leave first
      set(c.bands, 'opacity', (i === step ? (step === 0 || reduced ? 1 : smooth(0.12, 0.3, sp)) : i === step - 1 && !reduced ? 1 - smooth(0, 0.12, sp) : 0).toFixed(3));
    });
    set(G.cur, 'x1', G.X(x).toFixed(1)); set(G.cur, 'x2', G.X(x).toFixed(1));
    set(G.dot, 'cx', G.X(x).toFixed(1)); set(G.dot, 'cy', G.Y(p).toFixed(1));
    set(G.car, 'x', G.X(x).toFixed(1));
    set(G.car, 'dy', Math.abs(x) < 40 ? '-16' : '0'); // clear of the target's own label
    set(G.car, 'text-anchor', G.X(x) > G.W - 26 ? 'end' : 'middle');
    svg.setAttribute('aria-label', `${s.label}: power command over the last 4 m before a ${s.T.toFixed(0)} cm target. At ${(-x).toFixed(0)} cm to go it sends ${p.toFixed(3)}.`);
  }
  function setProgress(p, step, stepP) {
    last = [clamp(step | 0, 0, SK.length - 1), clamp(stepP, 0, 1)];
    draw(...last);
  }
  const ro = new ResizeObserver(() => { built = ''; draw(...last); });
  ro.observe(el);
  draw(0, 0);
  return { setProgress, dispose() { ro.disconnect(); svg.remove(); H.el.remove(); } };
}

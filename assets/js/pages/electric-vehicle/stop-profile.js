// The power command from the real code, plotted against distance (2D, no WebGL).
// No physics: each curve is exactly what one sketch in github.com/jerryli08/sciolyEv sends to the
// ESC as a function of the distance the encoder has counted, over the last 4 m before the target.
// power is -1..1; the bidirectional sketches send a pulse of 1500 + 500 x power microseconds
// (1500 neutral, 2000 full forward, below 1500 reverse). fullEvCode, the earliest closed loop, is
// forward only: 1050 + 950 x power, and 1000 (motor off) once it is inside its overshoot margin.
import { segmented, slider, readout } from '/assets/js/lib/ui.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SK = {
  soup: {
    label: 'SOUPCode / PUSOCode', T: 823,
    note: 'Full power, then from 3 m out a P controller on position (Kp 0.002 per cm) plus 0.08 feedforward while it drives forward. Past the target the command goes negative: the motor reverses.',
    // SOUPCode and PUSOCode are the same sketch with a different target (823 and 888 cm)
    f(d, T) {
      let p = d < 180 ? d / 180 + 0.08 : d < T - 300 ? 1 : clamp(0.002 * (T - d), -1, 1);
      if (p > 0) p += 0.08;
      return clamp(p, -1, 1);
    },
    phases: (T) => [['cruise', -Infinity, T - 300], ['P approach', T - 300, T], ['reverse', T, Infinity]],
    pulse: (p) => 1500 + 500 * p,
  },
  regionals: {
    label: 'regionalsCode', T: 823,
    note: 'Full power, then from 3 m out the power ramps down on a fixed schedule, creeps the last 20 cm at 0.08 and stops at the target.',
    f(d, T) {
      if (d < T - 300) return 1;
      if (T - d > 20) return clamp((T - 20 - d) / (T - 20) + 0.08, -1, 1);
      if (d < T) return 0.08;
      return 0;
    },
    phases: (T) => [['cruise', -Infinity, T - 300], ['ramp down', T - 300, T - 20], ['creep', T - 20, T], ['stop', T, Infinity]],
    pulse: (p) => 1500 + 500 * p,
  },
  awd: {
    label: 'AWDGearedEncoderCode', T: 500 * 0.99142857142,
    note: 'An earlier test with the geared encoder: full power until 2 m out, proportional to 50 cm, then a slow creep. The small offsets after the clamp push the command just past full.',
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
  full: {
    label: 'fullEvCode', T: 700,
    note: 'My first closed loop, forward only: power proportional to the distance left (gain 12.5, so it stays at full until the end), cut 60 cm before the target, then the car coasts in.',
    f(d, T) { return d < T - 60 ? Math.min(1, (12.5 * (T - 60 - d)) / (T - 60)) : 0; },
    phases: (T) => [['cruise', -Infinity, T - 60 - (T - 60) / 12.5], ['ramp', T - 60 - (T - 60) / 12.5, T - 60], ['motor off, coasting', T - 60, Infinity]],
    pulse: (p, d, T) => (d < T - 60 ? 1050 + 950 * p : 1000),
  },
};
const PHASE_COL = { cruise: 'rgba(237,232,226,0.035)', reverse: 'rgba(255,93,93,0.10)', stop: 'rgba(237,232,226,0.07)', 'motor off, coasting': 'rgba(255,93,93,0.08)' };
const LINE = '#ff6b35';

export function mount(el, ctx) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('role', 'img');
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' });
  el.append(svg);
  const noteEl = document.createElement('p');
  Object.assign(noteEl.style, { flex: '1 1 100%', margin: '0', fontSize: '14.5px', lineHeight: '1.5', color: 'var(--text-2)' });
  const st = { k: 'soup', T: SK.soup.T, over: 15, cur: null };

  const info = readout(null, { rows: [
    { key: 'd', label: 'Distance', unit: 'cm', format: (v) => v.toFixed(0) },
    { key: 'left', label: 'To the target', unit: 'cm', format: (v) => v.toFixed(0) },
    { key: 'p', label: 'Power command', format: (v) => v.toFixed(3) },
    { key: 'us', label: 'ESC pulse', format: (v) => `${v.toFixed(0)} µs` },
  ] });

  const mk = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
  let geom = null;
  function draw() {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.textContent = '';
    const sk = SK[st.k], T = st.T;
    const narrow = W < 560;
    const m = { l: narrow ? 40 : 54, r: narrow ? 14 : 24, t: 40, b: 44 };
    const x0 = T - 400, x1 = T + st.over + 5;
    const yLo = st.k === 'soup' ? -0.25 : -0.1, yHi = 1.12;
    const X = (d) => m.l + ((d - x0) / (x1 - x0)) * (W - m.l - m.r);
    const Y = (p) => m.t + ((yHi - p) / (yHi - yLo)) * (H - m.t - m.b);
    geom = { X, x0, x1, m, W };
    // phases
    for (const [name, a, b] of sk.phases(T)) {
      const xa = X(Math.max(a, x0)), xb = X(Math.min(b, x1));
      if (xb <= xa) continue;
      mk('rect', { x: xa, y: m.t, width: xb - xa, height: H - m.t - m.b, fill: PHASE_COL[name] || 'rgba(255,107,53,0.07)' });
      if (xb - xa > (narrow ? 34 : 46)) { const t = mk('text', { x: (xa + xb) / 2, y: m.t + 16, 'text-anchor': 'middle', fill: '#8c847b', 'font-size': narrow ? 10.5 : 11.5 }); t.textContent = name; }
    }
    // axes and grid
    for (const p of [-0.2, 0, 0.25, 0.5, 0.75, 1]) {
      if (p < yLo || p > yHi) continue;
      mk('line', { x1: m.l, x2: W - m.r, y1: Y(p), y2: Y(p), stroke: p === 0 ? 'rgba(237,232,226,0.35)' : 'rgba(237,232,226,0.08)' });
      const t = mk('text', { x: m.l - 7, y: Y(p) + 4, 'text-anchor': 'end', fill: '#8c847b', 'font-size': 11 }); t.textContent = p.toFixed(p % 1 ? 2 : 0);
    }
    const step = narrow ? 100 : 50;
    for (let d = Math.ceil(x0 / step) * step; d <= x1; d += step) {
      mk('line', { x1: X(d), x2: X(d), y1: H - m.b, y2: H - m.b + 5, stroke: 'rgba(237,232,226,0.3)' });
      const t = mk('text', { x: X(d), y: H - m.b + 18, 'text-anchor': 'middle', fill: '#8c847b', 'font-size': 11 }); t.textContent = d;
    }
    const xl = mk('text', { x: W - m.r, y: H - 8, 'text-anchor': 'end', fill: '#b8b0a7', 'font-size': 11.5 }); xl.textContent = 'distance counted by the encoder (cm)';
    const yl = mk('text', { x: m.l, y: m.t - 14, fill: '#b8b0a7', 'font-size': 11.5 }); yl.textContent = 'power command';
    // target line
    mk('line', { x1: X(T), x2: X(T), y1: m.t, y2: H - m.b, stroke: '#4cc38a', 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    const right = X(T) + 76 > W - m.r;
    const tt = mk('text', { x: right ? X(T) - 5 : X(T) + 5, y: H - m.b - 8, 'text-anchor': right ? 'end' : 'start', fill: '#4cc38a', 'font-size': 11.5, 'font-weight': 600 }); tt.textContent = `target ${T.toFixed(T % 1 ? 1 : 0)}`;
    // the curve, sampled every 0.5 cm (steps are real steps in the code)
    let dStr = '';
    for (let d = x0; d <= x1; d += 0.5) dStr += `${d === x0 ? 'M' : 'L'}${X(d).toFixed(1)},${Y(sk.f(d, T)).toFixed(1)}`;
    mk('path', { d: dStr, fill: 'none', stroke: LINE, 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
    // cursor
    const d = st.cur ?? T - 150;
    const p = sk.f(d, T);
    mk('line', { x1: X(d), x2: X(d), y1: m.t, y2: H - m.b, stroke: 'rgba(237,232,226,0.45)' });
    mk('circle', { cx: X(d), cy: Y(p), r: 5, fill: LINE, stroke: '#0b0a09', 'stroke-width': 2 });
    info.set({ d, left: T - d, p, us: sk.pulse(p, d, T) });
    noteEl.textContent = sk.note;
    svg.setAttribute('aria-label', `${sk.label}: power command over the last 4 m before a ${T.toFixed(0)} cm target. ${sk.note}`);
  }

  const pick = (e) => {
    if (!geom) return;
    const r = svg.getBoundingClientRect();
    const px = e.clientX - r.left;
    const { X, x0, x1, m, W } = geom;
    st.cur = clamp(x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0), x0, x1);
    draw();
  };
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('pointerdown', pick);

  segmented(ctx.panel, {
    label: 'Sketch', value: st.k,
    options: Object.entries(SK).map(([value, s]) => ({ value, label: s.label })),
    onChange: (v) => { st.k = v; st.T = SK[v].T; st.cur = null; tgt.set(Math.round(st.T), { silent: true }); draw(); },
  });
  ctx.panel.append(noteEl);
  const tgt = slider(ctx.panel, { label: 'Target', min: 450, max: 1000, step: 1, value: st.T, unit: ' cm', format: (v) => v.toFixed(0), onInput: (v) => { st.T = v; st.cur = null; draw(); } });
  slider(ctx.panel, { label: 'Show past the target', min: 0, max: 30, step: 1, value: st.over, unit: ' cm', format: (v) => v.toFixed(0), onInput: (v) => { st.over = v; draw(); } });
  ctx.panel.append(info.el);

  const ro = new ResizeObserver(draw);
  ro.observe(el);
  draw();
  return { dispose() { ro.disconnect(); svg.remove(); } };
}

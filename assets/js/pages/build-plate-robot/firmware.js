// "The firmware", scroll-driven, plain SVG and HTML (no WebGL): the final sketch
// (finalWorking08-23-2024.ino, github.com/jerryli08/replac3d) running the swap. setup() calls
// retrieve(), deposit(), pickup() and replace(); each is the same pattern of blocking AccelStepper
// moves. The chart plots the two axes' step positions and the magnet pin against time, so it shows
// what the code does: one axis moves at a time, to hard-coded step targets.
// From the sketch: extension max 3,000 steps/s, 1,000 steps/s²; panning max 1,000 steps/s,
// 1,000 steps/s²; targets extension 0 (in) or -14,000 (out), panning -1,450 (left), 0 (middle) or
// 1,440 (right); delay(500) around each magnet switch. Timing is for ideal constant-acceleration
// moves at those limits (a model: the page never states a total from it).
// Steps: 0 and 1 waiting to start, 2 to 5 the four functions, 6 the end (no homing). Every picture is a
// pure function of (step, stepP).
const NS = 'http://www.w3.org/2000/svg';
const INK = '#eee9e3', INK2 = '#b8b0a7', MUTED = '#8c847b', GRID = 'rgba(237,232,226,0.1)';
const C = { pan: '#ff6b35', ext: '#8fc3ff', mag: '#f2c14e' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const EXT = { max: 3000, acc: 1000 }, PAN = { max: 1000, acc: 1000 };
const POS = { in: 0, out: -14000, left: -1450, middle: 0, right: 1440 };
const FNS = [
  { name: 'retrieve', note: 'printer: reach in, magnets on, pull out', mag0: 0, pan: 'middle', mag1: 1 },
  { name: 'deposit', note: 'right holder: magnets off, park it', mag0: 1, pan: 'right', mag1: 0 },
  { name: 'pickup', note: 'left holder: magnets on, fresh plate', mag0: 0, pan: 'left', mag1: 1 },
  { name: 'replace', note: 'printer: reach in, magnets off, load', mag0: 1, pan: 'middle', mag1: 0 },
];

function moveTime(d, m) {
  d = Math.abs(d);
  if (!d) return 0;
  const dc = (m.max * m.max) / m.acc;
  return d >= dc ? d / m.max + m.max / m.acc : 2 * Math.sqrt(d / m.acc);
}
function movePos(from, to, m, t) {
  const d = Math.abs(to - from), s = Math.sign(to - from);
  if (!d) return to;
  const T = moveTime(d, m), dc = (m.max * m.max) / m.acc;
  t = clamp(t, 0, T);
  let x;
  if (d >= dc) {
    const ta = m.max / m.acc;
    if (t < ta) x = 0.5 * m.acc * t * t;
    else if (t < T - ta) x = dc / 2 + m.max * (t - ta);
    else x = d - 0.5 * m.acc * (T - t) ** 2;
  } else x = t < T / 2 ? 0.5 * m.acc * t * t : d - 0.5 * m.acc * (T - t) ** 2;
  return from + s * x;
}

// the whole sequence as events, in the order setup() runs them
const EV = [];
let TOTAL = 0;
{
  let pan = 0, ext = 0;
  const add = (e) => { e.t0 = TOTAL; TOTAL += e.dur || 0; e.t1 = TOTAL; EV.push(e); };
  FNS.forEach((f, i) => {
    f.t0 = TOTAL;
    const hl = (v) => (v ? 'HIGH' : 'LOW');
    add({ fn: i, call: `digitalWrite(magnet, ${hl(f.mag0)})`, kind: 'mag', to: f.mag0 });
    add({ fn: i, call: 'extendTo("in")', code: 'extension.runToNewPosition(0)', kind: 'ext', from: ext, to: 0, dur: moveTime(ext, EXT) }); ext = 0;
    add({ fn: i, call: `panTo("${f.pan}")`, code: `panning.runToNewPosition(${POS[f.pan]})`, kind: 'pan', from: pan, to: POS[f.pan], dur: moveTime(POS[f.pan] - pan, PAN) }); pan = POS[f.pan];
    add({ fn: i, call: 'extendTo("out")', code: 'extension.runToNewPosition(-14000)', kind: 'ext', from: 0, to: POS.out, dur: moveTime(POS.out, EXT) }); ext = POS.out;
    add({ fn: i, call: 'delay(500)', kind: 'wait', dur: 0.5 });
    add({ fn: i, call: `digitalWrite(magnet, ${hl(f.mag1)})`, kind: 'mag', to: f.mag1 });
    add({ fn: i, call: 'delay(500)', kind: 'wait', dur: 0.5 });
    add({ fn: i, call: 'extendTo("in")', code: 'extension.runToNewPosition(0)', kind: 'ext', from: ext, to: 0, dur: moveTime(ext, EXT) }); ext = 0;
    f.t1 = TOTAL;
  });
}
// state at time t: positions, magnet pin and the call running
function stateAt(t) {
  let pan = 0, ext = 0, mag = 0, now = EV[0];
  for (const e of EV) {
    if (e.t0 > t) break;
    if (e.kind === 'mag') mag = e.to;
    if (e.kind === 'pan') pan = movePos(e.from, e.to, PAN, t - e.t0);
    if (e.kind === 'ext') ext = movePos(e.from, e.to, EXT, t - e.t0);
    if (e.dur || e.t0 === t) now = e;
  }
  return { pan, ext, mag, now };
}
// scroll to time: steps 0 and 1 before the start (knowing when to start), steps 2 to 5 through
// their function, step 6 at the end
const FIRST = 2;
function timeAt(step, q, reduced) {
  if (step < FIRST) return 0;
  if (step >= FIRST + FNS.length) return TOTAL;
  const f = FNS[step - FIRST];
  const u = reduced ? 1 : clamp((q - 0.06) / 0.82, 0, 1);
  return f.t0 + (f.t1 - f.t0) * u;
}

export function mount(el, ctx) {
  const reduced = !!ctx.reducedMotion;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:clamp(8px,2.2vh,22px);padding:clamp(14px,2.6vw,40px);font-family:inherit;color:' + INK;
  el.appendChild(wrap);
  const mk = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; };
  const html = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; parent?.appendChild(e); return e; };

  let built = '', ui = null;
  function build() {
    const key = `${el.clientWidth}x${el.clientHeight}`;
    if (key === built) return;
    built = key;
    wrap.replaceChildren();
    const W = el.clientWidth, H = el.clientHeight, small = W < 560;
    const pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 16;
    const fs = small ? 11 : 13.5;

    // the code: setup() with the running function lit, and the call running now
    const code = html('div', `font:500 ${fs}px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;overflow:hidden`, wrap);
    const line = (txt, dim) => html('div', `padding:0 8px;border-radius:6px;color:${dim ? MUTED : INK2}`, code, txt);
    line('void setup() {', true);
    line('  setParams();', true);
    const fnLines = FNS.map((f) => line(small ? `  ${f.name}();` : `  ${(f.name + '();').padEnd(12)}// ${f.note}`));
    line('}', true);
    const nowBox = html('div', `margin-top:6px;padding:0 8px;color:${INK};min-height:1.55em`, code);
    const nowCall = html('span', `color:${INK}`, nowBox);
    const nowCode = html('span', `color:${MUTED}`, nowBox);

    // the chart: three lanes against time
    const cw = W - pad * 2;
    const ch = Math.max(180, Math.min(small ? 300 : 440, H - pad * 2 - code.offsetHeight - 24));
    const svg = mk('svg', { width: cw, height: ch, viewBox: `0 0 ${cw} ${ch}`, role: 'img',
      'aria-label': 'The swap as the sketch runs it: turntable (panning) and arm (extension) step positions and the magnet pin against time. Only one axis moves at a time.' }, wrap);
    svg.style.display = 'block';
    const left = small ? 64 : 150, right = small ? 8 : 16, top = small ? 34 : 24;
    const plotW = cw - left - right;
    const gapL = small ? 24 : 28, magH = small ? 26 : 34;
    const laneH = (ch - top - magH - gapL * 2 - 4) / 2;
    const lanes = [
      { key: 'pan', title: 'panning', sub: 'turntable, steps', y0: top, h: laneH, lo: -1450, hi: 1440,
        ticks: [[1440, small ? '1,440' : '1,440 right'], [0, small ? '0' : '0 printer'], [-1450, small ? '-1,450' : '-1,450 left']] },
      { key: 'ext', title: 'extension', sub: 'arm, steps', y0: top + laneH + gapL, h: laneH, lo: 0, hi: -14000,
        ticks: [[-14000, small ? '-14,000' : '-14,000 out'], [0, small ? '0' : '0 in']] },
      { key: 'mag', title: 'magnet', sub: 'pin 10', y0: top + 2 * (laneH + gapL), h: magH, lo: 0, hi: 1, ticks: [[1, 'HIGH'], [0, 'LOW']] },
    ];
    const X = (t) => left + (t / TOTAL) * plotW;
    const Y = (L, v) => L.y0 + L.h - ((v - L.lo) / (L.hi - L.lo)) * L.h;

    // function bands
    const bands = FNS.map((f, i) => {
      const g = mk('g', {}, svg);
      const r = mk('rect', { x: X(f.t0), y: top - (small ? 34 : 20), width: X(f.t1) - X(f.t0), height: ch - top + (small ? 34 : 20), fill: 'rgba(255,107,53,0.07)', rx: 6, opacity: 0 }, g);
      if (i) mk('line', { x1: X(f.t0), x2: X(f.t0), y1: top - 4, y2: ch, stroke: GRID }, g);
      const t = mk('text', { x: X((f.t0 + f.t1) / 2), y: small ? 11 : top - 7, fill: MUTED, 'font-size': small ? 10 : 12, 'text-anchor': 'middle', 'font-family': 'ui-monospace,Menlo,Consolas,monospace' }, g);
      t.textContent = `${f.name}()`;
      return { r, t };
    });
    // clip for the part already run
    const clipId = `bpr-fw-${Math.random().toString(36).slice(2)}`;
    const clip = mk('rect', { x: 0, y: 0, width: left, height: ch }, mk('clipPath', { id: clipId }, mk('defs', {}, svg)));
    const vals = {};
    for (const L of lanes) {
      for (const [v, lab] of L.ticks) {
        mk('line', { x1: left, x2: left + plotW, y1: Y(L, v), y2: Y(L, v), stroke: GRID }, svg);
        const t = mk('text', { x: left - 8, y: Y(L, v) + 4, fill: MUTED, 'font-size': small ? 9.5 : 11, 'text-anchor': 'end' }, svg);
        t.textContent = lab;
      }
      if (!small) {
        const m = L.key === 'mag';
        const t = mk('text', { x: 0, y: L.y0 + (m ? 11 : 14), fill: C[L.key], 'font-size': 13, 'font-weight': 650 }, svg);
        t.textContent = L.title;
        const s = mk('text', { x: m ? 62 : 0, y: L.y0 + (m ? 11 : 31), fill: MUTED, 'font-size': 11 }, svg);
        s.textContent = L.sub;
        vals[L.key] = mk('text', { x: 0, y: L.y0 + (m ? 29 : 50), fill: INK, 'font-size': 12.5, 'font-weight': 600 }, svg);
      } else {
        const t = mk('text', { x: left + 4, y: L.y0 - 3, fill: C[L.key], 'font-size': 10, 'font-weight': 650 }, svg);
        t.textContent = L.key === 'mag' ? 'magnet' : `${L.title} (${L.sub.split(',')[0]})`;
        vals[L.key] = mk('text', { x: left + plotW, y: L.y0 - 3, fill: INK, 'font-size': 10, 'text-anchor': 'end', 'font-weight': 600 }, svg);
      }
      // the curve, sampled from the same model as the readout
      const n = Math.max(200, Math.round(plotW));
      let d = '';
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * TOTAL, s = stateAt(t);
        d += `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(L, s[L.key]).toFixed(1)}`;
      }
      mk('path', { d, fill: 'none', stroke: C[L.key], 'stroke-width': 1.5, opacity: 0.25, 'stroke-linejoin': 'round' }, svg);
      mk('path', { d, fill: 'none', stroke: C[L.key], 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'clip-path': `url(#${clipId})` }, svg);
    }
    const cursor = mk('line', { x1: left, x2: left, y1: top - 4, y2: ch, stroke: INK, 'stroke-width': 1, opacity: 0.55 }, svg);
    ui = { fnLines, nowCall, nowCode, bands, clip, cursor, vals, X, left, shown: {} };
  }

  const put = (k, node, v, attr) => { if (ui.shown[k] !== v) { if (attr) node.setAttribute(attr, v); else node.textContent = v; ui.shown[k] = v; } };
  const num = (v) => Math.round(v).toLocaleString('en-US');
  function setProgress(p, step, stepP) {
    build();
    step = clamp(step | 0, 0, FIRST + FNS.length);
    const t = timeAt(step, clamp(stepP, 0, 1), reduced);
    const s = stateAt(t);
    const active = step >= FIRST && step < FIRST + FNS.length ? step - FIRST : -1;
    const done = step >= FIRST + FNS.length;
    ui.fnLines.forEach((n, i) => put(`fn${i}`, n, i === active ? `background:rgba(255,107,53,0.16);color:${INK};padding:0 8px;border-radius:6px` : `color:${i < active || done ? INK2 : MUTED};padding:0 8px;border-radius:6px`, 'style'));
    ui.bands.forEach((b, i) => { put(`band${i}`, b.r, i === active ? '1' : '0', 'opacity'); put(`bt${i}`, b.t, i === active ? INK : MUTED, 'fill'); });
    const x = ui.X(t);
    put('clip', ui.clip, (x - 0).toFixed(1), 'width');
    put('cx1', ui.cursor, x.toFixed(1), 'x1'); put('cx2', ui.cursor, x.toFixed(1), 'x2');
    const call = step < FIRST ? 'waiting for the start' : done ? 'done: loop() is empty' : s.now.call;
    put('call', ui.nowCall, call);
    put('code', ui.nowCode, active >= 0 && s.now.code ? `  ${s.now.code}` : '');
    put('vpan', ui.vals.pan, num(s.pan));
    put('vext', ui.vals.ext, num(s.ext));
    put('vmag', ui.vals.mag, s.mag ? 'HIGH, on' : 'LOW, off');
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { wrap.remove(); } };
}

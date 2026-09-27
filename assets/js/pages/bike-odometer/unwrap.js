// How the odometer's code turns an angle into miles, and why the distance went backwards, driven
// by the scroll. A flat drawing (no 3D): the dial is the angle the MT6701 reports, 0 to 360
// degrees; the dots are the readings the loop takes; the arcs are the change the code works out
// between two readings. Every number is computed with the constants and the exact steps of
// finalCode.ino (github.com/jerryli08/bikeOdometer):
//   change = current - previous; if < -180 add 360, if > 180 subtract 360
//   distance -= change / 360 * (29.3701 in * pi / 13.8148148148)   (6.679 in per roller turn)
//   distance = max(0, distance)
// The sign: the final code subtracts the change ("assuming reverse direction"), so a falling angle
// counts as riding forward; the dial turns that way here.
// What is an illustration: how many degrees the roller turns between readings (45 or 225) and the
// loop-time strip, which is not to scale. Nothing on the bike was timed.
// Every picture is a pure function of (step, progress through the step); nothing moves on its own.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;

const WHEEL_IN = 29.3701, RATIO = 13.8148148148;
const PER_TURN = (WHEEL_IN * 3.14159265359) / RATIO; // 6.679 in of riding per roller turn
const DEG_PER_S_PER_MPH = (360 * 63360) / PER_TURN / 3600; // 948.7 degrees a second at 1 mph
const A0 = 60; // the sensor's reading when the demo starts (any angle works)

// travel of the roller (degrees, forward) through each step, and how far it turns between readings
const STEPS = [
  { len: 360, every: 0 },
  { len: 720, every: 45 },
  { len: 900, every: 225 },
  { len: 720, every: 45 },
  { len: 0, every: 0 },
];
const START = []; { let t = 0; STEPS.forEach((s, i) => { START[i] = t; t += s.len; }); }
const TRAVEL_END = START[4];

// every reading the loop takes over the whole demo, with the code's variables after it
const SAMPLES = [];
{
  let prev = null, dist = 0;
  STEPS.forEach((s, i) => {
    if (!s.every) return;
    for (let t = START[i] + (i === 1 ? 0 : s.every); t <= START[i] + s.len + 1e-9; t += s.every) {
      const a = mod(A0 - t, 360);
      if (prev == null) { SAMPLES.push({ t, step: i, a, raw: null, d: null, dist }); prev = a; continue; }
      const raw = a - prev;
      let d = raw;
      if (d < -180) d += 360; else if (d > 180) d -= 360;
      dist -= (d / 360) * PER_TURN;
      dist = Math.max(0, dist);
      SAMPLES.push({ t, step: i, a, raw, d, prevA: prev, dist });
      prev = a;
    }
  });
}

const CODE = [
  'float currentAngle = encoder.angleRead();',
  'float angleDifference = currentAngle - previousAngle;',
  'if (angleDifference < -180.0) angleDifference += 360.0;',
  'else if (angleDifference > 180.0) angleDifference -= 360.0;',
  'float distanceTraveled = (angleDifference / 360.0) * (wheelCircumference / gearRatio);',
  'cumulativeDistance -= distanceTraveled;  // assuming reverse direction',
  'cumulativeDistance = max(0, cumulativeDistance);',
  'if (now - lastLcdUpdate >= 1000) {',
  '  lastLcdUpdate = now;',
];
const HOT = [[0], [1, 2, 3, 4, 5], [2, 3, 5], [7, 8], []];

const CSS = `
.uw { position: absolute; inset: 0; color: var(--text); font-size: 14px; }
.uw *, .uw *::before, .uw *::after { box-sizing: border-box; }
.uw-main { position: absolute; inset: 18px 20px 96px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 22px; align-items: center; }
.uw-dial { width: 100%; height: 100%; min-height: 0; }
.uw-dial svg { width: 100%; height: 100%; display: block; overflow: visible; }
.uw-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.uw-code { margin: 0; padding: 10px 12px; border-radius: 12px; background: rgba(8, 7, 6, 0.9); border: 1px solid var(--line); font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere; }
.uw-code span { display: block; padding: 1px 6px; margin: 0 -6px; border-radius: 5px; transition: none; }
.uw-code span.on { color: #fff1e2; background: rgba(255, 107, 53, 0.18); }
.uw-read { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 14px; padding: 10px 12px; border-radius: 12px; background: rgba(10, 8, 7, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 13px; }
.uw-read dt { color: var(--muted); font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.uw-read dd { margin: 0; text-align: right; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.6; }
.uw-read dd.fwd { color: #5fd38d; } .uw-read dd.back { color: #ff6b6b; }
.uw-loop { position: absolute; left: 20px; right: 20px; bottom: 16px; height: 66px; }
.uw-loop p { margin: 0 0 5px; font-size: 12px; color: var(--muted); }
.uw-loop svg { width: 100%; height: 40px; display: block; }
.uw-chart { position: absolute; inset: 18px 20px 18px; opacity: 0; pointer-events: none; }
.uw-chart svg { width: 100%; height: 100%; display: block; }
.uw-note { position: absolute; left: 20px; top: 14px; z-index: 2; padding: 4px 10px; border-radius: 999px; background: rgba(10, 8, 7, 0.8); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 12px; color: var(--text-2); }
.uw.narrow .uw-main { inset: 10px 10px 74px; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr); gap: 10px; }
.uw.narrow .uw-code { display: none; }
.uw.narrow .uw-read { font-size: 11.5px; padding: 7px 9px; gap: 2px 8px; }
.uw.narrow .uw-read dt { font-size: 10.5px; }
.uw.narrow .uw-loop { left: 10px; right: 10px; bottom: 8px; height: 58px; }
.uw.narrow .uw-loop p { font-size: 10.5px; }
.uw.narrow .uw-chart { inset: 8px; }
.uw.narrow .uw-note { left: 10px; top: 8px; font-size: 10.5px; }
`;

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// dial geometry: 0 degrees at the top, angles grow clockwise (like the sensor's reading on a compass)
const C = 100, R = 72;
const pt = (a, r = R) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)];
// an arc from angle a that turns by d degrees (d > 0 clockwise)
function arcPath(a, d, r = R) {
  const [x0, y0] = pt(a, r), [x1, y1] = pt(a + d, r);
  const large = Math.abs(d) > 180 ? 1 : 0, sweep = d > 0 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function mount(el, ctx) {
  if (!document.getElementById('uw-css')) { const st = document.createElement('style'); st.id = 'uw-css'; st.textContent = CSS; document.head.appendChild(st); }
  const reduced = ctx.reducedMotion;
  const root = h('div', 'uw');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', 'A dial of the sensor angle with the readings the loop takes, the lines of code that turn the change in angle into distance, and the running total; then a chart of the top speed the code can count against loop time');
  el.appendChild(root);

  const note = h('p', 'uw-note', '');
  const main = h('div', 'uw-main');
  const dialBox = h('div', 'uw-dial');
  const svg = s('svg', { viewBox: '0 0 200 200', 'aria-hidden': 'true' }, dialBox);
  s('circle', { cx: C, cy: C, r: R + 16, fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 1 }, svg);
  s('circle', { cx: C, cy: C, r: R, fill: 'none', stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 1.2 }, svg);
  for (let a = 0; a < 360; a += 30) {
    const [x0, y0] = pt(a, R + 4), [x1, y1] = pt(a, R + (a % 90 ? 8 : 11));
    s('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'rgba(255,255,255,0.35)', 'stroke-width': a % 90 ? 0.8 : 1.3 }, svg);
  }
  for (const a of [0, 90, 180, 270]) {
    const [x, y] = pt(a, R + 21);
    const t = s('text', { x, y: y + 3.2, 'text-anchor': 'middle', fill: 'rgba(238,233,227,0.6)', 'font-size': 9, 'font-family': 'ui-monospace, monospace' }, svg);
    t.textContent = `${a}°`;
  }
  const realArcs = s('g', { fill: 'none', stroke: 'rgba(238,233,227,0.35)', 'stroke-width': 2, 'stroke-dasharray': '3 3' }, svg);
  const arcs = s('g', { fill: 'none', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, svg);
  const dots = s('g', {}, svg);
  const arrow = s('g', {}, svg);
  s('line', { x1: C, y1: C, x2: C, y2: C - R + 12, stroke: '#ff6b35', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, arrow);
  s('path', { d: `M${C - 6} ${C - R + 15}L${C} ${C - R + 4}L${C + 6} ${C - R + 15}Z`, fill: '#ff6b35' }, arrow);
  s('circle', { cx: C, cy: C, r: 5.5, fill: '#1a1512', stroke: '#ff6b35', 'stroke-width': 2 }, svg);
  const dialText = s('text', { x: C, y: C + 26, 'text-anchor': 'middle', fill: '#fff1e2', 'font-size': 11, 'font-weight': 700, 'font-family': 'ui-monospace, monospace' }, svg);
  const dialSub = s('text', { x: C, y: C + 38, 'text-anchor': 'middle', fill: 'rgba(238,233,227,0.55)', 'font-size': 7.5, 'font-family': 'ui-sans-serif, system-ui, sans-serif' }, svg);
  dialSub.textContent = 'sensor reading';

  const side = h('div', 'uw-side');
  const code = h('pre', 'uw-code');
  const lines = CODE.map((c) => { const sp = h('span', null, c); code.append(sp); return sp; });
  const read = h('dl', 'uw-read');
  const row = (k) => { const dt = h('dt', null, k), dd = h('dd'); read.append(dt, dd); return dd; };
  const R_cur = row('currentAngle'), R_prev = row('previousAngle'), R_raw = row('raw difference'), R_diff = row('angleDifference'), R_dist = row('cumulativeDistance');
  side.append(code, read);
  main.append(dialBox, side);

  // loop-time strip: what one pass of loop() does (not to scale)
  const loop = h('div', 'uw-loop');
  const loopCap = h('p');
  const lsvg = s('svg', { viewBox: '0 0 600 40', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  loop.append(loopCap, lsvg);
  const bars = s('g', {}, lsvg);
  function drawLoop(kind) {
    bars.replaceChildren();
    // [label, width, color]
    const pass = kind === 'slow'
      ? [['read', 26, '#ff6b35'], ['math', 16, '#8c847b'], ['LCD, 2 lines', 150, '#5b8def'], ['serial print', 170, '#7a6fd6']]
      : [['read', 26, '#ff6b35'], ['math', 16, '#8c847b']];
    let x = 0, n = 0;
    while (x < 600 && n < 40) {
      for (const [lab, w, col] of pass) {
        const ww = Math.min(w, 600 - x);
        if (ww <= 0) break;
        s('rect', { x: x + 0.5, y: 6, width: Math.max(0, ww - 1), height: 26, rx: 3, fill: col, opacity: lab === 'read' ? 0.95 : 0.55 }, bars);
        if (ww > 60) { const t = s('text', { x: x + 6, y: 23, fill: '#fff', 'font-size': 11, 'font-family': 'ui-sans-serif, system-ui, sans-serif' }, bars); t.textContent = lab; }
        x += ww;
      }
      n++;
    }
  }

  // speed-limit chart
  const chart = h('div', 'uw-chart');
  const csvg = s('svg', { viewBox: '0 0 420 260', 'aria-hidden': 'true' }, chart);
  const X0 = 50, X1 = 400, Y0 = 220, Y1 = 30, TMIN = 4, TMAX = 40, VMAX = 50;
  const cx = (T) => X0 + ((T - TMIN) / (TMAX - TMIN)) * (X1 - X0);
  const cy = (v) => Y0 - (Math.min(v, VMAX) / VMAX) * (Y0 - Y1);
  const vmax = (Tms) => 180 / (DEG_PER_S_PER_MPH * (Tms / 1000));
  s('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: 'rgba(255,255,255,0.3)' }, csvg);
  s('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: 'rgba(255,255,255,0.3)' }, csvg);
  for (const T of [5, 10, 20, 30, 40]) {
    s('line', { x1: cx(T), y1: Y0, x2: cx(T), y2: Y0 + 4, stroke: 'rgba(255,255,255,0.4)' }, csvg);
    const t = s('text', { x: cx(T), y: Y0 + 16, 'text-anchor': 'middle', fill: 'rgba(238,233,227,0.6)', 'font-size': 10 }, csvg); t.textContent = `${T}`;
  }
  for (const v of [10, 20, 30, 40, 50]) {
    s('line', { x1: X0, y1: cy(v), x2: X1, y2: cy(v), stroke: 'rgba(255,255,255,0.07)' }, csvg);
    const t = s('text', { x: X0 - 8, y: cy(v) + 3.5, 'text-anchor': 'end', fill: 'rgba(238,233,227,0.6)', 'font-size': 10 }, csvg); t.textContent = `${v}`;
  }
  { const t = s('text', { x: (X0 + X1) / 2, y: Y0 + 34, 'text-anchor': 'middle', fill: 'rgba(238,233,227,0.75)', 'font-size': 11 }, csvg); t.textContent = 'Time for one pass of the loop (ms)'; }
  { const t = s('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', fill: 'rgba(238,233,227,0.75)', 'font-size': 11, transform: `rotate(-90 14 ${(Y0 + Y1) / 2})` }, csvg); t.textContent = 'Top speed it can count (mph)'; }
  let d = '';
  for (let T = TMIN; T <= TMAX + 1e-9; T += 0.25) d += `${d ? 'L' : 'M'}${cx(T).toFixed(1)} ${cy(vmax(T)).toFixed(1)}`;
  s('path', { d, fill: 'none', stroke: '#ff6b35', 'stroke-width': 2.4 }, csvg);
  s('circle', { cx: cx(10), cy: cy(vmax(10)), r: 3.5, fill: 'none', stroke: '#fff1e2', 'stroke-width': 1.4 }, csvg);
  { const t = s('text', { x: cx(10) + 8, y: cy(vmax(10)) - 6, fill: '#fff1e2', 'font-size': 10.5 }, csvg); t.textContent = `10 ms: ${vmax(10).toFixed(1)} mph`; }
  const mk = s('g', {}, csvg);
  const mkLine = s('line', { stroke: 'rgba(255,107,53,0.5)', 'stroke-dasharray': '3 3' }, mk);
  const mkDot = s('circle', { r: 5, fill: '#ff6b35' }, mk);
  const mkText = s('text', { fill: '#fff1e2', 'font-size': 12, 'font-weight': 700 }, mk);

  root.append(main, loop, chart, note);

  const ro = new ResizeObserver(() => root.classList.toggle('narrow', el.clientWidth < 620));
  ro.observe(el);
  root.classList.toggle('narrow', el.clientWidth < 620);

  // only DOM that changes is written
  const last = {};
  const put = (key, node, text) => { if (last[key] !== text) { node.textContent = text; last[key] = text; } };
  const attr = (key, node, name, v) => { const k = `${key}.${name}`; if (last[k] !== v) { node.setAttribute(name, v); last[k] = v; } };
  const cls = (key, node, c) => { if (last[`${key}.c`] !== c) { node.className = c; last[`${key}.c`] = c; } };
  const signed = (v) => (v == null ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(1)}°`);

  function setProgress(p, step, stepP) {
    const st = clamp(step | 0, 0, STEPS.length - 1);
    const q = reduced ? 1 : clamp(stepP, 0, 1);
    const travel = st >= 4 ? TRAVEL_END : START[st] + STEPS[st].len * q;
    const angle = mod(A0 - travel, 360);
    attr('arrow', arrow, 'transform', `rotate(${angle.toFixed(2)} ${C} ${C})`);
    put('dialText', dialText, `${angle.toFixed(1)}°`);

    // the readings taken so far, and the ones drawn: this step's (the last few)
    const upto = SAMPLES.filter((x) => x.t <= travel + 1e-6);
    const lastS = upto[upto.length - 1];
    const drawSt = st >= 4 ? 3 : st;
    const mine = upto.filter((x) => x.step === drawSt || (drawSt === 2 && x === upto.filter((y) => y.step === 1).pop()) || (drawSt === 3 && x === upto.filter((y) => y.step === 2).pop()));
    const shown = mine.slice(-9);
    const key = shown.map((x) => x.t).join(',');
    if (last.samples !== key) {
      last.samples = key;
      dots.replaceChildren(); arcs.replaceChildren(); realArcs.replaceChildren();
      shown.forEach((x, i) => {
        if (i > 0 && x.d != null) {
          const back = x.d > 0; // the code subtracts the change: a positive change counts backwards
          s('path', { d: arcPath(x.prevA, x.d), stroke: back ? '#ff6b6b' : '#5fd38d', opacity: 0.35 + 0.65 * ((i + 1) / shown.length) }, arcs);
          if (back) s('path', { d: arcPath(x.prevA, -(x.t - shown[i - 1].t), R - 9) }, realArcs);
        }
        const [px, py] = pt(x.a);
        s('circle', { cx: px, cy: py, r: 4.2, fill: '#fff1e2', stroke: '#0b0a09', 'stroke-width': 1.5 }, dots);
      });
    }

    // the code's variables after the last reading
    if (st === 0 && !lastS) {
      put('cur', R_cur, `${angle.toFixed(1)}°`); put('prev', R_prev, '-'); put('raw', R_raw, '-'); put('diff', R_diff, '-'); put('dist', R_dist, '0.00 in');
      cls('diff', R_diff, '');
    } else if (lastS) {
      put('cur', R_cur, `${lastS.a.toFixed(1)}°`);
      put('prev', R_prev, lastS.prevA == null ? '-' : `${lastS.prevA.toFixed(1)}°`);
      put('raw', R_raw, signed(lastS.raw));
      put('diff', R_diff, lastS.d == null ? '-' : `${signed(lastS.d)} ${lastS.d > 0 ? 'backward' : 'forward'}`);
      cls('diff', R_diff, lastS.d == null ? '' : lastS.d > 0 ? 'back' : 'fwd');
      put('dist', R_dist, `${lastS.dist.toFixed(2)} in`);
    }
    lines.forEach((ln, i) => cls(`ln${i}`, ln, HOT[st].includes(i) ? 'on' : ''));

    // the loop strip
    const loopKind = st === 2 ? 'slow' : st >= 1 ? 'fast' : '';
    if (last.loop !== loopKind) {
      last.loop = loopKind;
      if (loopKind) drawLoop(loopKind);
      loop.style.visibility = loopKind ? 'visible' : 'hidden';
      loopCap.textContent = loopKind === 'slow'
        ? 'One pass of loop() in the integration test: the LCD and the serial monitor on every pass (not to scale)'
        : 'One pass of loop() in the final code: read, work out the change, repeat (not to scale)';
    }
    put('note', note, st === 2 ? 'Illustration: 225° of roller turn between two readings' : st === 1 || st === 3 ? 'Illustration: 45° of roller turn between two readings' : st === 0 ? 'One roller turn is 6.68 in of riding (from the code)' : 'Computed from the constants in the code');

    // the chart takes over in the last step
    const k = st >= 4 ? (reduced ? 1 : smooth(0, 0.45, clamp(stepP, 0, 1))) : 0;
    const o1 = (1 - k).toFixed(3), o2 = k.toFixed(3);
    if (last.o1 !== o1) { main.style.opacity = o1; loop.style.opacity = o1; chart.style.opacity = o2; last.o1 = o1; }
    if (st >= 4) {
      const T = lerp(36, 5, reduced ? 0.5 : smooth(0.1, 0.9, clamp(stepP, 0, 1)));
      const v = vmax(T);
      const x = cx(T), y = cy(v);
      attr('mk', mkDot, 'cx', x.toFixed(1)); attr('mk', mkDot, 'cy', y.toFixed(1));
      attr('mkl1', mkLine, 'x1', x.toFixed(1)); attr('mkl2', mkLine, 'x2', x.toFixed(1));
      attr('mkl3', mkLine, 'y1', Y0); attr('mkl4', mkLine, 'y2', y.toFixed(1));
      attr('mkt', mkText, 'x', (x + (x > 300 ? -110 : 10)).toFixed(1)); attr('mkt', mkText, 'y', (y - 10).toFixed(1));
      put('mkt', mkText, `${T.toFixed(0)} ms: ${v.toFixed(1)} mph`);
    }
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}

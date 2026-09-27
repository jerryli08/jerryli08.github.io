// "Set a steering angle": a top view of a 2025-26 Electric Vehicle track, to scale. The dashed arc
// is where the chosen steering setting should take the car; the shaded band is everywhere it can
// end up if the steering is off by the play; Run drives one run with an error picked inside the play.
// Geometry and the car model are in geom.js (wheelbases from my CAD, track layout from the rules).
// The play is an assumption the reader sets: it was never measured. Plain 2D canvas, no WebGL.
import { slider, readout, segmented, button } from '/assets/js/lib/ui.js';
import * as G from './geom.js';

const DEG = Math.PI / 180;

export function mount(el, ctx) {
  const cs = getComputedStyle(document.documentElement);
  const col = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
  const C = {
    text: col('--text', '#eee9e3'), text2: col('--text-2', '#b8b0a7'), muted: col('--muted', '#8c847b'),
    accent: col('--accent', '#ff6b35'), grid: 'rgba(237,232,226,0.07)', band: 'rgba(255,107,53,0.16)',
    can: '#d9dde2', gap: 'rgba(120,200,140,0.22)', ok: '#7fd49a', bad: '#ff8a7a',
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'rx-canvas';
  canvas.setAttribute('role', 'img');
  el.appendChild(canvas);
  const g = canvas.getContext('2d');

  // ---------------------------------------------------------------- state
  const S = { car: 'v1', whole: false, d: 8.0, gap: 0.30, deg: 0.83, mm: 1.14, play: 0.5, u: null, anim: 1 };
  let raf = 0;
  const wb = () => G.WHEELBASE[S.car];
  const steerCmd = () => (S.car === 'v1' ? (S.whole ? Math.round(S.deg) : S.deg) * DEG : Math.abs(G.steerAt(S.mm)));

  function aimForGap() {
    const pl = G.planForOffset(S.d, G.OUTER_CAN - S.gap / 2);
    const want = Math.atan(G.WHEELBASE[S.car] * pl.k);
    if (S.car === 'v1') { S.deg = S.whole ? Math.round(want / DEG) : Math.round((want / DEG) * 100) / 100; sSteer.set(S.deg, { silent: true }); }
    else { S.mm = Math.round(G.travelForRight(want) * 100) / 100; sCal.set(S.mm, { silent: true }); }
  }

  // ---------------------------------------------------------------- controls
  const P = ctx.panel;
  segmented(P, {
    label: 'Car',
    options: [{ value: 'v1', label: 'Version 1: servo' }, { value: 'v2', label: 'Version 2: caliper' }],
    value: S.car,
    onChange: (v) => { S.car = v; S.u = null; stepSeg.el.style.display = v === 'v1' ? '' : 'none'; sSteer.el.style.display = v === 'v1' ? '' : 'none'; sCal.el.style.display = v === 'v2' ? '' : 'none'; aimForGap(); draw(); },
  });
  const stepSeg = segmented(P, {
    label: 'Steering steps',
    options: [{ value: false, label: 'Any angle' }, { value: true, label: 'Whole degrees, as in my code' }],
    value: S.whole,
    onChange: (v) => { S.whole = v; sSteer.input.step = v ? '1' : '0.01'; S.deg = v ? Math.round(S.deg) : S.deg; sSteer.set(S.deg, { silent: true }); draw(); },
  });
  const sSteer = slider(P, { label: 'Steering', min: 0, max: 3, step: 0.01, value: S.deg, unit: '°', format: (v) => (S.whole ? String(Math.round(v)) : v.toFixed(2)), onInput: (v) => { S.deg = v; draw(); } });
  const sCal = slider(P, { label: 'Caliper travel', min: 0, max: 3, step: 0.01, value: S.mm, unit: ' mm', format: (v) => v.toFixed(2), onInput: (v) => { S.mm = v; draw(); } });
  sCal.el.style.display = 'none';
  slider(P, { label: 'Track length', min: 7, max: 10, step: 0.1, value: S.d, unit: ' m', format: (v) => v.toFixed(1), onInput: (v) => { S.d = v; draw(); } });
  slider(P, { label: 'Can gap', min: 14, max: 100, step: 1, value: S.gap * 100, unit: ' cm', format: (v) => String(Math.round(v)), onInput: (v) => { S.gap = v / 100; draw(); } });
  slider(P, { label: 'Steering play (assumed)', min: 0, max: 2, step: 0.05, value: S.play, unit: '°', format: (v) => `±${v.toFixed(2)}`, onInput: (v) => { S.play = v; draw(); } });
  button(P, { label: 'Aim for the gap', onClick: () => { aimForGap(); draw(); } });
  const runBtn = button(P, { label: 'Run', onClick: run });
  runBtn.classList.add('rx-play');
  runBtn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg><span>Run</span>';
  const fmtM = (m) => (m >= 1 ? `${m.toFixed(2)} m` : `${Math.round(m * 100)} cm`);
  const CANS = { between: 'Between the cans', inner: 'Misses: inner side', outer: 'Misses: outer side', short: 'Stops short' };
  const out = readout(P, {
    rows: [
      { key: 'steer', label: 'Steering angle' },
      { key: 'plan', label: 'Planned arc' },
      { key: 'pcans', label: 'Planned pass' },
      { key: 'err', label: 'This run: error' },
      { key: 'stop', label: 'This run: stop' },
      { key: 'rcans', label: 'This run: cans' },
      { key: 'worst', label: 'Worst case' },
    ],
  });

  function run() {
    S.u = Math.random() * 2 - 1;
    cancelAnimationFrame(raf);
    if (ctx.reducedMotion) { S.anim = 1; draw(); return; }
    S.anim = 0;
    const t0 = performance.now();
    const step = (now) => {
      S.anim = Math.min(1, (now - t0) / 1500);
      draw();
      if (S.anim < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- model for the current settings
  function compute() {
    const cmd = steerCmd();
    const plan = G.planForSteer(S.d, cmd, wb());
    const m = { cmd, plan };
    if (!plan) return m;
    m.pcross = G.crossing(plan.alpha, plan.k, plan.s, S.d / 2);
    m.pcans = G.canCheck(m.pcross, S.gap);
    m.lo = G.runWith(plan, S.d, cmd - S.play * DEG, wb());
    m.hi = G.runWith(plan, S.d, cmd + S.play * DEG, wb());
    if (S.u != null) { m.err = S.u * S.play; m.run = G.runWith(plan, S.d, cmd + m.err * DEG, wb()); m.rcans = G.canCheck(m.run.cross, S.gap); }
    return m;
  }

  // ---------------------------------------------------------------- drawing
  let W = 0, H = 0, portrait = false, s = 1, ox = 0, oy = 0;
  function layout() {
    const r = el.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    portrait = H > W * 1.05;
    // world window: x from -0.55 to 10.55 m (fixed, so a shorter track looks shorter), y from -0.75 to 1.75 m
    const X0 = -0.55, X1 = 10.55, Y0 = -0.75, Y1 = 1.75, pad = 14;
    if (!portrait) {
      s = Math.min((W - 2 * pad) / (X1 - X0), (H - 2 * pad) / (Y1 - Y0));
      ox = (W - s * (X1 - X0)) / 2 - X0 * s; oy = H / 2 + ((Y1 + Y0) / 2) * s;
    } else {
      s = Math.min((W - 2 * pad) / (Y1 - Y0), (H - 2 * pad) / (X1 - X0));
      ox = W / 2 + ((Y1 + Y0) / 2) * s; oy = (H + s * (X1 - X0)) / 2 + X0 * s;
    }
  }
  // track (x toward the target, y toward the cans) to screen
  const T = (x, y) => (portrait ? [ox - y * s, oy - x * s] : [ox + x * s, oy - y * s]);
  const line = (pts, style, w = 1.5, dash = null) => {
    g.beginPath(); pts.forEach((p, i) => { const q = T(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.setLineDash(dash || []); g.strokeStyle = style; g.lineWidth = w; g.stroke(); g.setLineDash([]);
  };
  const label = (x, y, text, color, align = 'center', dx = 0, dy = 0) => {
    const q = T(x, y);
    g.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
    g.fillText(text, q[0] + dx, q[1] + dy);
  };
  function car(pose, style, fill) {
    const [x, y, psi] = pose, L = G.LENGTH[S.car], w = G.WIDTH / 2;
    const c = Math.cos(psi), sn = Math.sin(psi);
    const corners = [[-G.REAR, -w], [L - G.REAR, -w], [L - G.REAR, w], [-G.REAR, w]].map(([a, b]) => [x + a * c - b * sn, y + a * sn + b * c]);
    g.beginPath(); corners.forEach((p, i) => { const q = T(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.strokeStyle = style; g.lineWidth = 1.5; g.stroke();
  }

  function draw() {
    const m = compute();
    g.clearRect(0, 0, W, H);
    const d = S.d;
    // 1 m grid over the track area
    g.lineWidth = 1; g.strokeStyle = C.grid;
    for (let x = 0; x <= 10.001; x += 1) line([[x, -0.6], [x, 1.6]], C.grid, 1);
    for (let y = -0.5; y <= 1.51; y += 0.5) line([[-0.3, y], [10.3, y]], C.grid, 1);
    // centre line, start, target, bonus line
    line([[0, 0], [d, 0]], C.muted, 1.2, [6, 6]);
    line([[0, -0.3], [0, 0.3]], C.text2, 2);
    label(0, -0.3, 'Start', C.text2, portrait ? 'left' : 'center', portrait ? 6 : 0, portrait ? 0 : 12);
    const tq = T(d, 0);
    g.beginPath(); g.arc(tq[0], tq[1], 6, 0, Math.PI * 2); g.strokeStyle = C.text; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.moveTo(tq[0] - 9, tq[1]); g.lineTo(tq[0] + 9, tq[1]); g.moveTo(tq[0], tq[1] - 9); g.lineTo(tq[0], tq[1] + 9); g.stroke();
    label(d, -0.3, 'Target', C.text, portrait ? 'left' : 'center', portrait ? 6 : 0, portrait ? 0 : 12);
    line([[d / 2, -0.15], [d / 2, 1.3]], C.text2, 1.2, [2, 4]);
    label(d / 2, -0.3, 'Bonus line', C.text2, portrait ? 'left' : 'center', portrait ? 6 : 0, portrait ? 0 : 12);
    // the gap and the two cans (outer can's inside edge 1.00 m out, inner can gap inside it)
    line([[d / 2, G.OUTER_CAN - S.gap], [d / 2, G.OUTER_CAN]], C.gap, Math.max(6, 0.12 * s));
    for (const cy of [G.OUTER_CAN + G.CAN_R, G.OUTER_CAN - S.gap - G.CAN_R]) {
      const q = T(d / 2, cy);
      g.beginPath(); g.arc(q[0], q[1], Math.max(3.5, G.CAN_R * s), 0, Math.PI * 2); g.fillStyle = C.can; g.fill();
    }
    if (portrait) label(d / 2, G.OUTER_CAN + 2 * G.CAN_R, 'Cans', C.text2, 'right', -8, 0);
    else label(d / 2, G.OUTER_CAN + 2 * G.CAN_R + 0.12, 'Cans', C.text2, 'center');
    // scale bar
    const sb = portrait ? [W - 16 - s, H - 16] : [16, H - 18];
    g.strokeStyle = C.text2; g.lineWidth = 2; g.beginPath(); g.moveTo(sb[0], sb[1]); g.lineTo(sb[0] + s, sb[1]); g.stroke();
    g.font = '600 11.5px system-ui, sans-serif'; g.fillStyle = C.text2; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('1 m', sb[0] + s / 2, sb[1] - 4);

    if (!m.plan) {
      g.font = '600 14px system-ui, sans-serif'; g.fillStyle = C.bad; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('This steering turns too tight to reach the target', W / 2, portrait ? H * 0.2 : 24);
      out.set({ steer: steerText(m.cmd), plan: 'Too tight', pcans: '-', err: '-', stop: '-', rcans: '-', worst: '-' });
      canvas.setAttribute('aria-label', 'Track top view: the steering setting turns too tight for the car to reach the target.');
      return;
    }
    const { plan } = m;
    // band of every run inside the play: the two extreme arcs, filled between
    const a = G.arcPoints(plan.alpha, m.lo.k, plan.s), b = G.arcPoints(plan.alpha, m.hi.k, plan.s);
    g.beginPath();
    [...a, ...b.reverse()].forEach((p, i) => { const q = T(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath(); g.fillStyle = C.band; g.fill();
    line(a, 'rgba(255,107,53,0.45)', 1); line(b, 'rgba(255,107,53,0.45)', 1);
    // start pose, planned arc, planned stop
    car([0, 0, plan.alpha], C.text2, 'rgba(237,232,226,0.08)');
    const pp = G.arcPoints(plan.alpha, plan.k, plan.s);
    line(pp, C.accent, 2, [7, 5]);
    // this run
    if (m.run) {
      const upto = plan.s * S.anim;
      const rp = G.arcPoints(plan.alpha, m.run.k, upto, Math.max(2, Math.round(80 * S.anim)));
      line(rp, C.text, 2.2);
      car(G.poseAt(plan.alpha, m.run.k, upto), C.text, 'rgba(237,232,226,0.28)');
    }

    // readouts
    const done = m.run && S.anim >= 1;
    out.set({
      steer: steerText(m.cmd),
      plan: `${plan.R === Infinity ? 'Straight' : `${plan.R.toFixed(1)} m radius`}`,
      pcans: `${Math.round(m.pcross.y * 100)} cm out: ${m.pcans === 'between' ? 'between' : 'misses'}`,
      err: m.run ? `${m.err >= 0 ? '+' : '−'}${Math.abs(m.err).toFixed(2)}°` : 'Press Run',
      stop: done ? `${fmtM(m.run.miss)} off (${Math.round(m.run.miss * 200)} pts)` : '-',
      rcans: done ? CANS[m.rcans] : '-',
      worst: `${fmtM(Math.max(m.lo.miss, m.hi.miss))} off target`,
    });
    canvas.setAttribute('aria-label', `Top view of a ${d.toFixed(1)} m track. ${S.car === 'v1' ? 'Version 1' : 'Version 2'} steered ${(m.cmd / DEG).toFixed(2)} degrees; the planned arc passes ${Math.round(m.pcross.y * 100)} cm off the line at the bonus line. With ±${S.play.toFixed(2)} degrees of play the car can stop up to ${fmtM(Math.max(m.lo.miss, m.hi.miss))} from the target.`);
  }
  function steerText(cmd) {
    const deg = `${(cmd / DEG).toFixed(2)}°`;
    return S.car === 'v2' ? `${deg} from ${S.mm.toFixed(2)} mm` : deg;
  }

  layout(); draw();
  const ro = new ResizeObserver(() => { layout(); draw(); });
  ro.observe(el);
  return { dispose() { cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); } };
}

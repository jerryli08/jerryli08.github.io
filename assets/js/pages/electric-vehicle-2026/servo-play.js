// "Why the servo could not steer this", scroll-driven, 2D canvas (no WebGL). A top view of one
// 2025-26 Electric Vehicle track, to scale: 8.0 m to the target, the inner can 30 cm inside the
// outer one, so the plan is to pass 85 cm off the line at the bonus line. As the reader scrolls it
// draws, for version 1 and then version 2: the planned arc, the band of everywhere the car can go
// if the steering is off by the play, three runs with errors picked inside that play, and (version
// 1) the two whole-degree settings its code could send. A panel below zooms in on the cans.
//
// The play, ±0.25°, is an assumption, not a measured number, and the picture says so. The model
// (geom.js): wheelbases from my CAD, track layout from the rules, the steering set once and held,
// the car aimed so the planned arc ends on the target and driven the planned arc length, no slip.
// Every picture is a pure function of (step, stepP); nothing moves on its own.
import * as G from './geom.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- the scenario (computed once)
const D = 8.0;                 // m, start to target
const GAP = 0.3;               // m, inner can this far inside the outer one
const PLAY = 0.25;             // degrees either way: ASSUMED
const ERRS = [-0.18, 0.07, 0.22]; // degrees: the three runs, picked inside the play
const PLAN = G.planForOffset(D, G.OUTER_CAN - GAP / 2); // through the middle of the gap, ending on the target
const CARS = ['v1', 'v2'].map((id) => {
  const wb = G.WHEELBASE[id], steer = Math.atan(wb * PLAN.k);
  return {
    id, wb, steer, L: G.LENGTH[id],
    travel: id === 'v2' ? G.travelForRight(steer) : null,
    runs: ERRS.map((e) => ({ e, ...G.runWith(PLAN, D, steer + e * DEG, wb) })),
  };
});
const WHOLE = [0, 1].map((deg) => ({ deg, plan: G.planForSteer(D, deg * DEG, G.WHEELBASE.v1) }));
for (const w of WHOLE) { w.cross = G.crossing(w.plan.alpha, w.plan.k, w.plan.s, D / 2); w.cans = G.canCheck(w.cross, GAP); }

const C = {
  text: '#eee9e3', text2: '#b8b0a7', muted: '#8c847b', grid: 'rgba(237,232,226,0.07)',
  v1: '#ff6b35', v2: '#5aa9ff', ok: '#7fd49a', bad: '#ff8a7a', can: '#d9dde2', gap: 'rgba(127,212,154,0.2)',
};
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const CANS = { between: 'between the cans', inner: 'misses, inside', outer: 'misses, outside', short: 'stops short' };
const fmtDeg = (d) => `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(2)}°`;
const fmtM = (m) => (m >= 1 ? `${m.toFixed(2)} m` : `${Math.round(m * 100)} cm`);

export function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  el.append(canvas);
  const g = canvas.getContext('2d');

  // the readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.style.zIndex = '2';
  hud.innerHTML = `
    <div class="rx-hud-row"><span data-k="car"></span><b class="num" data-k="wb"></b></div>
    <table class="num"><tbody>
      <tr><td data-k="l1"></td><td data-k="v1"></td></tr>
      <tr><td data-k="l2"></td><td data-k="v2"></td></tr>
      <tr><td data-k="l3"></td><td data-k="v3"></td></tr>
      <tr data-k="r4"><td data-k="l4"></td><td data-k="v4"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span data-k="bl"></span><b class="num" data-k="bv"></b></div>`;
  el.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const show = (k, on) => { const v = on ? '' : 'none'; if (shown[`${k}:d`] !== v) { K[k].style.display = v; shown[`${k}:d`] = v; } };

  // ---------------------------------------------------------------- layout (on resize only)
  let L = null;
  function layout() {
    const W = Math.max(1, el.clientWidth), H = Math.max(1, el.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const narrow = W < 640, pad = narrow ? 12 : 26;
    // desktop: the readout sits bottom right, beside the zoom panel; phone: across the top (site.css)
    if (narrow) Object.assign(hud.style, { top: '', bottom: '', left: '', right: '', width: '' });
    else Object.assign(hud.style, { top: 'auto', left: 'auto', bottom: `${pad}px`, right: `${pad}px`, width: `${Math.round(clamp(W * 0.36, 280, 350))}px` });
    const hudH = hud.offsetHeight;
    const top = narrow ? hudH + 8 + 16 : pad + 18;
    // main strip: the whole track, to scale
    const X0 = -0.45, X1 = D + 0.45, Y0 = -1.15, Y1 = 1.6;
    const s = Math.min((W - 2 * pad) / (X1 - X0), (H - top) * 0.46 / (Y1 - Y0));
    const ox = (W - s * (X1 - X0)) / 2 - X0 * s, oy = top + Y1 * s;
    const stripBottom = top + (Y1 - Y0) * s;
    // zoom panel: the bonus line around the cans
    const zTop = stripBottom + (narrow ? 26 : 34);
    const zRight = narrow ? W - pad : W - pad - hud.offsetWidth - 22;
    const zw = Math.max(80, zRight - pad), zh = Math.max(60, H - pad - zTop);
    const ZY0 = 0.28, ZY1 = 1.42; // m off the line
    const zs = Math.min(zh / (ZY1 - ZY0), (zw / 1.0) * 2);
    const zSpanX = zw / zs;
    const zx = pad + zw / 2 - (D / 2) * zs, zy = zTop + zh / 2 + ((ZY0 + ZY1) / 2) * zs;
    L = { W, H, dpr, narrow, pad, hudH, s, ox, oy, top, stripBottom, z: { x: pad, y: zTop, w: zw, h: zh, s: zs, ox: zx, oy: zy, x0: D / 2 - zSpanX / 2, x1: D / 2 + zSpanX / 2, y0: ZY0, y1: ZY1 } };
  }
  const T = (x, y) => [L.ox + x * L.s, L.oy - y * L.s];
  const Z = (x, y) => [L.z.ox + x * L.z.s, L.z.oy - y * L.z.s];

  // ---------------------------------------------------------------- drawing helpers
  function poly(pts, map, style, w = 1.5, dash = null, alpha = 1) {
    if (alpha <= 0.01 || pts.length < 2) return;
    g.globalAlpha = alpha;
    g.beginPath(); pts.forEach((p, i) => { const q = map(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.setLineDash(dash || []); g.strokeStyle = style; g.lineWidth = w; g.lineJoin = 'round'; g.stroke(); g.setLineDash([]);
    g.globalAlpha = 1;
  }
  function band(a, b, map, fill, alpha) {
    if (alpha <= 0.01) return;
    g.globalAlpha = alpha;
    g.beginPath(); [...a, ...[...b].reverse()].forEach((p, i) => { const q = map(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.closePath(); g.fillStyle = fill; g.fill();
    g.globalAlpha = 1;
  }
  function text(str, x, y, color, o = {}) {
    g.font = `${o.weight || 600} ${Math.max(12.5, o.size || 12.5)}px system-ui, -apple-system, "Segoe UI", sans-serif`; // the site.css overlay floor
    g.fillStyle = color; g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
    g.globalAlpha = o.alpha ?? 1;
    g.fillText(str, x, y);
    g.globalAlpha = 1;
  }
  function car(pose, len, map, stroke, fill, alpha = 1) {
    if (alpha <= 0.01) return;
    const [x, y, psi] = pose, w = G.WIDTH / 2, c = Math.cos(psi), sn = Math.sin(psi);
    const pts = [[-G.REAR, -w], [len - G.REAR, -w], [len - G.REAR, w], [-G.REAR, w]].map(([a, b]) => map(x + a * c - b * sn, y + a * sn + b * c));
    g.globalAlpha = alpha;
    g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke();
    g.globalAlpha = 1;
  }
  const arc = (alpha, k, len, n = 90) => G.arcPoints(alpha, k, Math.max(1e-4, len), n);

  // the fixed parts of the picture: grid, line, start, target, bonus line, cans, zoom frame
  function scene() {
    const { W, H, narrow } = L;
    g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (let x = 0; x <= D + 0.001; x += 1) poly([[x, -1.05], [x, 1.5]], T, C.grid, 1);
    for (let y = -1; y <= 1.51; y += 0.5) poly([[-0.3, y], [D + 0.3, y]], T, C.grid, 1);
    poly([[0, 0], [D, 0]], T, C.muted, 1.2, [6, 6]);
    poly([[0, -0.3], [0, 0.3]], T, C.text2, 2);
    const [sx, sy] = T(0, -0.3); text('Start', sx, sy + 12, C.text2);
    const [tx, ty] = T(D, 0);
    g.beginPath(); g.arc(tx, ty, 6, 0, Math.PI * 2); g.strokeStyle = C.text; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.moveTo(tx - 9, ty); g.lineTo(tx + 9, ty); g.moveTo(tx, ty - 9); g.lineTo(tx, ty + 9); g.stroke();
    const [, tl] = T(D, -1.12); text('Target', tx, tl, C.text);
    poly([[D / 2, -0.15], [D / 2, 1.35]], T, C.text2, 1.2, [2, 4]);
    const [bx, by] = T(D / 2, 1.35); text('Bonus line', bx, by - 9, C.text2);
    for (const cy of [G.OUTER_CAN + G.CAN_R, G.OUTER_CAN - GAP - G.CAN_R]) {
      const [cx, cyy] = T(D / 2, cy); g.beginPath(); g.arc(cx, cyy, Math.max(3, G.CAN_R * L.s), 0, Math.PI * 2); g.fillStyle = C.can; g.fill();
    }
    // scale bar, in the empty corner by the start
    const sb = T(-0.35, -0.95);
    g.strokeStyle = C.text2; g.lineWidth = 2; g.beginPath(); g.moveTo(sb[0], sb[1]); g.lineTo(sb[0] + L.s, sb[1]); g.stroke();
    text('1 m', sb[0] + L.s + 8, sb[1], C.text2, { align: 'left', size: 11.5 });
    // where the zoom panel looks, outlined on the track
    const z = L.z, [ax, ay] = T(z.x0, z.y1), [cx2, cy2] = T(z.x1, z.y0);
    g.strokeStyle = 'rgba(237,232,226,0.35)'; g.lineWidth = 1; g.strokeRect(ax, ay, cx2 - ax, cy2 - ay);
    // zoom panel frame and its fixed parts
    g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(z.x, z.y, z.w, z.h);
    g.strokeStyle = 'rgba(237,232,226,0.18)'; g.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
    text(`At the cans, ${(z.s / L.s).toFixed(0)}x closer`, z.x + 10, z.y - 11, C.text2, { align: 'left', size: 11.5 });
  }
  function zoomFixed() {
    const z = L.z;
    g.save(); g.beginPath(); g.rect(z.x, z.y, z.w, z.h); g.clip();
    for (let y = 0.5; y <= 1.5; y += 0.1) poly([[z.x0, y], [z.x1, y]], Z, C.grid, 1);
    poly([[D / 2, z.y0], [D / 2, z.y1]], Z, C.text2, 1.2, [2, 4]);
    const [ga, gb] = [Z(D / 2, G.OUTER_CAN), Z(D / 2, G.OUTER_CAN - GAP)];
    g.fillStyle = C.gap; g.fillRect(ga[0] - 0.035 * z.s, ga[1], 0.07 * z.s, gb[1] - ga[1]);
    for (const cy of [G.OUTER_CAN + G.CAN_R, G.OUTER_CAN - GAP - G.CAN_R]) {
      const [cx, cyy] = Z(D / 2, cy); g.beginPath(); g.arc(cx, cyy, G.CAN_R * z.s, 0, Math.PI * 2); g.fillStyle = C.can; g.fill();
    }
    const [lx, ly] = Z(D / 2, G.OUTER_CAN - GAP / 2);
    text(`${Math.round(GAP * 100)} cm gap`, lx + 0.045 * z.s, ly, C.ok, { align: 'left', size: 11.5, alpha: 0.9 });
    g.restore();
  }
  const inZoom = (fn) => { const z = L.z; g.save(); g.beginPath(); g.rect(z.x, z.y, z.w, z.h); g.clip(); fn(); g.restore(); };

  // ---------------------------------------------------------------- one car's layer
  // o: { plan: 0..1 drawn, planA, play: degrees of band shown, bandA, runs: [0..1 drawn each], runsA }
  function carLayer(c, o) {
    const col = C[c.id];
    if (o.bandA > 0.01 && o.play > 0.001) {
      const lo = G.runWith(PLAN, D, c.steer - o.play * DEG, c.wb), hi = G.runWith(PLAN, D, c.steer + o.play * DEG, c.wb);
      const a = arc(PLAN.alpha, lo.k, PLAN.s), b = arc(PLAN.alpha, hi.k, PLAN.s);
      band(a, b, T, rgba(col, 0.2), o.bandA); poly(a, T, rgba(col, 0.55), 1, null, o.bandA); poly(b, T, rgba(col, 0.55), 1, null, o.bandA);
      inZoom(() => { band(a, b, Z, rgba(col, 0.2), o.bandA); poly(a, Z, rgba(col, 0.6), 1, null, o.bandA); poly(b, Z, rgba(col, 0.6), 1, null, o.bandA); });
      if (o.playLabel) {
        // the assumption, said on the picture: by the band's outer edge at the target, or on a
        // phone (no room up there) in the zoom panel's top corner
        const msg = `±${o.play.toFixed(2)}° of play (assumed)`, a = o.bandA * o.playLabel;
        if (L.narrow) text(msg, L.z.x + 8, L.z.y + 12, col, { align: 'left', size: 11, alpha: a });
        else { const [ex, ey] = T(lo.end[0], lo.end[1]); text(msg, ex - 10, ey - 14, col, { align: 'right', size: 11.5, alpha: a }); }
      }
    }
    if (o.planA > 0.01 && o.plan > 0.001) {
      const pts = arc(PLAN.alpha, PLAN.k, PLAN.s * o.plan);
      poly(pts, T, col, 2, [7, 5], o.planA);
      inZoom(() => poly(pts, Z, col, 2, [7, 5], o.planA));
      if (o.plan < 1) car(G.poseAt(PLAN.alpha, PLAN.k, PLAN.s * o.plan), c.L, T, col, rgba(col, 0.25), o.planA);
    }
    c.runs.forEach((r, i) => {
      const f = o.runs?.[i] ?? 0, a = o.runsA ?? 0;
      if (f <= 0.001 || a <= 0.01) return;
      const pts = arc(PLAN.alpha, r.k, PLAN.s * f);
      const res = G.canCheck(r.cross, GAP), good = res === 'between';
      poly(pts, T, C.text, 2, null, a);
      inZoom(() => poly(pts, Z, C.text, 2, null, a));
      const pose = G.poseAt(PLAN.alpha, r.k, PLAN.s * f);
      const passed = r.cross && pose[0] >= D / 2;
      if (passed) inZoom(() => car([D / 2, r.cross.y, r.cross.psi], c.L, Z, good ? C.ok : C.bad, rgba(good ? C.ok : C.bad, 0.16), a));
      if (f < 1) car(pose, c.L, T, C.text, 'rgba(237,232,226,0.3)', a);
      else {
        const [x, y] = T(r.end[0], r.end[1]);
        g.globalAlpha = a; g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fillStyle = good ? C.ok : C.bad; g.fill(); g.globalAlpha = 1;
        text(`${i + 1}`, x + 10, y, C.text, { align: 'left', size: 11.5, alpha: a });
      }
    });
  }

  // ---------------------------------------------------------------- the picture, from the scroll
  const runFrac = (sp, i) => (reduced ? 1 : smooth(0.1 + i * 0.27, 0.32 + i * 0.27, sp));
  let last = [0, 0];
  function draw(step, sp) {
    const v1 = CARS[0], v2 = CARS[1];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.35, sp);
    // version 1's layer: plan (step 0), band (1), runs (2), whole degrees (3), a ghost under version 2 (4)
    const o1 = {
      plan: step === 0 ? (reduced ? 1 : smooth(0.06, 0.7, sp)) : 1,
      planA: step <= 2 ? 1 : step === 3 ? 0.5 : lerp(0.5, 0, k),
      play: step === 0 ? 0 : step === 1 ? PLAY * (reduced ? 1 : smooth(0.1, 0.65, sp)) : PLAY,
      bandA: step === 0 ? 0 : step <= 2 ? 1 : step === 3 ? lerp(1, 0.55, k) : 0.55,
      playLabel: step === 1 ? (reduced ? 1 : smooth(0.4, 0.7, sp)) : step === 2 ? 1 : step === 3 ? 1 - k : 0,
      runs: step === 2 ? ERRS.map((_, i) => runFrac(sp, i)) : [1, 1, 1],
      runsA: step === 2 ? 1 : step === 3 ? 1 - k : 0,
    };
    // the readout first: on a phone the picture starts below it
    readout(step, sp, o1);
    if (!L || (L.narrow && Math.abs(L.hudH - hud.offsetHeight) > 2)) layout();
    scene();
    zoomFixed();
    carLayer(v1, o1);
    // version 1's whole-degree settings
    if (step === 3) {
      const f = reduced ? 1 : smooth(0.12, 0.75, sp);
      WHOLE.forEach((w, i) => {
        const pts = arc(w.plan.alpha, w.plan.k, w.plan.s * f);
        poly(pts, T, C.text, 1.8, null, k);
        inZoom(() => poly(pts, Z, C.text, 1.8, null, k));
        if (f > 0.55) {
          const at = w.cross ? [D / 2, w.cross.y] : [D / 2, 0];
          const [x, y] = T(at[0] + 0.25, at[1]);
          text(`${w.deg}°`, x, y + (i ? -10 : 10), C.text, { align: 'left', size: 12.5, alpha: smooth(0.55, 0.75, f) * k });
          if (w.cross && w.cross.y > L.z.y0 && w.cross.y < L.z.y1) {
            const res = w.cans === 'between';
            inZoom(() => car([D / 2, w.cross.y, w.cross.psi], v1.L, Z, res ? C.ok : C.bad, rgba(res ? C.ok : C.bad, 0.16), k));
          }
        }
      });
    }
    if (step === 4) {
      carLayer(v2, {
        plan: reduced ? 1 : smooth(0, 0.3, sp), planA: k,
        play: PLAY, bandA: reduced ? 1 : smooth(0.15, 0.35, sp), playLabel: 1,
        runs: ERRS.map((_, i) => (reduced ? 1 : smooth(0.36 + i * 0.2, 0.52 + i * 0.2, sp))), runsA: 1,
      });
      // a legend, so the ghost reads as version 1: on the zoom panel's title line, at its right
      const [rx, ly] = [L.z.x + L.z.w - 4, L.z.y - 11];
      text('Version 2', rx, ly, C.v2, { align: 'right', size: 11.5, alpha: k });
      const w2 = g.measureText('Version 2').width;
      text(L.narrow ? 'Version 1' : 'Version 1, same play', rx - w2 - 16, ly, C.v1, { align: 'right', size: 11.5, alpha: 0.9 * k });
    }
  }

  function readout(step, sp, o1) {
    const c = step === 4 ? CARS[1] : CARS[0];
    const steerDeg = c.steer / DEG;
    put('car', c.id === 'v1' ? 'Version 1: servo' : 'Version 2: caliper');
    put('wb', `${Math.round(c.wb * 1000)} mm wheelbase`);
    const band = (play) => {
      const lo = G.runWith(PLAN, D, c.steer - play * DEG, c.wb), hi = G.runWith(PLAN, D, c.steer + play * DEG, c.wb);
      return { lo, hi, worst: Math.max(lo.miss, hi.miss), inner: Math.min(lo.cross.y, hi.cross.y), outer: Math.max(lo.cross.y, hi.cross.y) };
    };
    const rows = [];
    let big = ['', ''], mini = '';
    if (step === 0) {
      rows.push(['Steering, held', `${steerDeg.toFixed(2)}°`], ['Arc', `${PLAN.R.toFixed(1)} m radius`], ['Aimed out at the start', `${(PLAN.alpha / DEG).toFixed(1)}°`]);
      big = ['At the bonus line', `${Math.round((G.OUTER_CAN - GAP / 2) * 100)} cm out`];
      mini = `${steerDeg.toFixed(2)}° of steering, a ${PLAN.R.toFixed(1)} m arc`;
    } else if (step === 1) {
      const b = band(o1.play);
      rows.push(['Steering, held', `${steerDeg.toFixed(2)}°`], ['Play (assumed)', `±${o1.play.toFixed(2)}°`], ['At the cans', o1.play > 0.005 ? `${Math.round(b.inner * 100)} to ${Math.round(b.outer * 100)} cm out` : `${Math.round((G.OUTER_CAN - GAP / 2) * 100)} cm out`]);
      big = ['Worst stop', fmtM(b.worst)];
      mini = `±${o1.play.toFixed(2)}° of play (assumed): stops up to ${fmtM(b.worst)} off`;
    } else if (step === 2 || step === 4) {
      const fr = step === 2 ? o1.runs : ERRS.map((_, i) => (reduced ? 1 : smooth(0.36 + i * 0.2, 0.52 + i * 0.2, sp)));
      if (step === 4) rows.push(['Steering, held', `${steerDeg.toFixed(2)}° (${c.travel.toFixed(2)} mm of caliper)`]);
      let lastDone = -1;
      c.runs.forEach((r, i) => {
        const done = fr[i] >= 0.999;
        if (done) lastDone = i;
        rows.push([`Run ${i + 1}, ${fmtDeg(r.e)}`, done ? `${CANS[G.canCheck(r.cross, GAP)]}, ${fmtM(r.miss)}` : fr[i] > 0.001 ? 'driving' : '']);
      });
      if (lastDone >= 0) {
        const r = c.runs[lastDone];
        big = [`Run ${lastDone + 1}: Distance Score`, `${Math.round(r.miss * 200)} points`];
        mini = `Run ${lastDone + 1} (${fmtDeg(r.e)}): ${CANS[G.canCheck(r.cross, GAP)]}, stops ${fmtM(r.miss)} off`;
      } else {
        const b = band(PLAY);
        big = ['Worst stop in the play', fmtM(b.worst)];
        mini = `±${PLAY.toFixed(2)}° of play (assumed): stops up to ${fmtM(b.worst)} off`;
      }
    } else {
      rows.push(['Needed', `${steerDeg.toFixed(2)}°`]);
      for (const w of WHOLE) rows.push([`${w.deg}°`, w.plan.k ? `${w.plan.R.toFixed(1)} m arc, ${Math.round(w.cross.y * 100)} cm out` : `straight, ${Math.round(w.cross.y * 100)} cm out`]);
      big = ['Through the gap', 'neither'];
      mini = `${steerDeg.toFixed(2)}° needed; 0° and 1° both miss the gap`;
    }
    for (let i = 0; i < 4; i++) { put(`l${i + 1}`, rows[i]?.[0] ?? ''); put(`v${i + 1}`, rows[i]?.[1] ?? ''); }
    show('r4', rows.length > 3);
    put('bl', big[0]); put('bv', big[1]); put('mini', mini);
    canvas.setAttribute('aria-label', `Top view of an ${D.toFixed(0)} m track, to scale, with the inner can ${Math.round(GAP * 100)} cm inside the outer one. ${c.id === 'v1' ? 'Version 1' : 'Version 2'} steers ${steerDeg.toFixed(2)} degrees to pass through the middle of the gap. With ${PLAY} degrees of play either way (an assumption), it can stop up to ${fmtM(band(PLAY).worst)} from the target.`);
  }

  function setProgress(p, step, stepP) {
    last = [clamp(step | 0, 0, 4), clamp(stepP, 0, 1)];
    draw(...last);
  }
  const ro = new ResizeObserver(() => { layout(); draw(...last); });
  ro.observe(el);
  draw(0, 0);
  return { setProgress, dispose() { ro.disconnect(); canvas.remove(); hud.remove(); } };
}

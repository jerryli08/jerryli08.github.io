// Our autonomous routine, drawn from the code's Road Runner poses and driven by the scroll.
// Poses, headings, offsets and thresholds are the code's (github.com/CMP-18996/STATIC-CENTERSTAGE):
//   GlobalVariables     start poses REDCLOSE (12, -61, 90 deg) ... (inches, Road Runner field frame)
//   PropProcessor       HSV threshold for our colour, largest blob, centre x < 100 px LEFT,
//                       < 437.5 px MIDDLE, else RIGHT; decides after 15 votes
//   SpikePushCommand    RED, LEFT: lineToLinearHeading(x + 3, -61 + (15 + 5), 90 + 30 deg)
//   ToBoardCommand      REDCLOSE: lineToLinearHeading(42, -36, 0 deg)
//   ToTagCommand        spline to (x + range cos(yaw) - 5.5, y - (range sin(yaw) + tag x) + 8.5 for LEFT)
//   AutoDropCommand     lift HEIGHTONE (100 ticks), arm HIGHDROP (0.73), open both grabbers
//   ToStackCommand      (experimental routine) reversed splines through (27, -6), (-40, -6) to (-62, -17)
//   FromStackCommand    splines back through (27, -6) to (43, -36)
// The robot is an 18 in square footprint, not a model. Field elements (backdrop, truss, spike
// marks, stacks) are placed approximately; the final tag pose assumes the camera sees the centre
// tag straight ahead, since the real one comes from what the camera measures.
// Splines are drawn as cubic Hermite curves through the code's waypoints and end tangents.
import { clamp, smooth, lerp, css, h, s, svgRoot, setter, hexPoints, PIXEL } from './kit.js';

const D2R = Math.PI / 180;
const norm = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };

function line(a, b, n = 48) {
  const dh = norm(b[2] - a[2]);
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), a[2] + dh * t]; });
}
// cubic Hermite through waypoints [x, y, tangentDeg]; heading held constant (splineToConstantHeading)
function spline(pts, heading, n = 40) {
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0, t0] = pts[k], [x1, y1, t1] = pts[k + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const m0 = [Math.cos(t0 * D2R) * L, Math.sin(t0 * D2R) * L], m1 = [Math.cos(t1 * D2R) * L, Math.sin(t1 * D2R) * L];
    for (let i = k ? 1 : 0; i <= n; i++) {
      const t = i / n, t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([h00 * x0 + h10 * m0[0] + h01 * x1 + h11 * m1[0], h00 * y0 + h10 * m0[1] + h01 * y1 + h11 * m1[1], heading]);
    }
  }
  return out;
}
function withLength(pts) {
  let L = 0;
  return pts.map((p, i) => { if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return { x: p[0], y: p[1], h: p[2], s: L }; });
}
function at(path, f) { // pose at fraction f of the path's length
  const L = path[path.length - 1].s * clamp(f, 0, 1);
  let i = 1;
  while (i < path.length - 1 && path[i].s < L) i++;
  const a = path[i - 1], b = path[i];
  const t = b.s > a.s ? (L - a.s) / (b.s - a.s) : 0;
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), h: a.h + norm(b.h - a.h) * t };
}

const START = [12, -61, 90];
const SPIKE = [12 + 3, -61 + 20, 90 + 30];
const BOARD = [42, -36, 0];
const TAG = [48, -36 + 8.5, 0];
const PATHS = [
  null,
  withLength(line(START, SPIKE)),
  withLength(line(SPIKE, BOARD)),
  withLength(spline([[BOARD[0], BOARD[1], Math.atan2(TAG[1] - BOARD[1], TAG[0] - BOARD[0]) / D2R], [TAG[0], TAG[1], 0]], 0)),
  null,
  withLength(spline([[TAG[0], TAG[1], 180], [27, -6, 180], [-40, -6, 180], [-62, -17, 180]], 0)),
];
const BACK = withLength(spline([[-62, -17, 0], [27, -6, 0], [43, -36, 0]], 0));
const CMD = ['PropProcessor', 'SpikePushCommand', 'ToBoardCommand', 'ToTagCommand', 'AutoDropCommand', 'ToStackCommand'];

const CSS = `
.fc-au { position: absolute; inset: 0; }
.fc-au svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; font-family: var(--font); }
.fc-au .rx-hud { top: auto; right: auto; width: auto; }
.fc-au .rx-hud td { font-variant-numeric: tabular-nums; }
.fc-au-mini { position: absolute; z-index: 3; left: 8px; right: 8px; bottom: 8px; display: none; padding: 6px 10px; border-radius: 10px; background: rgba(10,8,7,0.82); border: 1px solid rgba(255,255,255,0.12); font-size: 12px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-au-narrow .fc-au-mini { display: block; }
.fc-au-narrow .rx-hud { display: none; }
`;

export function mount(el, ctx) {
  css('fc-au-css', CSS);
  const reduced = ctx.reducedMotion;
  const S = setter();
  const root = h('div', 'fc-au');
  const svg = svgRoot();
  svg.setAttribute('role', 'img');
  root.append(svg);
  const hudEl = h('div', 'rx-hud');
  hudEl.innerHTML = `<div class="rx-hud-row"><span>Command</span><b data-k="cmd"></b></div>
    <table><tbody>
      <tr><td>x</td><td data-k="x"></td></tr><tr><td>y</td><td data-k="y"></td></tr><tr><td>Heading</td><td data-k="h"></td></tr>
      <tr><td data-k="nl"></td><td data-k="nv"></td></tr>
    </tbody></table>`;
  root.append(hudEl);
  const K = Object.fromEntries([...hudEl.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const mini = h('div', 'fc-au-mini');
  root.append(mini);
  el.append(root);

  let G = null, built = '';
  function build() {
    const W = el.clientWidth, H = el.clientHeight;
    const key = `${W}x${H}`;
    if (!W || !H || key === built) return;
    built = key;
    svg.textContent = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const narrow = W < 700;
    root.classList.toggle('fc-au-narrow', narrow);
    const side = narrow ? Math.min(W - 16, H - 48) : Math.min(H - 56, W - 330);
    const fx = narrow ? (W - side) / 2 : 28, fy = narrow ? 8 : (H - side) / 2;
    if (!narrow) Object.assign(hudEl.style, { left: `${fx + side + 24}px`, top: `${fy + side * 0.3}px`, width: `${Math.min(270, W - fx - side - 48)}px` });
    const k = side / 144;
    const X = (x) => fx + (x + 72) * k, Y = (y) => fy + (72 - y) * k;
    const fs = Math.max(9.5, Math.min(12.5, k * 1.9));
    const t = (parent, str, x, y, attrs = {}) => { const e = s(parent, 'text', { x, y, 'font-size': fs, fill: '#8c847b', ...attrs }); e.textContent = str; return e; };
    // field and tiles
    s(svg, 'rect', { x: fx, y: fy, width: side, height: side, rx: 6, fill: '#22201e', stroke: 'rgba(237,232,226,0.3)', 'stroke-width': 1.5 });
    for (let i = 1; i < 6; i++) {
      s(svg, 'line', { x1: X(-72 + 24 * i), x2: X(-72 + 24 * i), y1: Y(72), y2: Y(-72), stroke: 'rgba(237,232,226,0.07)' });
      s(svg, 'line', { y1: Y(-72 + 24 * i), y2: Y(-72 + 24 * i), x1: X(-72), x2: X(72), stroke: 'rgba(237,232,226,0.07)' });
    }
    // truss (approximate): the tile column between the two start positions, stage door in the middle
    const truss = s(svg, 'g', { opacity: 0.8 });
    for (const [y0, y1] of [[-72, -12], [12, 72]]) s(truss, 'rect', { x: X(-24), y: Y(y1), width: 24 * k, height: (y1 - y0) * k, fill: 'rgba(237,232,226,0.05)', stroke: 'rgba(237,232,226,0.18)', 'stroke-dasharray': '3 3' });
    t(truss, 'truss', X(-12), Y(-66), { 'text-anchor': 'middle' });
    // backdrops (red at the bottom right) with three tags each, centre tag 5 on red
    for (const [c, ys] of [['#e5484d', -36], ['#3d8bff', 36]]) {
      s(svg, 'rect', { x: X(60), y: Y(ys + 12), width: 6 * k, height: 24 * k, fill: c, opacity: 0.55 });
      for (const dy of [-6, 0, 6]) s(svg, 'rect', { x: X(58.2), y: Y(ys + dy + 1.2), width: 1.6 * k, height: 2.4 * k, fill: dy === 0 && c === '#e5484d' ? '#fff' : 'rgba(255,255,255,0.45)' });
    }
    t(svg, 'backdrop', X(63), Y(-50) + fs, { 'text-anchor': 'middle', fill: '#e5a0a2' });
    // pixel stacks at the far wall (approximate)
    for (const y of [-36, -24, -12, 12, 24, 36]) s(svg, 'polygon', { points: hexPoints(X(-69), Y(y), 3.2 * k), fill: 'none', stroke: 'rgba(241,237,230,0.55)', 'stroke-width': 1.3 });
    t(svg, 'stacks', X(-69), Y(-44), { 'text-anchor': 'middle' });
    // spike marks in front of the red close start (approximate) and our team prop on the left one
    for (const [x1, y1, x2, y2] of [[12, -36, 12, -24], [0, -30, 0, -18], [24, -30, 24, -18]]) s(svg, 'line', { x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), stroke: '#e5484d', 'stroke-width': Math.max(2, k * 1.1), 'stroke-linecap': 'round', opacity: 0.8 });
    s(svg, 'rect', { x: X(-2.5), y: Y(-21.5), width: 5 * k, height: 5 * k, rx: 1, fill: '#e5484d' });
    t(svg, 'team prop', X(-4.5), Y(-19), { 'text-anchor': 'end', fill: '#e5a0a2' });
    // the four start poses in the code; ours (red close) stays lit
    const starts = [['red close', 12, -61, 90], ['red far', -35, -61, 90], ['blue close', 12, 61, -90], ['blue far', -35, 61, -90]];
    for (const [n, x, y, hd] of starts) {
      if (n === 'red close') continue;
      s(svg, 'rect', { x: X(x - 9), y: Y(y + 9), width: 18 * k, height: 18 * k, fill: 'none', stroke: 'rgba(237,232,226,0.22)', 'stroke-dasharray': '3 3' });
      t(svg, `${n} (${x}, ${y}, ${hd}°)`, X(x), Y(y) + (y > 0 ? -12 * k : 12 * k) + (y > 0 ? 0 : fs), { 'text-anchor': 'middle', 'font-size': fs - 1 });
    }
    // paths: history (faint), current (dashed ahead, solid behind)
    const P = (path) => path.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    const pathEls = PATHS.map((path) => (path ? {
      ahead: s(svg, 'path', { d: P(path), fill: 'none', stroke: 'rgba(255,107,53,0.55)', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0 }),
      done: s(svg, 'path', { d: P(path), fill: 'none', stroke: '#ff6b35', 'stroke-width': 2.6, opacity: 0 }),
      len: 0,
    } : null));
    for (const pe of pathEls) if (pe) pe.len = pe.done.getTotalLength();
    const back = s(svg, 'path', { d: P(BACK), fill: 'none', stroke: 'rgba(237,232,226,0.45)', 'stroke-width': 1.6, 'stroke-dasharray': '2 5', opacity: 0 });
    const backLab = t(svg, 'back to the backdrop', X(-8), Y(-1.5), { 'text-anchor': 'middle', opacity: 0 });
    // pixels left by the routine
    const purple = s(svg, 'polygon', { points: hexPoints(X(0), Y(-28), 3.2 * k), fill: PIXEL.purple, opacity: 0 });
    const yellow = s(svg, 'polygon', { points: hexPoints(X(62.5), Y(TAG[1]), 3.2 * k), fill: PIXEL.yellow, opacity: 0 });
    // tag ray for the line-up step
    const ray = s(svg, 'line', { x1: 0, y1: 0, x2: X(59), y2: Y(-36), stroke: '#fff', 'stroke-width': 1.3, 'stroke-dasharray': '3 4', opacity: 0 });
    // the robot: an 18 in footprint with a heading mark
    const bot = s(svg, 'g');
    s(bot, 'rect', { x: -9 * k, y: -9 * k, width: 18 * k, height: 18 * k, rx: 1.4 * k, fill: 'rgba(255,107,53,0.2)', stroke: '#ff6b35', 'stroke-width': 2 });
    s(bot, 'path', { d: `M${3 * k},${-4 * k}L${8 * k},0L${3 * k},${4 * k}`, fill: 'none', stroke: '#ff6b35', 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
    const botLab = t(svg, '18996', 0, 0, { 'text-anchor': 'middle', fill: '#ffd2bf', 'font-weight': 700, 'font-size': fs - 1 });
    // camera view for the prop vote, drawn over the unused top left of the field
    const cam = s(svg, 'g', { opacity: 0 });
    const cw = Math.min(side * 0.44, 230), ch = cw * 0.75, cx0 = X(-66), cy0 = Y(64);
    s(cam, 'rect', { x: cx0 - 6, y: cy0 - fs - 12, width: cw + 12, height: ch + fs * 3 + 30, rx: 8, fill: 'rgba(10,8,7,0.9)', stroke: 'rgba(255,255,255,0.15)' });
    t(cam, 'Camera, before the start', cx0, cy0 - 6, { fill: '#b8b0a7', 'font-weight': 600 });
    s(cam, 'rect', { x: cx0, y: cy0, width: cw, height: ch, fill: '#141210', stroke: 'rgba(237,232,226,0.3)' });
    const bx = (px) => cx0 + (px / 640) * cw;
    for (const px of [100, 437.5]) s(cam, 'line', { x1: bx(px), x2: bx(px), y1: cy0, y2: cy0 + ch, stroke: 'rgba(255,107,53,0.7)', 'stroke-dasharray': '3 3' });
    s(cam, 'rect', { x: bx(22), y: cy0 + ch * 0.55, width: cw * 0.1, height: cw * 0.1, fill: '#e5484d' });
    const votes = ['LEFT', 'MIDDLE', 'RIGHT'].map((n, i) => {
      const x = i === 0 ? bx(50) : i === 1 ? bx(268) : bx(538);
      t(cam, n, x, cy0 + ch + fs + 4, { 'text-anchor': 'middle', 'font-size': fs - 1, fill: '#b8b0a7' });
      return t(cam, '0', x, cy0 + ch + fs * 2 + 9, { 'text-anchor': 'middle', 'font-weight': 700, fill: '#eee9e3' });
    });
    t(cam, '100 px', bx(100), cy0 + 12, { 'text-anchor': 'middle', 'font-size': fs - 2 });
    t(cam, '437.5 px', bx(437.5), cy0 + 12, { 'text-anchor': 'middle', 'font-size': fs - 2 });
    G = { X, Y, k, fs, bot, botLab, pathEls, back, backLab, purple, yellow, ray, cam, votes };
  }

  function pose(step, sp) {
    if (step === 0) return { x: START[0], y: START[1], h: START[2] };
    if (step === 4) return { x: TAG[0], y: TAG[1], h: 0 };
    const f = reduced ? 1 : smooth(0.08, 0.85, sp);
    return at(PATHS[step], f);
  }

  function draw(step, sp) {
    build();
    if (!G) return;
    const p = pose(step, sp);
    S.attr(G.bot, 'transform', `translate(${G.X(p.x).toFixed(2)} ${G.Y(p.y).toFixed(2)}) rotate(${(-p.h).toFixed(2)})`);
    // the team number stays upright; it sits behind the heading mark
    const back = p.h * Math.PI / 180;
    S.attr(G.botLab, 'x', (G.X(p.x - Math.cos(back) * 2.5)).toFixed(2));
    S.attr(G.botLab, 'y', (G.Y(p.y - Math.sin(back) * 2.5) + G.fs * 0.35).toFixed(2));
    const f = step === 0 || step === 4 ? 1 : reduced ? 1 : smooth(0.08, 0.85, sp);
    G.pathEls.forEach((pe, i) => {
      if (!pe) return;
      const cur = i === step, past = i < step && i !== 5;
      S.attr(pe.ahead, 'opacity', cur ? '1' : '0');
      S.attr(pe.done, 'opacity', cur || past ? (past ? '0.45' : '1') : '0');
      S.attr(pe.done, 'stroke-dasharray', cur ? `${(pe.len * f).toFixed(1)} ${pe.len.toFixed(1)}` : 'none');
    });
    const backOn = step === 5 ? (reduced ? 1 : smooth(0.86, 0.96, sp)) : 0;
    S.attr(G.back, 'opacity', backOn.toFixed(2)); S.attr(G.backLab, 'opacity', backOn.toFixed(2));
    S.attr(G.purple, 'opacity', (step > 1 ? 1 : step === 1 ? (reduced ? 1 : smooth(0.8, 0.9, sp)) : 0).toFixed(2));
    S.attr(G.yellow, 'opacity', (step > 4 ? 1 : step === 4 ? (reduced ? 1 : smooth(0.35, 0.6, sp)) : 0).toFixed(2));
    S.attr(G.ray, 'opacity', step === 3 ? '0.8' : '0');
    if (step === 3) { S.attr(G.ray, 'x1', G.X(p.x + 9).toFixed(1)); S.attr(G.ray, 'y1', G.Y(p.y).toFixed(1)); }
    // the vote
    const camOn = step === 0 ? 1 : 0;
    S.attr(G.cam, 'opacity', String(camOn));
    const n = step === 0 ? Math.round(15 * (reduced ? 1 : smooth(0.1, 0.75, sp))) : 15;
    S.text(G.votes[0], String(n));
    S.attr(G.votes[0], 'fill', n === 15 ? '#ff6b35' : '#eee9e3');
    // readout
    S.text(K.cmd, CMD[step]);
    S.text(K.x, `${p.x.toFixed(1)} in`);
    S.text(K.y, `${p.y.toFixed(1)} in`);
    S.text(K.h, `${Math.round(p.h)}°`);
    const note = [
      ['Votes', n === 15 ? '15, LEFT' : `${n} of 15`],
      ['Target', '(15, -41, 120°)'],
      ['Target', '(42, -36, 0°)'],
      ['Target', 'tag range - 5.5 in, y + 8.5 in'],
      ['Lift, arm', '100 ticks, 0.73'],
      ['Waypoints', '(27, -6), (-40, -6), (-62, -17)'],
    ][step];
    S.text(K.nl, note[0]); S.text(K.nv, note[1]);
    S.text(mini, `${CMD[step]} · (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${Math.round(p.h)}°)${step === 0 ? ` · votes ${n}/15` : ''}`);
    svg.setAttribute('aria-label', `Field schematic, step ${step + 1}: ${CMD[step]}, robot at x ${p.x.toFixed(1)} in, y ${p.y.toFixed(1)} in, heading ${Math.round(p.h)} degrees.`);
  }

  let last = [0, 0];
  function setProgress(pp, step, stepP) { last = [clamp(step | 0, 0, 5), clamp(stepP, 0, 1)]; draw(...last); }
  const ro = new ResizeObserver(() => { built = ''; draw(...last); });
  ro.observe(el);
  draw(0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}

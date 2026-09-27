// Why the deposit has its own sideways axis: a 2D schematic of the backdrop driven by the scroll.
// The backdrop's rows of pixels are staggered by half a pixel, so the pair of pixels in the deposit
// lines up with whole-pixel positions on one kind of row and half-pixel positions on the next.
// Every number is from our code (github.com/CMP-18996/STATIC-CENTERSTAGE):
//   DepositSubsystem  centerVal 0.74, incrementVal 0.067,
//                     LowerHorizontalState A..E = 0.74 + {2, 1, 0, -1, -2} x 0.067,
//                     UpperHorizontalState A..F = 0.74 + {2.5, 1.5, 0.5, -0.5, -1.5, -2.5} x 0.067,
//                     arm (four bar) STASIS 0.24, HIGH 0.71, HIGHDROP 0.73, grabbers OPEN 0.75, CLOSED 0.25
//   Teleop.fillMaps   row n -> lift target HEIGHTONE.. = 100, 300, 500 ... 1500 encoder ticks
// The drawing is a schematic, not the robot: hexagons are pixels (rows of 6 and 7), the bar is the
// deposit with its two grabbers, the line under it the sideways rail with its stops, drawn in the
// code's order (A on the left). One stop (0.067 of servo travel) is drawn as one pixel width, which
// is how the two stop sets line up with the rows. The sequence follows the touchpad teleop:
// lift and slide, drop, open the left grabber, back up, next row, open the right grabber, stasis.
import { clamp, smooth, lerp, css, h, s, svgRoot, setter, hexPoints, PIXEL, freeLeft } from './kit.js';

const CENTER = 0.74, INC = 0.067;
const LOWER = ['A', 'B', 'C', 'D', 'E'].map((n, i) => ({ n, x: i - 2, v: CENTER - (i - 2) * INC }));
const UPPER = ['A', 'B', 'C', 'D', 'E', 'F'].map((n, i) => ({ n, x: i - 2.5, v: CENTER - (i - 2.5) * INC }));
const ROWS = 8;
const ROW0 = 1.4, PITCH = Math.sqrt(3) / 2;
const rowV = (r) => ROW0 + (r - 1) * PITCH; // row centre height, pixel widths above the parked deposit
const cells = (r) => (r % 2 ? [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5] : [-3, -2, -1, 0, 1, 2, 3]);
const ticksToV = (t) => (t <= 100 ? (t / 100) * ROW0 : rowV(1 + (t - 100) / 200));
const ARM = { STASIS: 0.24, HIGH: 0.71, HIGHDROP: 0.73 };

// the example: left pixel to row 3 over lower stop C, right pixel to row 4 over upper stop D
const L_ROW = 3, L_X = -0.5, R_ROW = 4, R_X = 1;

/** The whole picture as a function of (step, stepP). */
function state(step, sp, reduced) {
  const k = (a, b) => (reduced ? 1 : smooth(a, b, sp));
  const st = { ticks: 0, target: 0, xd: 0, stop: LOWER[2], arm: 'STASIS', openL: false, openR: false, placedL: 0, placedR: 0, pulse: 0 };
  if (step === 0) { st.pulse = 1; return st; }
  if (step === 1) {
    st.target = 500; st.ticks = lerp(0, 500, k(0.12, 0.8)); st.arm = sp > 0.08 || reduced ? 'HIGH' : 'STASIS';
    return st;
  }
  st.ticks = 500; st.target = 500; st.arm = 'HIGH';
  if (step === 2) {
    st.arm = reduced || (sp > 0.12 && sp < 0.82) ? 'HIGHDROP' : 'HIGH';
    st.openL = reduced ? true : sp > 0.38 && sp < 0.88;
    st.placedL = k(0.4, 0.66);
    return st;
  }
  st.placedL = 1;
  if (step === 3) {
    st.target = 700; st.ticks = lerp(500, 700, k(0.06, 0.45)); st.xd = lerp(0, 0.5, k(0.1, 0.5));
    st.stop = UPPER[3]; st.arm = 'HIGH'; // the touchpad teleop drops the second pixel at HIGH
    st.openR = reduced ? true : sp > 0.6;
    st.placedR = k(0.62, 0.86);
    return st;
  }
  // step 4: back to stasis
  st.placedR = 1; st.target = 0; st.arm = 'STASIS';
  st.ticks = lerp(700, 0, k(0.12, 0.72)); st.xd = lerp(0.5, 0, k(0.1, 0.5));
  st.stop = LOWER[2];
  return st;
}

const CSS = `
.fc-ix { position: absolute; inset: 0; }
.fc-ix svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; font-family: var(--font); }
.fc-ix-strip { position: absolute; z-index: 3; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; border-radius: 14px; background: rgba(10,8,7,0.82); border: 1px solid rgba(255,255,255,0.12); overflow: hidden; }
.fc-ix-strip > div { padding: 9px 12px 10px; border-left: 1px solid rgba(255,255,255,0.08); min-width: 0; }
.fc-ix-strip > div:first-child { border-left: 0; }
.fc-ix-strip span { display: block; font-size: 10.5px; font-weight: 650; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
.fc-ix-strip b { display: block; margin-top: 3px; font-size: 15px; font-weight: 650; color: var(--text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fc-ix-strip small { display: block; font-size: 11.5px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-ix-strip .hot b { color: var(--accent); }
@media (max-width: 640px) {
  .fc-ix-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fc-ix-strip > div { padding: 5px 9px 6px; }
  .fc-ix-strip > div:nth-child(3) { border-left: 0; }
  .fc-ix-strip > div:nth-child(n+3) { border-top: 1px solid rgba(255,255,255,0.08); }
  .fc-ix-strip span { font-size: 9.5px; }
  .fc-ix-strip b { font-size: 13px; margin-top: 1px; }
  .fc-ix-strip small { display: none; }
}
`;

export function mount(el, ctx) {
  css('fc-ix-css', CSS);
  const reduced = ctx.reducedMotion;
  const S = setter();
  const root = h('div', 'fc-ix');
  const svg = svgRoot();
  svg.setAttribute('role', 'img');
  root.append(svg);
  const strip = h('div', 'fc-ix-strip');
  strip.innerHTML = `
    <div data-c="lift"><span>Lift target</span><b data-k="lift"></b><small data-k="liftS"></small></div>
    <div data-c="slide"><span>Sideways servo</span><b data-k="slide"></b><small data-k="slideS"></small></div>
    <div data-c="arm"><span>Arm servo</span><b data-k="arm"></b><small data-k="armS"></small></div>
    <div data-c="grab"><span>Grabbers</span><b data-k="grab"></b><small data-k="grabS"></small></div>`;
  root.append(strip);
  el.append(root);
  const K = Object.fromEntries([...strip.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const C = Object.fromEntries([...strip.querySelectorAll('[data-c]')].map((n) => [n.dataset.c, n]));

  let G = null, built = '';
  function build() {
    const W = el.clientWidth, H = el.clientHeight;
    const key = `${W}x${H}|${ctx.shift()[0]}`;
    if (!W || !H || key === built) return;
    built = key;
    svg.textContent = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const narrow = W < 640;
    const x0 = freeLeft(el, ctx) + (narrow ? 8 : 24), x1 = W - (narrow ? 8 : 28);
    const stripH = Math.max(strip.offsetHeight, narrow ? 60 : 80);
    Object.assign(strip.style, { left: `${x0}px`, width: `${x1 - x0}px`, bottom: `${narrow ? 8 : 24}px` });
    const top = narrow ? 10 : 30, bottom = H - stripH - (narrow ? 14 : 40);
    // drawing extent in pixel widths: x -6.3 .. 6.3 (row labels and tick values), v -2.1 .. 8.6
    const k = Math.min((x1 - x0) / 12.6, (bottom - top) / 10.8);
    const cx = (x0 + x1) / 2, by = bottom - 2.1 * k;
    const X = (u) => cx + u * k, Y = (v) => by - v * k;
    const fs = Math.max(10, Math.min(13, k * 0.24));
    // text with a dark halo, so letters stay readable where they cross the grid
    const t = (parent, str, x, y, attrs = {}) => { const e = s(parent, 'text', { x, y, 'font-size': fs, fill: '#8c847b', stroke: '#15120f', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round', ...attrs }); e.textContent = str; return e; };

    // backdrop
    const bd = s(svg, 'g');
    s(bd, 'rect', { x: X(-3.9), y: Y(rowV(ROWS) + 0.85), width: 7.8 * k, height: (rowV(ROWS) - ROW0 + 1.6) * k, rx: 0.35 * k, fill: '#1b1917', stroke: 'rgba(237,232,226,0.16)' });
    t(bd, 'Backdrop (schematic)', X(-3.9), Y(rowV(ROWS) + 0.85) - 8, { fill: '#b8b0a7', 'font-weight': 600 });
    const cellEl = {};
    for (let r = 1; r <= ROWS; r++) {
      for (const x of cells(r)) {
        cellEl[`${r}:${x}`] = s(bd, 'polygon', { points: hexPoints(X(x), Y(rowV(r)), k * 0.92), fill: 'none', stroke: 'rgba(237,232,226,0.2)', 'stroke-width': 1.2 });
      }
      t(bd, `row ${r}`, X(-4.95), Y(rowV(r)) + fs * 0.35, { 'text-anchor': 'end' });
      t(bd, String(100 + 200 * (r - 1)), X(4.95), Y(rowV(r)) + fs * 0.35);
    }
    t(bd, 'lift ticks', X(4.95), Y(rowV(ROWS) + 0.85) - 8, { 'font-weight': 600 });
    // targets
    const tgt = [[L_ROW, L_X], [R_ROW, R_X]].map(([r, x]) => s(svg, 'polygon', { points: hexPoints(X(x), Y(rowV(r)), k * 0.92), fill: 'none', stroke: '#ff6b35', 'stroke-width': 2.2, 'stroke-dasharray': '5 4' }));
    // placed pixels
    const placed = [[L_ROW, L_X, PIXEL.yellow], [R_ROW, R_X, PIXEL.purple]].map(([r, x, c]) => s(svg, 'polygon', { points: hexPoints(0, 0, k * 0.86), fill: c, opacity: 0, 'data-x': X(x), 'data-y': Y(rowV(r)) }));
    // lift and rail and deposit, moved as one group by the lift; the deposit slides inside it
    const lift = s(svg, 'g');
    const slides = [-4.55, 4.55].map((x) => s(svg, 'line', { x1: X(x), x2: X(x), y1: Y(-2.0), y2: Y(-2.0), stroke: 'rgba(237,232,226,0.35)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    t(svg, 'lift', X(-4.75), Y(-1.8), { 'text-anchor': 'end' });
    svg.insertBefore(slides[0], lift); svg.insertBefore(slides[1], lift);
    // the rail under the deposit: the five lower stops tick down, the six upper stops tick up
    const railV = -1.18;
    s(lift, 'line', { x1: X(-4.55), x2: X(4.55), y1: Y(railV), y2: Y(railV), stroke: 'rgba(237,232,226,0.55)', 'stroke-width': 2.5 });
    const stopEls = [];
    for (const [set, up] of [[LOWER, false], [UPPER, true]]) {
      for (const st of set) {
        const tick = s(lift, 'line', { x1: X(st.x), x2: X(st.x), y1: Y(railV), y2: Y(railV + (up ? 0.16 : -0.16)), stroke: 'rgba(237,232,226,0.5)', 'stroke-width': 1.5 });
        const lab = t(lift, st.n, X(st.x), up ? Y(railV + 0.16) - 3 : Y(railV - 0.16) + fs, { 'text-anchor': 'middle', 'font-size': fs - 1 });
        stopEls.push({ st, tick, lab });
      }
    }
    t(lift, 'upper stops', X(2.95), Y(railV + 0.16) - 3, { 'font-size': fs - 1.5 });
    t(lift, 'lower stops', X(2.95), Y(railV - 0.16) + fs, { 'font-size': fs - 1.5 });
    // the deposit: a bar with two grabbers, each holding a pixel
    const dep = s(lift, 'g');
    s(dep, 'rect', { x: -1.18 * k, y: -0.66 * k, width: 2.36 * k, height: 1.32 * k, rx: 0.2 * k, fill: 'rgba(61,139,255,0.16)', stroke: '#3d8bff', 'stroke-width': 2 });
    const held = [[-0.5, PIXEL.yellow], [0.5, PIXEL.purple]].map(([x, c]) => s(dep, 'polygon', { points: hexPoints(x * k, 0, k * 0.8), fill: c }));
    const grab = [-0.5, 0.5].map((x) => s(dep, 'polygon', { points: hexPoints(x * k, 0, k * 0.98), fill: 'none', stroke: '#3d8bff', 'stroke-width': 2 }));
    const gl = [t(dep, 'L', -0.5 * k, -0.66 * k - 6, { 'text-anchor': 'middle', fill: '#9cc2ff', 'font-weight': 700 }), t(dep, 'R', 0.5 * k, -0.66 * k - 6, { 'text-anchor': 'middle', fill: '#9cc2ff', 'font-weight': 700 })];
    G = { X, Y, k, lift, dep, held, grab, gl, placed, tgt, slides, stopEls, railV };
  }

  function draw(step, sp) {
    build();
    if (!G) return;
    const st = state(step, sp, reduced);
    const vd = ticksToV(st.ticks);
    S.attr(G.lift, 'transform', `translate(0 ${(-(vd) * G.k).toFixed(2)})`);
    S.attr(G.dep, 'transform', `translate(${G.X(st.xd).toFixed(2)} ${G.Y(0).toFixed(2)})`);
    for (const sl of G.slides) S.attr(sl, 'y2', G.Y(vd + G.railV).toFixed(2));
    // grabbers: open ones go dashed; a released pixel drops out of the deposit into its cell
    [st.openL, st.openR].forEach((open, i) => {
      S.attr(G.grab[i], 'stroke-dasharray', open ? '4 4' : 'none');
      S.attr(G.grab[i], 'stroke', open ? '#ff6b35' : '#3d8bff');
    });
    [st.placedL, st.placedR].forEach((pl, i) => {
      S.attr(G.held[i], 'opacity', (1 - pl).toFixed(3));
      const p = G.placed[i];
      const px = +p.getAttribute('data-x'), py = +p.getAttribute('data-y');
      S.attr(p, 'transform', `translate(${px.toFixed(2)} ${(py - (1 - pl) * 0.18 * G.k).toFixed(2)})`);
      S.attr(p, 'opacity', pl.toFixed(3));
    });
    G.tgt.forEach((tg, i) => S.attr(tg, 'opacity', ([st.placedL, st.placedR][i] >= 1 ? 0 : 1).toFixed(2)));
    // the commanded stop lights up
    for (const e of G.stopEls) {
      const on = e.st === st.stop && step > 0;
      S.attr(e.tick, 'stroke', on ? '#ff6b35' : 'rgba(237,232,226,0.45)');
      S.attr(e.tick, 'stroke-width', on ? '3' : '1.5');
      S.attr(e.lab, 'fill', on ? '#ff6b35' : '#8c847b');
      S.attr(e.lab, 'font-weight', on ? '700' : '400');
    }
    // readouts: the commanded values
    const row = st.target ? (st.target - 100) / 200 + 1 : 0;
    S.text(K.lift, `${st.target} ticks`);
    S.text(K.liftS, st.target ? `row ${row}` : 'down on its limit switch');
    const lower = LOWER.includes(st.stop);
    S.text(K.slide, st.stop.v.toFixed(lower ? 3 : 4));
    S.text(K.slideS, `${lower ? 'lower' : 'upper'} stop ${st.stop.n}`);
    S.text(K.arm, ARM[st.arm].toFixed(2));
    S.text(K.armS, st.arm);
    S.text(K.grab, `L ${st.openL ? 'open' : 'closed'}, R ${st.openR ? 'open' : 'closed'}`);
    S.text(K.grabS, `open 0.75, closed 0.25`);
    S.cls(C.lift, 'hot', step === 1 || step === 3 || step === 4);
    S.cls(C.slide, 'hot', step === 3 || step === 4);
    S.cls(C.arm, 'hot', step === 1 || step === 2 || step === 4);
    S.cls(C.grab, 'hot', step === 2 || step === 3);
    svg.setAttribute('aria-label', `Backdrop schematic. Lift target ${st.target} ticks, sideways servo ${st.stop.v.toFixed(4)} (stop ${st.stop.n}), arm ${st.arm}.`);
  }

  let last = [0, 0];
  function setProgress(p, step, stepP) { last = [clamp(step | 0, 0, 4), clamp(stepP, 0, 1)]; draw(...last); }
  const ro = new ResizeObserver(() => { built = ''; draw(...last); });
  ro.observe(el);
  draw(0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}

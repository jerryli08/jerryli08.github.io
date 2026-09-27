// The main animation: a word is embossed dot by dot as the reader scrolls. Scroll-driven only:
// every picture is a pure function of (step, progress through it), so scrolling back plays it
// backwards and nothing moves on its own.
//
// Real (my team's CAD, see rig.js): the gantry, both drives, the servo arm and pin swinging about
// the servo shaft on their real arc, the die grid the dots land on, and the 4 mm the arc moves the
// pin sideways (so the pin parks that far to the side of each dot before it swings).
// The animation's own: the word, the path (three passes per line, one per row of dots, so the
// heavy Y axis moves as little as possible), the speeds, and the drawn page, dents and bumps. It
// writes each line mirror image, because the dots stand up on the far side of the page from the
// pin; how the team's code handled that is not on the page.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadPrinter, makePage, views, G, ARC, cellX, lineZ, parkFor, noseAt, clamp, smooth, lerp } from './rig.js';
import { toBraille, dotPos } from './braille.js';

const WORD = 'PennApps';
const LINE = 0; // the page's first line
const FIRST = 23; // die cell of the first cell as read: the last of the 27 the pin reaches in the CAD
const VX = 0.1, VY = 0.06, MINMOVE = 0.1, DOWN = 0.14, UP = 0.12; // the animation's pace (s, m/s)
const SLIDE = 0.45, LIFT = 0.12; // the page comes out the front, then turns over clear of the machine
const ACCENT = '#ff6b35';

// ------------------------------------------------------------------ what gets embossed, and in what order
const CELLS = toBraille(WORD);
const DOTS = [];
CELLS.forEach((cell, c) => cell.dots.forEach((d) => {
  const { col, row } = dotPos(d);
  // mirror image: the cell's left column (dots 1 to 3) goes on the +X side of the die cell
  DOTS.push({ c, d, row, x: cellX(FIRST - c, col === 0 ? 1 : 0), z: lineZ(LINE, row) });
}));
// three passes, one per row of dots, alternating direction
const ORDER = [0, 1, 2].flatMap((r) => DOTS.filter((t) => t.row === r).sort((a, b) => (r % 2 ? a.x - b.x : b.x - a.x)));
ORDER.forEach((t, i) => { t.i = i; });
const BY = CELLS.map((_, c) => Object.fromEntries(DOTS.filter((t) => t.c === c).map((t) => [t.d, t])));

// the timeline: move to the dot's park position, swing down, swing up
const ease = (t) => t * t * (3 - 2 * t);
const SEG = [];
let T = 0, at = { x: 0, y: 0 };
const moveTo = (to) => {
  const d = Math.max(MINMOVE, Math.abs(to.x - at.x) / VX, Math.abs(to.y - at.y) / VY);
  SEG.push({ kind: 'move', t0: T, t1: T + d, from: at, to }); T += d; at = to;
};
const STEP_T = []; // [t0, t1] for each emboss step: line up, row 1, row 2, row 3
moveTo(parkFor(ORDER[0].x, ORDER[0].z));
STEP_T.push([0, T]);
for (let r = 0; r < 3; r++) {
  const t0 = T;
  for (const dot of ORDER.filter((t) => t.row === r)) {
    const pk = parkFor(dot.x, dot.z);
    if (Math.abs(pk.x - at.x) > 1e-6 || Math.abs(pk.y - at.y) > 1e-6) moveTo(pk);
    SEG.push({ kind: 'down', t0: T, t1: T + DOWN, dot: dot.i }); T += DOWN;
    SEG.push({ kind: 'up', t0: T, t1: T + UP, dot: dot.i }); T += UP;
  }
  STEP_T.push([t0, T]);
}
function poseAt(t) {
  let x = 0, y = 0, a = 0, done = 0, k = 0;
  for (const s of SEG) {
    if (t < s.t0) break;
    const f = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
    if (s.kind === 'move') { x = lerp(s.from.x, s.to.x, ease(f)); y = lerp(s.from.y, s.to.y, ease(f)); a = 0; }
    else if (s.kind === 'down') { a = ARC.bottom * ease(f); done = s.dot; k = clamp((a - ARC.touch) / (ARC.bottom - ARC.touch), 0, 1); if (f >= 1) { done = s.dot + 1; k = 0; } }
    else { a = ARC.bottom * (1 - ease(f)); done = s.dot + 1; k = 0; }
  }
  return { x, y, a, done, k };
}
const END = poseAt(T + 1);
// the close view follows the pin along the line, on a smoothed track (a moving average over 2.4 s
// of the carriage's X, from the first dot on), so it glides instead of stepping with every dot
const T0 = STEP_T[0][1], NS = 600, track = new Float64Array(NS + 1);
{
  const xs = new Float64Array(NS + 1);
  for (let i = 0; i <= NS; i++) xs[i] = poseAt(T0 + ((T - T0) * i) / NS).x;
  const w = Math.round((1.2 / (T - T0)) * NS);
  for (let i = 0; i <= NS; i++) { let s = 0, n = 0; for (let j = Math.max(0, i - w); j <= Math.min(NS, i + w); j++) { s += xs[j]; n++; } track[i] = s / n; }
  const t0v = track[0]; for (let i = 0; i <= NS; i++) track[i] -= t0v;
}
const follow = (t) => { const u = clamp((t - T0) / (T - T0), 0, 1) * NS, i = Math.min(NS - 1, Math.floor(u)); return lerp(track[i], track[i + 1], u - i); };

// ------------------------------------------------------------------ the readout
const CSS = `
.bp-hud { width: 318px; }
.bp-hud .bp-lab { font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted, #9a948c); }
.bp-hud .bp-typed { font-size: 24px; line-height: 1.15; font-weight: 650; color: var(--text, #f3efe9); letter-spacing: .02em; min-height: 28px; margin: 2px 0 8px; }
.bp-hud .bp-typed u { text-decoration: none; opacity: .35; }
.bp-hud .bp-caret { display: inline-block; width: 2px; height: 22px; margin-left: 2px; vertical-align: -3px; background: ${ACCENT}; }
.bp-hud .bp-row { display: flex; width: max-content; gap: 7px; margin: 4px 0 2px; transform-origin: 50% 50%; }
.bp-hud .bp-cell { display: grid; grid-template-columns: 7px 7px; grid-template-rows: 7px 7px 7px; gap: 3px; padding: 3px; border-radius: 4px; }
.bp-hud .bp-cell.is-now { background: rgba(255,107,53,.18); }
.bp-hud .bp-cell i { display: block; width: 7px; height: 7px; border-radius: 50%; }
.bp-hud .bp-cell i.p { box-shadow: inset 0 0 0 1.4px rgba(243,239,233,.55); }
.bp-hud .bp-cell i.d { background: #f3efe9; }
.bp-hud .bp-cell i.n { background: ${ACCENT}; }
.bp-hud .bp-cell i.o { background: rgba(255,255,255,.07); }
.bp-hud .bp-cell.off i.p, .bp-hud .bp-cell.off i.o { box-shadow: none; background: rgba(255,255,255,.04); }
.bp-hud .bp-chars { display: flex; gap: 7px; margin-top: 1px; }
.bp-hud .bp-chars span { width: 23px; text-align: center; font-size: 10.5px; color: var(--muted, #9a948c); }
.bp-hud .bp-mir { overflow: hidden; }
.bp-hud .bp-sub { margin-top: 8px; }
.bp-hud .bp-nums { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; margin-top: 9px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.1); }
.bp-hud .bp-nums div { display: flex; justify-content: space-between; gap: 8px; }
.bp-hud .bp-nums b { color: var(--text, #f3efe9); font-weight: 650; }
.bp-letters { position: absolute; inset: 0; pointer-events: none; }
.bp-letters span { position: absolute; left: 0; top: 0; transform: translate(-50%, 0); font: 650 15px/1 var(--font, system-ui, sans-serif); color: #1a1715; background: rgba(242,238,230,.92); padding: 3px 6px; border-radius: 6px; white-space: nowrap; opacity: 0; }
.bp-letters span.cap { font-size: 11px; font-weight: 600; color: #6b645c; }
@media (max-width: 640px) {
  .bp-hud { width: auto; }
  .bp-hud .bp-lab, .bp-hud .bp-chars { display: none; }
  .bp-hud .bp-row { margin: 3px 0 0; }
  .bp-hud .bp-typed { font-size: 18px; min-height: 21px; margin: 0 0 4px; }
  .bp-hud .bp-caret { height: 17px; }
  .bp-hud .bp-row, .bp-hud .bp-chars { gap: 4px; }
  .bp-hud .bp-cell { grid-template-columns: 5px 5px; grid-template-rows: 5px 5px 5px; gap: 2px; padding: 2px; }
  .bp-hud .bp-cell i { width: 5px; height: 5px; }
  .bp-hud .bp-chars span { width: 16px; font-size: 9.5px; }
  .bp-hud .bp-nums { grid-template-columns: 1fr 1fr; margin-top: 5px; padding-top: 5px; }
  .bp-hud .bp-sub { margin-top: 4px; }
  .bp-letters span { font-size: 12px; padding: 2px 4px; }
}`;

function buildHud(layer) {
  if (!document.getElementById('bp-emboss-css')) {
    const st = document.createElement('style'); st.id = 'bp-emboss-css'; st.textContent = CSS; document.head.append(st);
  }
  const hud = document.createElement('div');
  hud.className = 'rx-hud bp-hud';
  const cellHtml = (c) => `<span class="bp-cell">${[1, 4, 2, 5, 3, 6].map((d) => `<i data-d="${d}" class="${c.dots.includes(d) ? 'p' : 'o'}"></i>`).join('')}</span>`;
  hud.innerHTML = `
    <div class="bp-lab">Text</div>
    <div class="bp-typed" data-k="typed"></div>
    <div class="bp-lab">Braille, as read</div>
    <div class="bp-row" data-k="read">${CELLS.map(cellHtml).join('')}</div>
    <div class="bp-chars">${CELLS.map((c) => `<span>${c.ch || 'cap'}</span>`).join('')}</div>
    <div class="bp-mir" data-k="mirBox">
      <div class="bp-lab bp-sub">Embossed from the back: mirrored</div>
      <div class="bp-row" data-k="mir">${CELLS.map(cellHtml).join('')}</div>
    </div>
    <div class="bp-nums" data-k="nums">
      <div><span>Dot</span><b class="num" data-k="dot"></b></div>
      <div><span>Servo</span><b class="num" data-k="ang"></b></div>
      <div class="rx-hud-x"><span>X travel</span><b class="num" data-k="x"></b></div>
      <div class="rx-hud-x"><span>Y travel</span><b class="num" data-k="y"></b></div>
      <div class="rx-hud-x" style="grid-column: 1 / -1"><span>Pin tip</span><b class="num" data-k="tip"></b></div>
    </div>
`;
  layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const cellsOf = (row) => [...row.querySelectorAll('.bp-cell')];
  return { hud, K, read: cellsOf(K.read), mir: cellsOf(K.mir) };
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const P = await loadPrinter(stage, { floss: true });
  const page = makePage(stage, P.model, { max: DOTS.length, accent: ACCENT });
  const reduced = ctx.reducedMotion;

  // views, framed once from fixed boxes (the die, the line being written), never from moving parts
  const x0 = cellX(FIRST - CELLS.length + 1, 0) - 0.012, x1 = cellX(FIRST, 1) + 0.006;
  const z0 = lineZ(LINE, 0), zr = z0 - SLIDE;
  const rx0 = 2 * page.cx - x1, rx1 = 2 * page.cx - x0, ry = G.dieY + LIFT;
  const V = views(stage, el, {
    over: { box: [[-0.40, 0.304, -0.60], [0.03, 0.39, -0.02]], azimuth: 206, elevation: 30, pad: 1.02 },
    mid: { box: [[-0.205, G.dieY, -0.452], [-0.07, 0.345, -0.405]], azimuth: 188, elevation: 40, pad: 1.05 },
    close: { box: [[ORDER[0].x - 0.05, G.dieY - 0.001, z0 - 0.006], [ORDER[0].x + 0.03, G.dieY + 0.016, z0 + 0.008]], azimuth: 180, elevation: 38, pad: 1.0 },
    // a narrow stage (phones): a tighter view that still follows the pin along the line
    closeN: { box: [[ORDER[0].x - 0.024, G.dieY - 0.001, z0 - 0.004], [ORDER[0].x + 0.012, G.dieY + 0.012, z0 + 0.006]], azimuth: 180, elevation: 38, pad: 1.0 },
    read: { box: [[rx0, ry - 0.001, zr - 0.012], [rx1, ry + 0.002, zr + 0.016]], azimuth: 0, elevation: 80, pad: 1.25 },
  });
  const CAM = ['over', 'mid', 'close', 'close', 'close', 'close', 'read'];

  // labels
  const ov = labelLayer(stage);
  const lab = {
    pin: ov.label('Pin, 1.6 mm round nose', [0, 0, 0], { color: '#fff1e2', side: 'l', minW: 520 }),
    arm: ov.label('Arm on the servo shaft', [0, 0, 0], { color: '#fff1e2', minW: 520 }),
    beam: ov.label('X: GT2 belt along the beam', [-0.30, 0.37, -0.33], { color: '#fff1e2', minW: 560 }),
    spool: ov.label('Y: floss on a spool, each side', [-0.308, 0.35, -0.064], { color: '#fff1e2', side: 'l', minW: 560 }),
    targets: ov.label('Where the dots go, mirrored', [0, 0, 0], { color: ACCENT }),
  };
  const lettersBox = document.createElement('div'); lettersBox.className = 'bp-letters';
  ov.layer.append(lettersBox);
  const letters = CELLS.map((c) => { const s = document.createElement('span'); s.textContent = c.ch || 'cap'; if (!c.ch) s.className = 'cap'; lettersBox.append(s); return s; });
  const H = buildHud(ov.layer);

  // DOM writes only when a value changes
  const shown = new Map();
  const put = (node, key, val, fn) => { if (shown.get(key) !== val) { shown.set(key, val); fn(node, val); } };
  const text = (n, v) => { n.textContent = v; };
  const style = (prop) => (n, v) => { n.style[prop] = v; };
  const cls = (n, v) => { n.className = v; };

  const nose = new THREE.Vector3();
  const noseWorld = (pose) => { const n = noseAt(pose.a); return nose.set(n[0] + pose.x, n[1] - G.noseR, G.nose[2] + pose.y); };
  const layout = { w: 0 };

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, CAM.length - 1);
    const phone = el.clientWidth < 640;
    if (layout.w !== el.clientWidth) {
      layout.w = el.clientWidth;
      Object.assign(H.hud.style, phone ? { top: '8px', bottom: 'auto', right: '8px', left: '8px' } : { top: 'auto', bottom: '14px', right: '14px', left: 'auto' });
    }

    // camera: blend in from the previous step's view over the first 45 % of the step
    const k = reduced || step === 0 ? 1 : smooth(0, 0.45, stepP);
    // clear of the step cards (left) and the readout (bottom right); the page view at the end sits lower
    const [fx] = ctx.shift();
    const fyOf = (i) => (phone ? -0.12 : CAM[i] === 'read' ? -0.1 : 0.07);
    stage.setShift(fx > 0 ? 0.2 : 0, lerp(fyOf(Math.max(0, step - 1)), fyOf(step), k));
    const narrow = el.clientWidth < el.clientHeight * 1.1;
    const camOf = (i) => (CAM[i] === 'close' && narrow ? 'closeN' : CAM[i]);
    const prev = camOf(Math.max(0, step - 1)), cur = camOf(step);
    const drift = reduced ? 0 : (step >= 2 && step <= 5 ? ((step - 2 + stepP) / 4 - 0.5) * 0.14 : (stepP - 0.5) * 0.05);

    // the machine
    let pose = { x: 0, y: 0, a: 0, done: 0, k: 0 }, t = 0;
    if (step >= 2 && step <= 5) {
      const [t0, t1] = STEP_T[step - 2];
      const f = step === 2 ? smooth(0.3, 0.95, stepP) : clamp((stepP - 0.04) / 0.9, 0, 1);
      t = lerp(t0, t1, f);
      pose = poseAt(t);
    } else if (step === 6) { pose = END; t = T; }
    P.set(pose);
    const off = (s) => (CAM[s] === 'close' && s > 2 ? [follow(s === step ? t : STEP_T[s - 2][1]), 0, 0] : null);
    V.place(prev, cur, k, drift, off(Math.max(0, step - 1)), off(step));

    // the page: targets appear in step 1, dots as they are embossed, then out, up and over
    const ringA = step === 0 ? 0 : step === 1 ? 0.85 * smooth(0.2, 0.6, stepP) : step === 6 ? 0 : 0.85;
    page.show(ORDER, pose.done, pose.k, ringA);
    const slide = step === 6 ? SLIDE * smooth(0.08, 0.5, stepP) : 0;
    const lift = step === 6 ? LIFT * smooth(0.42, 0.62, stepP) : 0;
    const flip = step === 6 ? smooth(0.58, 0.86, stepP) : 0;
    page.pose(lift, slide, flip);

    // labels
    const nw = noseWorld(pose);
    lab.pin.p.copy(nw).add(new THREE.Vector3(-0.002, 0.004, 0));
    const hub = new THREE.Vector3(G.axis[0] + pose.x - 0.028, G.axis[1] - 0.03, G.nose[2] + pose.y);
    lab.arm.p.copy(hub);
    lab.pin.a = step === 2 ? smooth(0.35, 0.6, stepP) : step === 3 ? 1 - smooth(0.4, 0.6, stepP) : 0;
    lab.arm.a = lab.pin.a;
    lab.beam.a = step === 0 ? smooth(0.1, 0.3, stepP) : 0;
    lab.spool.a = lab.beam.a;
    lab.targets.p.set(cellX(FIRST - 4, 0), G.dieY, lineZ(LINE, 0) - 0.004);
    lab.targets.a = step === 1 ? smooth(0.45, 0.7, stepP) : 0;
    ov.update();

    // letters under the cells once the page is turned over
    const la = step === 6 ? smooth(0.84, 0.95, stepP) : 0;
    const cam = stage.camera; cam.updateMatrixWorld();
    const w = el.clientWidth, h = el.clientHeight, v = new THREE.Vector3();
    CELLS.forEach((c, i) => {
      const s = letters[i];
      put(s, `la${i}`, la.toFixed(2), style('opacity'));
      if (la <= 0.01) return;
      const cxm = cellX(FIRST - i, 0) + 0.00117;
      const [X, Y, Z] = page.after(cxm, lineZ(LINE, 2) + 0.0032, LIFT, SLIDE);
      v.set(X, Y, Z).project(cam);
      const tx = `translate(${(((v.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - v.y) / 2) * h).toFixed(1)}px) translate(-50%, 0)`;
      put(s, `lt${i}`, tx, style('transform'));
    });

    // the readout
    const typedN = step === 0 ? Math.floor(smooth(0.06, 0.62, stepP) * (WORD.length + 0.999)) : WORD.length;
    put(H.K.typed, 'typed', typedN, (n) => { n.innerHTML = `${WORD.slice(0, typedN)}<span class="bp-caret"></span>`; });
    CELLS.forEach((c, i) => {
      const typed = c.of < typedN;
      const now = step >= 2 && step <= 5 && pose.done < ORDER.length && ORDER[pose.done].c === i && (pose.k > 0 || stepP > 0.02);
      for (const [row, cells] of [['r', H.read], ['m', H.mir]]) {
        put(cells[i], `${row}c${i}`, typed ? (now ? 'bp-cell is-now' : 'bp-cell') : 'bp-cell off', cls);
        const dots = cells[i].children;
        for (const dn of dots) {
          const d = +dn.dataset.d;
          if (!c.dots.includes(d)) continue;
          const t = BY[i][d];
          const state = t.i < pose.done ? 'd' : t.i === pose.done && step >= 2 && step <= 5 && pose.done < ORDER.length ? 'n' : 'p';
          put(dn, `${row}${i}.${d}`, state, cls);
        }
      }
    });
    // the mirrored row turns over in step 1 (a scaleX from 1 to -1)
    const m = step === 0 ? 0 : step === 1 ? smooth(0.15, 0.55, stepP) : 1;
    put(H.K.mirBox, 'mirD', step === 0 ? 'none' : '', style('display'));
    put(H.K.mirBox, 'mirA', (step === 0 ? 0 : step === 1 ? smooth(0, 0.2, stepP) : 1).toFixed(2), style('opacity'));
    put(H.K.mir, 'mirS', `scaleX(${(1 - 2 * m).toFixed(3)})`, style('transform'));
    // the readout steps aside once the page is out, so the whole word shows
    put(H.hud, 'hudA', step === 6 ? (1 - smooth(0.5, 0.75, stepP)).toFixed(2) : '1', style('opacity'));
    const emb = step >= 2 && step <= 6;
    put(H.K.nums, 'numsD', emb ? '' : 'none', style('display'));
    const shownDot = Math.min(ORDER.length, pose.done + (pose.k > 0 ? 1 : 0));
    put(H.K.dot, 'dot', `${shownDot} of ${ORDER.length}`, text);
    const deg = (pose.a * 180) / Math.PI;
    put(H.K.ang, 'ang', `+${deg.toFixed(1)}°`, text);
    put(H.K.x, 'x', `${(pose.x * 1000).toFixed(1)} mm`, text);
    put(H.K.y, 'y', `${(pose.y * 1000).toFixed(1)} mm`, text);
    const tipH = (noseAt(pose.a)[1] - G.noseR - G.dieY) * 1000;
    put(H.K.tip, 'tip', tipH >= 0 ? `${tipH.toFixed(1)} mm above the page` : `${(-tipH).toFixed(2)} mm into the dimple`, text);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

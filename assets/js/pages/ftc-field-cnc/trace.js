// "The machine, drawing" (scroll-driven): Jerry's gantry CAD traces the outline of a CENTERSTAGE
// pixel as you scroll. The gantry (Y) and the carriage on it (X) move along their real axes and all
// three ball screws turn about theirs, 5 mm of travel per turn (rig.js). Scrolling back runs the
// path backwards: the picture is a pure function of (step, progress through the step).
//
// What is real and what is an annotation:
//  - the machine, its axes, lead and travel limits are the CAD's
//  - there is no Z axis or spindle in the CAD, so the drawn path follows a point just in front of the
//    X carriage, projected down to the top of the lower frame extrusions (y = 50.8 mm); the orange
//    pointer, the path and the dashed travel box are overlays, not parts
//  - the pixel is scaled up to fill the travel (outer hexagon 352 mm across its corners), not its real size
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadCnc, viewSet, viewSetter, blendView, hud, smooth, clamp, lerp, mm, LEAD, STEPS_PER_TURN, TRAVEL } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#a9cdf2';
const BED = 50.8; // mm: top of the lower field extrusions
const TOOL = { x: 28.0, z: -365.0 }; // mm: the pointer's spot at X = Y = 0 (centre of the X carriage blocks, just in front of them)

// ---------------------------------------------------------------- the path, in machine X, Y (mm)
const C = [208.4, 156.0], R_OUT = 176, R_IN = 74;
const hexPt = (r, i) => [C[0] + r * Math.cos((i * Math.PI) / 3 + Math.PI), C[1] + r * Math.sin((i * Math.PI) / 3 + Math.PI)];
const hexLoop = (r) => Array.from({ length: 7 }, (_, i) => hexPt(r, i));
const inner = hexLoop(R_IN), outer = hexLoop(R_OUT);
// legs: [points, kind]; each step of the scrolly plays some of them
const LEGS = [
  { pts: [[0, 0], [0, C[1]]], kind: 'rapid' },               // step 1: Y alone
  { pts: [[0, C[1]], inner[0]], kind: 'rapid' },             // step 2: X alone
  { pts: inner, kind: 'cut' },                                // step 3: the hole
  { pts: [inner[0], outer[0]], kind: 'rapid' },              // step 4: to the outline...
  { pts: outer, kind: 'cut' },                                // ...and around it
  { pts: [outer[0], [outer[0][0], 0], [0, 0]], kind: 'rapid' }, // step 5: home
];
// flatten to one polyline with cumulative length
const PTS = [], KIND = [], S = [0];
for (const leg of LEGS) {
  for (let i = 0; i < leg.pts.length; i++) {
    if (PTS.length && i === 0) continue; // legs share their end points
    const p = leg.pts[i];
    if (PTS.length) S.push(S[S.length - 1] + Math.hypot(p[0] - PTS[PTS.length - 1][0], p[1] - PTS[PTS.length - 1][1]));
    PTS.push(p); KIND.push(leg.kind);
  }
}
const legEnd = []; { let n = 0; for (const leg of LEGS) { n += leg.pts.length - 1; legEnd.push(S[n]); } }
const L = S[S.length - 1];
function at(s) {
  s = clamp(s, 0, L);
  let i = 1; while (i < S.length - 1 && S[i] < s) i++;
  const t = (s - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]);
  return [lerp(PTS[i - 1][0], PTS[i][0], t), lerp(PTS[i - 1][1], PTS[i][1], t)];
}
// per step: path length at its start and end ([0, 0] = hold at home)
const STEPS = [[0, 0], [0, legEnd[0]], [legEnd[0], legEnd[1]], [legEnd[1], legEnd[2]], [legEnd[2], legEnd[4]], [legEnd[4], legEnd[5]]];

// ---------------------------------------------------------------- ribbons on the bed plane
const toWorld = (X, Y, lift = 0) => new THREE.Vector3(...mm(TOOL.x + X, BED + 0.6 + lift, TOOL.z + Y));
function ribbon(kind, width, dash = 0, gap = 0) {
  // resampled every 1.5 mm; quads only where this kind (and the dash pattern) is on; `upto[i]` = index count up to sample i
  const step = 1.5, n = Math.ceil(L / step) + 1;
  const pos = new Float32Array(n * 2 * 3), idx = [], upto = new Uint32Array(n);
  const w = width / 2;
  let prev = at(0);
  for (let i = 0; i < n; i++) {
    const s = Math.min(L, i * step);
    const p = at(s), q = at(Math.min(L, s + 0.8)), b = at(Math.max(0, s - 0.8));
    let dx = q[0] - b[0], dy = q[1] - b[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const a = toWorld(p[0] - dy * w, p[1] + dx * w), c = toWorld(p[0] + dy * w, p[1] - dx * w);
    pos.set([a.x, a.y, a.z, c.x, c.y, c.z], i * 6);
    if (i > 0) {
      let seg = 1; while (seg < S.length - 1 && S[seg] < s - step / 2) seg++;
      const on = KIND[seg] === kind && (!dash || ((s % (dash + gap)) < dash));
      if (on) { const j = (i - 1) * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    upto[i] = idx.length;
    prev = p;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.setDrawRange(0, 0);
  return { g, upto, step, n };
}

export async function mount(el, ctx) {
  const rig = await loadCnc(el);
  const { stage, model, base, P, setXY } = rig;
  const setView = viewSetter(stage);
  const reduced = ctx.reducedMotion;

  // overlays (annotations, not CAD): the path so far, the pointer, the travel box
  const matCut = new THREE.MeshBasicMaterial({ color: ORANGE, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const matRapid = new THREE.MeshBasicMaterial({ color: BLUE, side: THREE.DoubleSide, depthWrite: false, transparent: true, opacity: 0.9 });
  const cut = ribbon('cut', 5), rapid = ribbon('rapid', 4.5, 10, 6);
  const cutMesh = new THREE.Mesh(cut.g, matCut), rapidMesh = new THREE.Mesh(rapid.g, matRapid);
  // the travel the rails and screws allow, drawn as a thin dashed box
  const box = new THREE.Group();
  {
    const [x0, x1] = TRAVEL.x, [y0, y1] = TRAVEL.y;
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
    const pos = [], idx = [];
    let k = 0;
    for (let e = 0; e < 4; e++) {
      const [a, b] = [corners[e], corners[e + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[0] - a[0]) / len, ny = (b[1] - a[1]) / len;
      for (let s = 0; s < len; s += 16) {
        const e1 = Math.min(len, s + 9);
        const p0 = [a[0] + nx * s, a[1] + ny * s], p1 = [a[0] + nx * e1, a[1] + ny * e1];
        const w = 1;
        for (const [px, py, sx] of [[p0[0], p0[1], 1], [p0[0], p0[1], -1], [p1[0], p1[1], 1], [p1[0], p1[1], -1]]) {
          const v = toWorld(px - ny * w * sx, py + nx * w * sx, -0.3); pos.push(v.x, v.y, v.z);
        }
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); k += 4;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    box.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#d9d2c8', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })));
  }
  // the pointer: from the bottom of the lower X carriage block down to the path, with a dot
  const pointer = new THREE.Group();
  const stemH = (158.8 - BED) / 1000;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, stemH, 10), new THREE.MeshBasicMaterial({ color: ORANGE }));
  stem.position.y = stemH / 2;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 10), new THREE.MeshBasicMaterial({ color: ORANGE }));
  pointer.add(stem, dot);
  const overlays = [cutMesh, rapidMesh, box, pointer];
  for (const o of overlays) { o.traverse((m) => { m.castShadow = false; m.receiveShadow = false; }); base.add(o); }
  const placePointer = (X, Y) => pointer.position.set(...mm(TOOL.x + X, BED + 0.6, TOOL.z + Y));

  // views, framed once with the machine at rest on the fixed frame and the gantry in its CAD pose
  const whole = [P.frame, P.ymotors, P.gantry, P.xmotor];
  const V = viewSet(stage, el, [
    { obj: whole, azimuth: 32, elevation: 44, pad: 1.02 },   // 0 overview
    { obj: whole, azimuth: 70, elevation: 26, pad: 1.16 },   // 1 along the right Y screw
    { obj: whole, azimuth: 10, elevation: 32, pad: 1.16 },   // 2 the X axis, from the front
    { obj: whole, azimuth: 24, elevation: 58, pad: 1.0 },    // 3 from above, for the path
  ]);
  const STEP_VIEW = [0, 1, 2, 3, 3, 0];

  const ov = labelLayer(stage);
  const lab = {
    y: ov.label('Y axis: the whole gantry', P.gantry, { minW: 520 }),
    x: ov.label('X axis: the carriage', P.xblocks, { minW: 520 }),
    ys: ov.label('Right Y ball screw', mm(516.4, 83.4, -120), { minW: 520 }),
    yl: ov.label('Left Y ball screw', mm(-37.1, 83.4, -200), { minW: 520 }),
    xs: ov.label('X ball screw', P.xscrew, { minW: 520 }),
    tool: ov.label('Tool point: no Z axis yet', mm(TOOL.x, BED, TOOL.z), { color: ORANGE, minW: 520 }),
    box: ov.label('Travel: about 417 x 460 mm', mm(TOOL.x + TRAVEL.x[1], BED, TOOL.z + TRAVEL.y[1]), { color: '#d9d2c8', minW: 520 }),
    px: ov.label('CENTERSTAGE pixel, scaled up', mm(TOOL.x + C[0], BED, TOOL.z + C[1] + R_OUT * 0.87), { color: ORANGE, minW: 520 }),
  };
  const H = hud(ov.layer, [['x', 'X (carriage)'], ['y', 'Y (gantry)'], ['xs', 'X screw', true], ['ys', 'Y screws, together', true], ['path', 'Path drawn', true]],
    `${LEAD} mm per screw turn, ${(LEAD / STEPS_PER_TURN).toFixed(3)} mm per full motor step (computed from the part numbers)`);
  const f1 = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

  let lastS = -1;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy);
    // path position: each step plays its legs over most of its scroll (the last one finishes sooner)
    const [s0, s1] = STEPS[step];
    const k = reduced ? 1 : smooth(0.06, step === STEPS.length - 1 ? 0.55 : 0.8, stepP);
    const s = lerp(s0, s1, k);
    const [X, Y] = at(s);
    setXY(X, Y);
    placePointer(X, Y);
    if (s !== lastS) {
      lastS = s;
      const i = clamp(Math.floor(s / cut.step), 0, cut.n - 1);
      const f = (s - i * cut.step) / cut.step;
      cut.g.setDrawRange(0, f > 0.5 ? cut.upto[Math.min(cut.n - 1, i + 1)] : cut.upto[i]);
      rapid.g.setDrawRange(0, f > 0.5 ? rapid.upto[Math.min(rapid.n - 1, i + 1)] : rapid.upto[i]);
      stage.invalidate();
    }
    // camera: blend from the previous step's view over the first 45 % of the step, then hold
    const views = V(`${sx}`);
    const a = views[STEP_VIEW[Math.max(0, step - 1)]], b = views[STEP_VIEW[step]];
    setView(blendView(a, b, reduced || step === 0 ? 1 : smooth(0, 0.45, stepP)));
    // labels for what the step is about
    const on = (want) => (want ? 1 : 0);
    lab.y.a = on(step === 0 || step === 1);
    lab.x.a = on(step === 0 || step === 2);
    lab.ys.a = on(step === 1);
    lab.yl.a = on(step === 1);
    lab.xs.a = on(step === 2);
    lab.tool.a = on(step === 0);
    lab.box.a = on(step === 0);
    lab.px.a = on(step >= 3);
    H.put('x', `${f1(X)} mm`);
    H.put('y', `${f1(Y)} mm`);
    H.put('xs', `${f1(X / LEAD)} turns`);
    H.put('ys', `${f1(Y / LEAD)} turns`);
    H.put('path', `${Math.round(s)} mm`);
    H.put('mini', `X ${f1(X)} mm, Y ${f1(Y)} mm`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose?.(); for (const o of overlays) o.traverse((m) => { m.geometry?.dispose(); m.material?.dispose(); }); stage.dispose(); },
  };
}

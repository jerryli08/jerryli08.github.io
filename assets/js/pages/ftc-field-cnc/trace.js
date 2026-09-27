// "The machine, cutting a real part" (scroll-driven): Jerry's gantry CAD runs a toolpath for the shorter
// side plate of his e-bike (the drive-side plate), at its real size, from the plate's exact profile in
// his e-bike CAD (ebike-drive-plate.json; path order in platepath.js). The gantry (Y) and the carriage
// on it (X) move along their real axes and all three ball screws turn about theirs, 5 mm of travel per
// turn (rig.js). The picture is a pure function of (step, progress through the step): scrolling back
// runs the path backwards.
//
// What is real and what is an overlay:
//  - the machine, its axes, lead and travel limits are the CNC CAD's; the plate's outline, holes and
//    thickness (3.175 mm) are the e-bike CAD's, unscaled
//  - there is no Z axis, spindle or bed in the CAD, so the tool point is a pointer just in front of the X
//    carriage, and the stock sheet lies at the top of the lower frame extrusions (y = 50.8 mm); the
//    stock, the pointer, the cut line, the rapid moves and the travel box are overlays, not parts
//  - the path runs on the plate's own edges (no cutter is chosen, so no cutter offset); the three CAD
//    slivers under 1.5 mm around are left out of the path and of the cut-out part
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadCnc, viewSet, viewSetter, blendView, hud, smooth, clamp, lerp, mm, LEAD, STEPS_PER_TURN, TRAVEL } from './rig.js';
import { buildPath } from './platepath.js';

const ORANGE = '#ff6b35', BLUE = '#8fc3f5';
const BED = 50.8; // mm: top of the lower field extrusions
const TOOL = { x: 28.0, z: -365.0 }; // mm: the pointer's spot at X = Y = 0 (centre of the X carriage blocks, just in front of them)
const MARGIN = 12; // mm of stock drawn around the plate (overlay)

export async function mount(el, ctx) {
  const [rig, plate] = await Promise.all([
    loadCnc(el),
    fetch(ctx.asset('/assets/models/ftc-field-cnc/ebike-drive-plate.json')).then((r) => r.json()),
  ]);
  const { stage, base, P, setXY } = rig;
  const setView = viewSetter(stage);
  const reduced = ctx.reducedMotion;
  const TH = plate.thickness, TOP = BED + TH;

  // ---------------------------------------------------------------- the path
  const path = buildPath(plate);
  const { P: PT, K, F, S, T, marks, stats } = path;
  const L = S[S.length - 1];
  const CUT = [0]; // cut length up to each point
  for (let i = 1; i < PT.length; i++) CUT.push(CUT[i - 1] + (K[i - 1] === 'cut' ? S[i] - S[i - 1] : 0));
  const seg = (arr, v) => { let lo = 1, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; };
  function atS(s) {
    s = clamp(s, 0, L);
    const i = seg(S, s), t = (s - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]);
    return { i, X: lerp(PT[i - 1][0], PT[i][0], t), Y: lerp(PT[i - 1][1], PT[i][1], t), cut: CUT[i - 1] + (K[i - 1] === 'cut' ? S[i] - S[i - 1] : 0) * t };
  }
  const sOfT = (t) => { t = clamp(t, 0, T[T.length - 1]); const i = seg(T, t); return S[i - 1] + ((t - T[i - 1]) / Math.max(1e-9, T[i] - T[i - 1])) * (S[i] - S[i - 1]); };
  // per step: scroll time at its start and end
  const STEPS = [[0, 0], [0, T[marks.yOnly]], [T[marks.yOnly], T[marks.xOnly]], [T[marks.xOnly], T[marks.holes]],
    [T[marks.holes], T[marks.pockets]], [T[marks.pockets], T[marks.outline]], [T[marks.outline], T[marks.home]]];
  // what the readout calls each cut feature: round holes by number, the slot by name, the lattice pockets by number
  const nHoles = stats.holes, nLattice = stats.pockets - stats.slots;
  const featName = [''];
  { let h = 0, q = 0; for (const f of path.order.slice(1)) featName.push(f.outer ? 'Outline' : f.round ? `Round hole ${++h} of ${nHoles}` : f.slot ? 'The slot' : `Pocket ${++q} of ${nLattice}`); }

  // ---------------------------------------------------------------- overlays
  const W = (X, Y, h) => new THREE.Vector3(...mm(TOOL.x + X, h, TOOL.z + Y));
  // ribbons along the path on the stock: `upto[i]` = index count up to sample i
  function ribbon(kind, width, lift, dash = 0, gap = 0) {
    const step = 0.5, n = Math.ceil(L / step) + 1, w = width / 2;
    const pos = new Float32Array(n * 6), idx = [], upto = new Uint32Array(n);
    let j = 1;
    for (let i = 0; i < n; i++) {
      const s = Math.min(L, i * step);
      const p = atS(s), q = atS(Math.min(L, s + 0.4)), b = atS(Math.max(0, s - 0.4));
      let dx = q.X - b.X, dy = q.Y - b.Y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const a = W(p.X - dy * w, p.Y + dx * w, TOP + lift), c = W(p.X + dy * w, p.Y - dx * w, TOP + lift);
      pos.set([a.x, a.y, a.z, c.x, c.y, c.z], i * 6);
      if (i > 0) {
        const sm = s - step / 2;
        while (j < S.length - 1 && S[j] < sm) j++;
        const on = K[j - 1] === kind && (!dash || (sm % (dash + gap)) < dash);
        if (on) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      upto[i] = idx.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    return { g, upto, step, n };
  }
  const kerf = ribbon('cut', 1.6, 0.25), rapid = ribbon('rapid', 1.3, 1.2, 5, 4);
  const kerfMesh = new THREE.Mesh(kerf.g, new THREE.MeshBasicMaterial({ color: '#15110d', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  const rapidMesh = new THREE.Mesh(rapid.g, new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  kerfMesh.renderOrder = 3; rapidMesh.renderOrder = 4;

  // the stock sheet, the plate in it and the slugs of its holes: one sheet until the plate is lifted out.
  // Shapes are in (X, -Y); rotateX(-90 deg) takes (X, -Y, e) to (X, e, Y).
  const shapePts = (pts) => pts.slice(0, -1).map(([X, Y]) => new THREE.Vector2(X, -Y));
  const extrude = (shape) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: TH, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); g.scale(0.001, 0.001, 0.001); g.translate(TOOL.x / 1000, BED / 1000, TOOL.z / 1000);
    return g;
  };
  const inner = path.feats.filter((f) => !f.outer);
  const { box } = stats;
  const x0 = box.x[0] - MARGIN, x1 = box.x[1] + MARGIN, y0 = box.y[0] - MARGIN, y1 = box.y[1] + MARGIN;
  const stockShape = new THREE.Shape([new THREE.Vector2(x0, -y0), new THREE.Vector2(x1, -y0), new THREE.Vector2(x1, -y1), new THREE.Vector2(x0, -y1)]);
  stockShape.holes.push(new THREE.Path(shapePts(path.outline.pts)));
  const partShape = new THREE.Shape(shapePts(path.outline.pts));
  for (const f of inner) partShape.holes.push(new THREE.Path(shapePts(f.pts)));
  const alu = new THREE.MeshStandardMaterial({ color: '#c4c8cc', metalness: 0.7, roughness: 0.42 });
  const partMat = alu.clone();
  const ALU = new THREE.Color('#c4c8cc'), TINT = new THREE.Color(ORANGE);
  const stock = new THREE.Mesh(extrude(stockShape), alu);
  // the slugs, merged by hand into one mesh (positions and normals only)
  const slugGeo = (() => {
    const gs = inner.map((f) => extrude(new THREE.Shape(shapePts(f.pts))));
    let nv = 0; for (const g of gs) nv += g.attributes.position.count;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
    let o = 0; for (const g of gs) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; g.dispose(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return g;
  })();
  const slugs = new THREE.Mesh(slugGeo, alu);
  const part = new THREE.Mesh(extrude(partShape), partMat);
  stock.receiveShadow = slugs.receiveShadow = part.receiveShadow = true;
  part.castShadow = true;

  // the plate's outline and holes, drawn faintly on the stock before they are cut
  const plan = new THREE.Group();
  for (const f of path.feats) {
    const g = new THREE.BufferGeometry().setFromPoints(f.pts.map(([X, Y]) => W(X, Y, TOP + 0.15)));
    plan.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.6, depthWrite: false })));
  }
  plan.traverse((m) => { m.renderOrder = 2; });

  // the travel the rails and screws allow, drawn as a thin dashed box on the bed plane
  const travel = new THREE.Group();
  {
    const [tx0, tx1] = TRAVEL.x, [ty0, ty1] = TRAVEL.y;
    const corners = [[tx0, ty0], [tx1, ty0], [tx1, ty1], [tx0, ty1], [tx0, ty0]];
    const pos = [], idx = [];
    let k = 0;
    for (let e = 0; e < 4; e++) {
      const [a, b] = [corners[e], corners[e + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[0] - a[0]) / len, ny = (b[1] - a[1]) / len;
      for (let s = 0; s < len; s += 16) {
        const e1 = Math.min(len, s + 9);
        const p0 = [a[0] + nx * s, a[1] + ny * s], p1 = [a[0] + nx * e1, a[1] + ny * e1];
        for (const [px, py, sx] of [[p0[0], p0[1], 1], [p0[0], p0[1], -1], [p1[0], p1[1], 1], [p1[0], p1[1], -1]]) {
          const v = W(px - ny * sx, py + nx * sx, BED - 0.3); pos.push(v.x, v.y, v.z);
        }
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); k += 4;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    travel.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#d9d2c8', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })));
  }
  // the pointer: from the bottom of the lower X carriage block down to the stock, with a dot
  const pointer = new THREE.Group();
  const stemH = (158.8 - TOP) / 1000;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, stemH, 10), new THREE.MeshBasicMaterial({ color: ORANGE }));
  stem.position.y = stemH / 2;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 16, 10), new THREE.MeshBasicMaterial({ color: ORANGE }));
  pointer.add(stem, dot);
  for (const o of [kerfMesh, rapidMesh, plan, travel, pointer]) o.traverse((m) => { m.castShadow = false; m.receiveShadow = false; });
  const overlays = [stock, slugs, part, kerfMesh, rapidMesh, plan, travel, pointer];
  for (const o of overlays) base.add(o);
  const placePointer = (X, Y) => pointer.position.set(...mm(TOOL.x + X, TOP + 0.3, TOOL.z + Y));

  // ---------------------------------------------------------------- views, framed once at rest
  const whole = [P.frame, P.ymotors, P.gantry, P.xmotor];
  const V = viewSet(stage, el, [
    { obj: whole, azimuth: 32, elevation: 44, pad: 1.02 },   // 0 overview
    { obj: whole, azimuth: 70, elevation: 26, pad: 1.16 },   // 1 along the right Y screw
    { obj: whole, azimuth: 10, elevation: 32, pad: 1.16 },   // 2 the X axis, from the front
    { obj: stock, azimuth: 8, elevation: 60, pad: 1.95 },    // 3 over the stock, for the cuts
    { obj: stock, azimuth: 28, elevation: 40, pad: 1.75 },   // 4 the plate lifted out
  ]);
  const STEP_VIEW = [0, 1, 2, 3, 3, 3, 4];

  const ov = labelLayer(stage);
  const lab = {
    y: ov.label('Y axis: the whole gantry', P.gantry, { minW: 520 }),
    x: ov.label('X axis: the carriage', P.xblocks, { minW: 520 }),
    ys: ov.label('Right Y ball screw', mm(516.4, 83.4, -120), { minW: 520 }),
    yl: ov.label('Left Y ball screw', mm(-37.1, 83.4, -200), { minW: 520 }),
    xs: ov.label('X ball screw', P.xscrew, { minW: 520 }),
    tool: ov.label('Tool point: no Z axis yet', pointer, { color: ORANGE, minW: 520 }),
    box: ov.label('Travel: about 417 x 460 mm', mm(TOOL.x + TRAVEL.x[1], BED, TOOL.z + TRAVEL.y[1]), { color: '#d9d2c8', minW: 520 }),
    plate: ov.label('E-bike side plate, real size', mm(TOOL.x + box.x[1] - 20, TOP, TOOL.z + box.y[1] - 40), { color: ORANGE, minW: 520 }),
    part: ov.label(`The plate: ${Math.round(plate.size[0])} x ${Math.round(plate.size[1])} mm`, mm(TOOL.x + (box.x[0] + box.x[1]) / 2, TOP + 30, TOOL.z + box.y[1] - 30), { color: ORANGE, minW: 520 }),
  };
  const H = hud(ov.layer, [['now', 'Now'], ['x', 'X (carriage)'], ['y', 'Y (gantry)'], ['xs', 'X screw', true], ['ys', 'Y screws, together', true], ['cut', 'Cut so far', true]],
    `${LEAD} mm per screw turn, ${(LEAD / STEPS_PER_TURN).toFixed(3)} mm per full motor step (computed from the part numbers)`);
  const f1 = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
  const nowText = (i, step, done) => {
    if (step === 0) return 'Home';
    if (K[i - 1] === 'cut') return featName[F[i - 1]];
    return done && step === STEPS.length - 1 ? 'Home' : 'Rapid move';
  };

  let lastS = -1, lastLift = -1;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy);
    const last = step === STEPS.length - 1;
    const [t0, t1] = STEPS[step];
    const k = reduced ? 1 : smooth(0.06, last ? 0.5 : 0.82, stepP);
    const s = sOfT(lerp(t0, t1, k));
    const at = atS(s);
    setXY(at.X, at.Y);
    placePointer(at.X, at.Y);
    if (s !== lastS) {
      lastS = s;
      const i = clamp(Math.round(s / kerf.step), 0, kerf.n - 1);
      kerf.g.setDrawRange(0, kerf.upto[i]);
      rapid.g.setDrawRange(0, rapid.upto[i]);
      stage.invalidate();
    }
    // the plate lifted out of the sheet once the tool is home
    const lift = last ? (reduced ? 1 : smooth(0.55, 0.92, stepP)) : 0;
    if (lift !== lastLift) {
      lastLift = lift;
      part.position.y = 0.03 * lift;
      partMat.color.copy(ALU).lerp(TINT, 0.85 * lift);
      partMat.metalness = lerp(0.7, 0.2, lift);
      partMat.roughness = lerp(0.42, 0.5, lift);
      stage.invalidate();
    }
    // camera: blend from the previous step's view over the first 45 % of the step, then hold
    const views = V(`${sx}`);
    const a = views[STEP_VIEW[Math.max(0, step - 1)]], b = views[STEP_VIEW[step]];
    setView(blendView(a, b, reduced || step === 0 ? 1 : smooth(0, 0.45, stepP)));
    const on = (want) => (want ? 1 : 0);
    lab.y.a = on(step === 0 || step === 1);
    lab.x.a = on(step === 0 || step === 2);
    lab.ys.a = on(step === 1);
    lab.yl.a = on(step === 1);
    lab.xs.a = on(step === 2);
    lab.tool.a = on(step === 2);
    lab.box.a = on(step === 0);
    lab.plate.a = on(step === 0);
    lab.part.a = on(last && lift > 0.3);
    H.put('now', nowText(at.i, step, k >= 1));
    H.put('x', `${f1(at.X)} mm`);
    H.put('y', `${f1(at.Y)} mm`);
    H.put('xs', `${f1(at.X / LEAD)} turns`);
    H.put('ys', `${f1(at.Y / LEAD)} turns`);
    H.put('cut', `${Math.round(at.cut)} mm`);
    H.put('mini', `X ${f1(at.X)} mm, Y ${f1(at.Y)} mm`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() {
      ov.dispose?.();
      for (const o of overlays) o.traverse((m) => { m.geometry?.dispose(); m.material?.dispose(); });
      stage.dispose();
    },
  };
}

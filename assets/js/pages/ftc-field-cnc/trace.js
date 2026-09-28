// "The machine, cutting a real part" (scroll-driven): Jerry's gantry CAD runs a toolpath for the shorter
// side plate of his e-bike (the drive-side plate), at its real size, from the plate's exact profile in
// his e-bike CAD (ebike-drive-plate.json; path in platepath.js). The gantry (Y) and the carriage on it
// (X) move along their real axes and all three ball screws turn about theirs, 5 mm of travel per turn
// (rig.js). The picture is a pure function of (step, progress through the step): scrolling back runs
// the path backwards.
//
// What is real and what is not:
//  - the machine, its axes, lead and travel limits are the CNC CAD's; the plate's outline, holes and
//    thickness (3.175 mm) are the e-bike CAD's, unscaled
//  - the Z axis, the spindle and the 1/8 in end mill are a generic unit (zaxis.js) that Jerry asked for
//    this round; they are NOT in his CAD, and the caption says so. The unit bolts to the front of the X
//    carriage blocks, so the tool point is the spindle's axis, 82 mm in front of them
//  - the stock sheet lies at the top of the lower frame extrusions (y = 50.8 mm); the stock, the kerf
//    (the end mill's full width, 3.175 mm), the rapid moves and the travel box are overlays, not parts
//  - the path runs one cutter radius off the plate's edges (outside the outline, inside every hole),
//    one pass to full depth; the three CAD slivers under 1.5 mm around are left out
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadCnc, viewSet, viewSetter, blendView, hud, smooth, clamp, lerp, mm, LEAD, STEPS_PER_TURN, TRAVEL } from './rig.js';
import { buildPath, CUTTER } from './platepath.js';
import { buildZ, Z as ZU } from './zaxis.js';

const ORANGE = '#ff6b35', BLUE = '#8fc3f5';
const BED = 50.8; // mm: top of the lower field extrusions
const TOOL = { x: ZU.x, z: ZU.axisZ }; // mm: the spindle axis at X = Y = 0
const MARGIN = 12; // mm of stock drawn around the plate (overlay)
const SPIN = 0.35; // end mill turn, radians per unit of path time (a picture of the spin, not a speed)

// a box in model millimetres to frame a view on (never added to the scene)
function region(x0, y0, z0, x1, y1, z1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) / 1000, (y1 - y0) / 1000, (z1 - z0) / 1000));
  m.position.set(...mm((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  m.updateMatrixWorld(true);
  return m;
}

export async function mount(el, ctx) {
  const [rig, plate] = await Promise.all([
    loadCnc(el),
    fetch(ctx.asset('/assets/models/ftc-field-cnc/ebike-drive-plate.json')).then((r) => r.json()),
  ]);
  const { stage, base, P, carriage, setXY } = rig;
  const setView = viewSetter(stage);
  const reduced = ctx.reducedMotion;
  const TH = plate.thickness, TOP = BED + TH;

  // ---------------------------------------------------------------- the generic Z axis and spindle
  const zu = buildZ(THREE);
  carriage.add(zu.fixed, zu.slide);

  // ---------------------------------------------------------------- the path
  const path = buildPath(plate);
  const { P: PT, Z: PZ, K, F, S, T, marks, stats } = path;
  const TEND = T[T.length - 1];
  const CUT = [0]; // cut length up to each point
  for (let i = 1; i < PT.length; i++) CUT.push(CUT[i - 1] + (K[i - 1] === 'cut' ? S[i] - S[i - 1] : 0));
  const seg = (arr, v) => { let lo = 1, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; };
  function atT(t) {
    t = clamp(t, 0, TEND);
    const i = seg(T, t), u = (t - T[i - 1]) / Math.max(1e-9, T[i] - T[i - 1]);
    return {
      i, t, X: lerp(PT[i - 1][0], PT[i][0], u), Y: lerp(PT[i - 1][1], PT[i][1], u), Z: lerp(PZ[i - 1], PZ[i], u),
      cut: CUT[i - 1] + (K[i - 1] === 'cut' ? S[i] - S[i - 1] : 0) * u, s: lerp(S[i - 1], S[i], u),
    };
  }
  // per step: path time at its start and end (0 home, 1 Y alone, 2 X alone, 3 Z down and the first plunge,
  // 4 round holes, 5 pockets, 6 outline, 7 home)
  const M = marks;
  const STEPS = [[0, 0], [0, T[M.yOnly]], [T[M.yOnly], T[M.xOnly]], [T[M.xOnly], T[M.plunge1]], [T[M.plunge1], T[M.holes]],
    [T[M.holes], T[M.pockets]], [T[M.pockets], T[M.outline]], [T[M.outline], TEND]];
  const SPIN_ON = T[M.xOnly], SPIN_OFF = T[M.outline] + (CUTTER.zHome - CUTTER.zSafe) / 3; // spindle running from Z down to Z up
  // what the readout calls each cut feature
  const nHoles = stats.holes, nLattice = stats.pockets - stats.slots;
  const featName = [''];
  { let h = 0, q = 0; for (const f of path.order.slice(1)) featName.push(f.outer ? 'Outline' : f.round ? `Round hole ${++h} of ${nHoles}` : f.slot ? 'The slot' : `Pocket ${++q} of ${nLattice}`); }

  // ---------------------------------------------------------------- overlays
  const W = (X, Y, h) => new THREE.Vector3(...mm(TOOL.x + X, h, TOOL.z + Y));
  // the kerf: the end mill's full width swept along every cut (quads along each cut segment, a disc at every
  // plunge and sharp turn), in path-time order so a draw range shows exactly what has been cut
  const kerf = (() => {
    const r = CUTTER.D / 2, lift = TOP + 0.25, pos = [], pieces = []; // pieces: [t, first index, index count]
    const idx = [];
    const vert = (X, Y) => { const v = W(X, Y, lift); pos.push(v.x, v.y, v.z); return pos.length / 3 - 1; };
    const disc = (X, Y, t) => {
      const c = vert(X, Y), n = 18, s0 = idx.length;
      for (let k = 0; k < n; k++) vert(X + r * Math.cos((2 * Math.PI * k) / n), Y + r * Math.sin((2 * Math.PI * k) / n));
      for (let k = 0; k < n; k++) idx.push(c, c + 1 + k, c + 1 + ((k + 1) % n));
      pieces.push([t, s0, idx.length - s0]);
    };
    let lastDir = null;
    for (let j = 1; j < PT.length; j++) {
      if (K[j - 1] === 'plunge') { disc(PT[j][0], PT[j][1], T[j]); lastDir = null; continue; }
      if (K[j - 1] !== 'cut') { lastDir = null; continue; }
      const [x0, y0] = PT[j - 1], [x1, y1] = PT[j], len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 1e-6) continue;
      const dx = (x1 - x0) / len, dy = (y1 - y0) / len, nx = -dy * r, ny = dx * r;
      if (lastDir && lastDir[0] * dx + lastDir[1] * dy < 0.996) disc(x0, y0, T[j - 1]); // a turn over 5 degrees: round the join
      lastDir = [dx, dy];
      const n = Math.max(1, Math.ceil(len / 0.6));
      for (let m = 0; m < n; m++) {
        const a = m / n, b = (m + 1) / n, s0 = idx.length;
        const ax = lerp(x0, x1, a), ay = lerp(y0, y1, a), bx = lerp(x0, x1, b), by = lerp(y0, y1, b);
        const v0 = vert(ax + nx, ay + ny), v1 = vert(ax - nx, ay - ny), v2 = vert(bx + nx, by + ny), v3 = vert(bx - nx, by - ny);
        idx.push(v0, v1, v2, v1, v3, v2);
        pieces.push([lerp(T[j - 1], T[j], b), s0, 6]);
      }
    }
    pieces.sort((p, q) => p[0] - q[0]);
    const sorted = [], tt = new Float64Array(pieces.length), upto = new Uint32Array(pieces.length);
    for (let k = 0; k < pieces.length; k++) { const [t, s0, c] = pieces[k]; for (let q = 0; q < c; q++) sorted.push(idx[s0 + q]); tt[k] = t; upto[k] = sorted.length; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(sorted);
    g.setDrawRange(0, 0);
    // index count drawn at path time t: every piece finished by t
    const count = (t) => { let lo = 0, hi = tt.length; while (lo < hi) { const m = (lo + hi) >> 1; if (tt[m] <= t) lo = m + 1; else hi = m; } return lo ? upto[lo - 1] : 0; };
    return { g, count };
  })();
  // rapid moves: a dashed ribbon on the stock, along the XY length of the path
  const L = S[S.length - 1];
  const atS = (s) => { s = clamp(s, 0, L); const i = seg(S, s), u = (s - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]); return [lerp(PT[i - 1][0], PT[i][0], u), lerp(PT[i - 1][1], PT[i][1], u)]; };
  const rapid = (() => {
    const step = 0.5, n = Math.ceil(L / step) + 1, w = 0.65, dash = 5, gap = 4;
    const pos = new Float32Array(n * 6), idx = [], upto = new Uint32Array(n);
    let j = 1;
    for (let i = 0; i < n; i++) {
      const s = Math.min(L, i * step);
      const p = atS(s), q = atS(Math.min(L, s + 0.4)), b = atS(Math.max(0, s - 0.4));
      let dx = q[0] - b[0], dy = q[1] - b[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const a = W(p[0] - dy * w, p[1] + dx * w, TOP + 1.2), c = W(p[0] + dy * w, p[1] - dx * w, TOP + 1.2);
      pos.set([a.x, a.y, a.z, c.x, c.y, c.z], i * 6);
      if (i > 0) {
        const sm = s - step / 2;
        while (j < S.length - 1 && S[j] < sm) j++;
        if (K[j - 1] === 'rapid' && (sm % (dash + gap)) < dash) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      upto[i] = idx.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    return { g, upto, step, n };
  })();
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
  for (const o of [kerfMesh, rapidMesh, plan, travel]) o.traverse((m) => { m.castShadow = false; m.receiveShadow = false; });
  const overlays = [stock, slugs, part, kerfMesh, rapidMesh, plan, travel];
  for (const o of overlays) base.add(o);
  stage.fitGround();

  // ---------------------------------------------------------------- views, framed once at rest
  const whole = [P.frame, P.ymotors, P.gantry, P.xmotor, zu.fixed];
  const first = PT[M.xOnly]; // the first hole's entry point: where Z comes down
  const zView = region(TOOL.x + first[0] - 75, BED, TOOL.z + first[1] - 120, TOOL.x + first[0] + 75, 392, TOOL.z + first[1] + 30);
  const V = viewSet(stage, el, [
    { obj: whole, azimuth: 32, elevation: 44, pad: 1.02 },   // 0 overview
    { obj: whole, azimuth: 70, elevation: 26, pad: 1.16 },   // 1 along the right Y screw
    { obj: whole, azimuth: 10, elevation: 32, pad: 1.16 },   // 2 the X axis, from the front
    { obj: zView, azimuth: 34, elevation: 12, pad: 1.45 },   // 3 the Z axis and spindle, close
    { obj: stock, azimuth: 16, elevation: 56, pad: 1.9 },    // 4 over the stock, for the cuts
    { obj: stock, azimuth: 28, elevation: 40, pad: 1.75 },   // 5 the plate lifted out
  ]);
  const STEP_VIEW = [0, 1, 2, 3, 4, 4, 4, 5];

  const ov = labelLayer(stage);
  const lab = {
    y: ov.label('Y axis: the whole gantry', P.gantry, { minW: 520 }),
    x: ov.label('X axis: the carriage', P.xblocks, { minW: 520 }),
    ys: ov.label('Right Y ball screw', mm(516.4, 83.4, -120), { minW: 520 }),
    yl: ov.label('Left Y ball screw', mm(-37.1, 83.4, -200), { minW: 520 }),
    xs: ov.label('X ball screw', P.xscrew, { minW: 520 }),
    z: ov.label('Z axis and spindle: generic, not in my CAD', zu.motor, { color: ORANGE, side: 'l', minW: 520 }),
    mill: ov.label('1/8 in end mill', zu.spin, { color: ORANGE, side: 'l', minW: 520 }),
    box: ov.label('Travel: about 417 x 460 mm', mm(TOOL.x + TRAVEL.x[1], BED, TOOL.z + TRAVEL.y[1]), { color: '#d9d2c8', minW: 520 }),
    plate: ov.label('E-bike side plate, real size', mm(TOOL.x + box.x[1] - 20, TOP, TOOL.z + box.y[1] - 40), { color: ORANGE, minW: 520 }),
    part: ov.label(`The plate: ${Math.round(plate.size[0])} x ${Math.round(plate.size[1])} mm`, mm(TOOL.x + (box.x[0] + box.x[1]) / 2, TOP + 30, TOOL.z + box.y[1] - 30), { color: ORANGE, minW: 520 }),
  };
  const H = hud(ov.layer, [['now', 'Now'], ['x', 'X (carriage)'], ['y', 'Y (gantry)'], ['z', 'Z (tip over the stock)', true], ['xs', 'X screw', true], ['ys', 'Y screws, together', true], ['cut', 'Cut so far', true]],
    `${LEAD} mm per screw turn, ${(LEAD / STEPS_PER_TURN).toFixed(3)} mm per full motor step (computed from the part numbers)`);
  const f1 = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
  const fz = (v) => `${v < 0 ? '−' : v > 0 ? '+' : ''}${Math.abs(v).toFixed(1)}`;
  const nowText = (at, step) => {
    if (step === 0) return 'Home';
    const k = K[at.i - 1];
    if (k === 'cut') return featName[F[at.i - 1]];
    if (k === 'plunge') return 'Plunge';
    if (PZ[at.i] > PZ[at.i - 1]) return at.t >= TEND ? 'Home' : 'Z up';
    if (PZ[at.i] < PZ[at.i - 1]) return 'Z down';
    return at.t >= TEND ? 'Home' : 'Rapid move';
  };

  let lastT = -1, lastLift = -1;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy);
    const last = step === STEPS.length - 1;
    const [t0, t1] = STEPS[step];
    const k = reduced ? 1 : smooth(0.06, last ? 0.5 : 0.82, stepP);
    const at = atT(lerp(t0, t1, k));
    setXY(at.X, at.Y);
    if (at.t !== lastT) {
      lastT = at.t;
      zu.setTip(TOP + at.Z);
      zu.setSpin(reduced ? 0 : SPIN * (clamp(at.t, SPIN_ON, SPIN_OFF) - SPIN_ON));
      kerf.g.setDrawRange(0, kerf.count(at.t));
      rapid.g.setDrawRange(0, rapid.upto[clamp(Math.round(at.s / rapid.step), 0, rapid.n - 1)]);
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
    lab.z.a = on(step === 0 || step === 3);
    lab.mill.a = on(step === 3);
    lab.box.a = on(step === 0);
    lab.plate.a = on(step === 0);
    lab.part.a = on(last && lift > 0.3);
    H.put('now', nowText(at, step));
    H.put('x', `${f1(at.X)} mm`);
    H.put('y', `${f1(at.Y)} mm`);
    H.put('z', `${fz(at.Z)} mm`);
    H.put('xs', `${f1(at.X / LEAD)} turns`);
    H.put('ys', `${f1(at.Y / LEAD)} turns`);
    H.put('cut', `${Math.round(at.cut)} mm`);
    H.put('mini', `X ${f1(at.X)}, Y ${f1(at.Y)}, Z ${fz(at.Z)} mm`);
    base.updateMatrixWorld(true); // labels on moving parts read their world boxes now, not after the draw
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() {
      ov.dispose?.();
      for (const o of overlays) o.traverse((m) => { m.geometry?.dispose(); m.material?.dispose(); });
      zu.dispose();
      stage.dispose();
    },
  };
}

// The braille printer rig, shared by this page's scrollies. Everything here is from my team's CAD
// (assets/models/braille-printer/printer.glb, made from the STEP by /home/claude/work/
// pennapps-braille-printer/cad/prep.mjs and tools/optimize-cad.mjs; axes from tools/cad-axes.py,
// see cad/axes.txt there). Model frame: metres, Y up (STEP x, z, -y).
//
//  - Y: the gantry beam and everything on it slide along Z on the two side carriages; one motor per
//    side winds dental floss on a two-groove spool (drum radius 15.47 mm: 97.2 mm per turn)
//  - X: the servo carriage slides along the beam (X) on a GT2 belt from a 20-tooth pulley
//    (40 mm per turn, an effective radius of 6.366 mm)
//  - the servo turns the arm and pin about its output shaft, parallel to Z through
//    (x -162.0, y 379.8) mm; the pin's 0.83 mm round nose is centred 86 mm from it
//  - the die: 4,050 dimples, 0.8 mm radius and 0.6 mm deep, 2.34 mm apart in a cell, cells 6.22 mm
//    apart in groups of three that repeat every 21 mm, lines 10 mm apart; its top is at y 308.53 mm
// The page, the dents and bumps, the floss and the target rings are drawn for the page (they are
// not in the CAD) and say so wherever they appear.
const P = (i) => new RegExp(`^anim_bp_${i}_`);
// the moving parts' indices in the web model (their CAD names follow the index)
export const PART = {
  yCarriageR: 0, yCarriageL: 1, beam: 2, xShaft: 3, xMotor: 4, xPulley: 5, xIdler1: 6, xIdlerMount2: 7,
  xIdler2: 8, xIdler4: 9, xMotorMount: 10, xIdlerMount: 11, yShaftL: 12, ySpoolL: 13, yRoller1: 14,
  yRoller2: 15, yShaftR: 16, ySpoolR: 17, die: 18, xCarriage: 19, servo: 20, horn: 21, disc: 22, pin: 23, arm: 24,
};
export const partRx = (...keys) => new RegExp(keys.map((k) => `^anim_bp_${PART[k]}_`).join('|'));
export const MODEL = '/assets/models/braille-printer/printer.glb';

export const G = {
  axis: [-0.162, 0.3798], // servo output shaft (x, y); parallel to Z
  nose: [-0.2145, 0.3117, -0.38], // centre of the pin's round nose in the CAD pose
  noseR: 0.00083,
  dieY: 0.30853, dimpleR: 0.0008, dimpleD: 0.0006,
  xMotor: [-0.3865, 0.3611], pulleyR: 0.04 / (2 * Math.PI), // X motor shaft and pulley, parallel to Z
  spool: { y: 0.3284, z: -0.064, r: 0.01547 }, // Y spools, parallel to X
  rollers: [{ y: 0.3164, z: -0.5433 }, { y: 0.3399, z: -0.5433 }], rollerR: 0.0035,
  travelX: [-0.078, 0.107], travelY: [-0.121, 0.115], // from the CAD pose, where parts meet (approximate)
};
// die grid: cell k (0..26, from -X), column 0/1 (-X/+X), line L (0..24, from -Z), row r (0..2)
export const cellX = (k, col) => -0.26666 + 0.021 * Math.floor(k / 3) + 0.00622 * (k % 3) + (col ? 0.00234 : 0);
export const lineZ = (L, r) => -0.43143 + 0.01 * L + 0.00234 * r;

// ------------------------------------------------------------------ the pin's arc
// Rotating the arm by a (radians, about +Z) swings the nose down and toward +X.
const [AX, AY] = G.axis, [NX, NY] = G.nose;
export function noseAt(a) {
  const dx = NX - AX, dy = NY - AY, c = Math.cos(a), s = Math.sin(a);
  return [AX + dx * c - dy * s, AY + dx * s + dy * c];
}
function solve(yTip) { // angle at which the nose's lowest point reaches height yTip
  let lo = 0, hi = 0.2;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (noseAt(m)[1] - G.noseR > yTip) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const ARC = (() => {
  const touch = solve(G.dieY), bottom = solve(G.dieY - G.dimpleD);
  const n0 = noseAt(0), nb = noseAt(bottom);
  return { touch, bottom, shift: nb[0] - n0[0], raised: n0[1] - G.noseR - G.dieY, radius: Math.hypot(NX - AX, NY - AY) };
})();
// carriage travel that puts the nose over a dimple at (x, z) at the bottom of the swing
export const parkFor = (x, z) => ({ x: x - ARC.shift - NX, y: z - G.nose[2] });

// ------------------------------------------------------------------ small helpers
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

// Views are framed once, at rest, from fixed boxes (never from moving parts), cached per aspect,
// and blended by orbiting about the target.
export function views(stage, el, defs) {
  const { THREE } = stage;
  let cache = null, aspect = 0;
  const boxObj = (min, max) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]));
    m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    m.updateMatrixWorld(true);
    return m;
  };
  function get(name) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!cache || Math.abs(a - aspect) > 1e-3) {
      aspect = a; cache = {};
      for (const [k, d] of Object.entries(defs)) {
        const o = d.box ? boxObj(d.box[0], d.box[1]) : d.obj;
        const v = stage.frame(o, { ...d, apply: false, refresh: true });
        cache[k] = { t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) };
      }
    }
    return cache[name];
  }
  const sp = new THREE.Spherical(), pos = new THREE.Vector3(), tgt = new THREE.Vector3();
  const oa = new THREE.Vector3(), ob = new THREE.Vector3();
  /** blend view a into view b (k 0..1), turned by drift (radians); offA / offB shift a view's target and camera ([x, y, z]) */
  function place(a, b, k, drift = 0, offA = null, offB = null) {
    const A = typeof a === 'string' ? get(a) : a, B = typeof b === 'string' ? get(b) : b;
    oa.set(...(offA || [0, 0, 0])); ob.set(...(offB || [0, 0, 0]));
    let dT = B.s.theta - A.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    tgt.copy(A.t).add(oa).lerp(ob.add(B.t), k);
    sp.set(lerp(A.s.radius, B.s.radius, k), clamp(lerp(A.s.phi, B.s.phi, k), 0.02, Math.PI - 0.02), A.s.theta + dT * k + drift);
    pos.setFromSpherical(sp).add(tgt);
    stage.setView({ pos, target: tgt });
  }
  return { get, place };
}

// ------------------------------------------------------------------ the printer
export async function loadPrinter(stage, o = {}) {
  const { THREE } = stage;
  const model = await stage.load(MODEL);
  const get = (k) => stage.part(P(PART[k]), model);
  // the die is a flat plate on the base: its own shadow only speckles the page lying 0.2 mm over it
  for (const d of get('die')) d.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  const gy = new THREE.Group(); gy.name = 'gantry-y'; model.add(gy);
  const gx = new THREE.Group(); gx.name = 'carriage-x'; gy.add(gx);
  const put = (g, keys) => { for (const k of keys) for (const x of get(k)) g.attach(x); };
  put(gy, ['yCarriageR', 'yCarriageL', 'beam', 'xMotor', 'xIdler1', 'xIdlerMount2', 'xIdler2', 'xIdler4', 'xMotorMount', 'xIdlerMount', 'xShaft', 'xPulley']);
  put(gx, ['xCarriage', 'servo', 'horn', 'disc', 'pin', 'arm']);
  const z0 = -0.33;
  const arm = stage.pivot([...get('horn'), ...get('disc'), ...get('arm'), ...get('pin')], [AX, AY, z0], [0, 0, 1]);
  const xSpin = stage.pivot([...get('xShaft'), ...get('xPulley')], [G.xMotor[0], G.xMotor[1], z0], [0, 0, 1]);
  const spoolL = stage.pivot([...get('yShaftL'), ...get('ySpoolL')], [-0.31, G.spool.y, G.spool.z], [1, 0, 0]);
  const spoolR = stage.pivot([...get('yShaftR'), ...get('ySpoolR')], [-0.04, G.spool.y, G.spool.z], [1, 0, 0]);
  const roll1 = stage.pivot(get('yRoller1'), [-0.309, G.rollers[0].y, G.rollers[0].z], [1, 0, 0]);
  const roll2 = stage.pivot(get('yRoller2'), [-0.309, G.rollers[1].y, G.rollers[1].z], [1, 0, 0]);

  // the floss, drawn (it is not in the CAD): each side, from the top and the bottom of the drum
  // to the far end, where the left idler's two rollers sit level with them (the right idler has
  // the same holes but no rollers in the CAD)
  let floss = null;
  if (o.floss) {
    floss = new THREE.Group(); floss.name = 'floss (drawn)';
    const mat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.55, transparent: true, opacity: 0.95 });
    const run = (a, b) => {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.00025, 0.00025, len, 5, 1, true), mat);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      m.castShadow = false; m.receiveShadow = false;
      floss.add(m);
    };
    const top = G.spool.y + G.spool.r, bot = G.spool.y - G.spool.r, zS = G.spool.z, zR = G.rollers[0].z;
    const rTop = G.rollers[1].y + G.rollerR, rBot = G.rollers[0].y - G.rollerR;
    for (const [g1, g2, xr] of [[-0.315, -0.309, -0.309], [-0.035, -0.041, -0.041]]) {
      run([g1, top, zS], [xr, rTop, zR]);
      run([g2, bot, zS], [xr, rBot, zR]);
    }
    floss.userData.mat = mat;
    model.add(floss);
  }

  const state = { x: NaN, y: NaN, a: NaN };
  function set({ x = 0, y = 0, a = 0 }) {
    if (x !== state.x || y !== state.y) {
      gy.position.z = y; gx.position.x = x;
      state.x = x; state.y = y;
      xSpin.setAngle(-x / G.pulleyR);
      spoolL.setAngle(y / G.spool.r); spoolR.setAngle(y / G.spool.r);
      roll1.setAngle(-y / G.rollerR); roll2.setAngle(y / G.rollerR);
      stage.invalidate();
    }
    if (a !== state.a) { arm.setAngle(a); state.a = a; }
  }
  set({});
  return { model, gy, gx, arm, floss, get, set, state };
}

// ------------------------------------------------------------------ the page (drawn)
// A sheet on the die; dents on the side the pin hits and bumps on the other, both 0.8 mm across
// (the dimple's size). Dents are flat discs with a dimple normal map, bumps are flattened spheres.
export function makePage(stage, model, o = {}) {
  const { THREE } = stage;
  const W = o.w ?? 0.21, D = o.d ?? 0.253, T = 0.0001;
  const cx = o.cx ?? -0.175, cz = o.cz ?? -0.3185;
  const group = new THREE.Group(); group.name = 'page (drawn)';
  const LIFT0 = 0.0002; // clear of the die's top face (re-meshed within 0.05 mm)
  group.position.set(cx, G.dieY + T / 2 + LIFT0, cz);
  const paperC = new THREE.Color('#f2eee6');
  // polygon offset: the sheet lies 0.2 mm over the die, closer than a 16-bit depth buffer resolves
  const paper = new THREE.MeshStandardMaterial({ color: paperC, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), paper);
  sheet.receiveShadow = true; sheet.castShadow = false; // a 0.1 mm sheet only shows acne from its own shadow
  group.add(sheet);

  // normal map of a smooth dent (concave), in tangent space
  const N = 64, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), img = g.createImageData(N, N);
  const depth = 0.55;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = ((i + 0.5) / N) * 2 - 1, v = 1 - ((j + 0.5) / N) * 2, r = Math.hypot(u, v);
    let nx = 0, ny = 0, nz = 1;
    if (r < 1 && r > 1e-4) { const d = depth * (Math.PI / 2) * Math.sin(Math.PI * r); nx = -d * (u / r); ny = -d * (v / r); }
    const l = Math.hypot(nx, ny, nz);
    const k = (j * N + i) * 4;
    img.data[k] = ((nx / l) * 0.5 + 0.5) * 255; img.data[k + 1] = ((ny / l) * 0.5 + 0.5) * 255; img.data[k + 2] = ((nz / l) * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const nmap = new THREE.CanvasTexture(cv);
  nmap.colorSpace = THREE.NoColorSpace;
  const dentMat = new THREE.MeshStandardMaterial({ color: paperC.clone().multiplyScalar(0.88), roughness: 1, normalMap: nmap, normalScale: new THREE.Vector2(1.6, 1.6), envMapIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const n = o.max ?? 64;
  const discGeo = new THREE.CircleGeometry(0.00105, 24).rotateX(-Math.PI / 2);
  const dents = new THREE.InstancedMesh(discGeo, dentMat, n); dents.count = 0; dents.receiveShadow = true; dents.frustumCulled = false;
  const bumpGeo = new THREE.SphereGeometry(0.0008, 18, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); // the half below the sheet
  const bumps = new THREE.InstancedMesh(bumpGeo, paper, n); bumps.count = 0; bumps.castShadow = true; bumps.receiveShadow = true; bumps.frustumCulled = false;
  const ringMat = new THREE.MeshBasicMaterial({ color: o.accent || '#ff6b35', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.00052, 0.00078, 24).rotateX(-Math.PI / 2), ringMat, n); rings.count = 0; rings.frustumCulled = false;
  group.add(dents, bumps, rings);
  model.add(group);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const local = (x, z) => [x - cx, z - cz];
  let sig = '';
  /** dots: [{x, z}] in model coordinates; done: how many are embossed; k: 0..1 depth of the next one; ringA: target ring opacity */
  function show(dots, done, k = 0, ringA = 0) {
    const key = `${dots.length}|${done}|${k.toFixed(3)}|${ringA.toFixed(3)}`;
    if (key === sig) return;
    sig = key;
    let nd = 0, nr = 0;
    dots.forEach((d, i) => {
      const [lx, lz] = local(d.x, d.z);
      const f = i < done ? 1 : i === done ? k : 0;
      if (f > 0.001) {
        m4.compose(p.set(lx, T / 2 + 0.00001, lz), q.identity(), s.set(f, 1, f)); dents.setMatrixAt(nd, m4);
        m4.compose(p.set(lx, -T / 2, lz), q.identity(), s.set(f, 0.62 * f, f)); bumps.setMatrixAt(nd, m4);
        nd++;
      }
      if (i >= done) { m4.compose(p.set(lx, T / 2 + 0.00002, lz), q.identity(), s.set(1, 1, 1)); rings.setMatrixAt(nr++, m4); }
    });
    dents.count = nd; bumps.count = nd; rings.count = nr;
    dents.instanceMatrix.needsUpdate = true; bumps.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;
    ringMat.opacity = ringA; rings.visible = ringA > 0.01;
    stage.invalidate();
  }
  /** lift the page (m), slide it along -Z (m), flip it about its centre line (0..1) */
  let last = '';
  function pose(lift, slide, flip) {
    const key = `${lift.toFixed(6)}|${slide.toFixed(6)}|${flip.toFixed(5)}`;
    if (key === last) return;
    last = key;
    group.position.set(cx, G.dieY + T / 2 + LIFT0 + lift, cz - slide);
    group.rotation.set(0, 0, flip * Math.PI);
    stage.invalidate();
  }
  /** where a die point ends up once the page has been slid, lifted and flipped */
  const after = (x, z, lift, slide) => [2 * cx - x, G.dieY + lift + T, z - slide];
  return { group, show, pose, after, cx, cz, W, D };
}

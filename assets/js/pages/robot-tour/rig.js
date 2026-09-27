// The Robot Tour robot, rigged from Jerry's two CAD files (belted V1, geared V2), shared by the
// scroll animations on this page.
//
// Geometry, measured on the GLBs and matching tools/cad-axes.py on the STEP (millimetres below are
// from the CAD). GLB frame: metres, Y up; forward (the dowel end) is +Z; the robot's own left is +X.
//  - wheel axle axis: along X through y = -2.1 mm, z = 26.4 mm (axle, wheel, wheel hub, spacers and
//    the 16T gear or 20T pulley are all centred on it)
//  - servo output axis: along X through y = 25.2 mm, z = 8.0 mm (servo output gear, hub, 40T gear or
//    60T pulley, and in V1 the pulley shaft and its third bearing)
//  - floor: y = -19.5 mm (the bottoms of both wheels and both casters)
//  - centre line x = -48.28 mm; wheel centres 119.9 mm apart; the turning point is the middle of the
//    axle, on the floor
//  - OTOS centre 30.4 mm ahead of the axle (the code's offset is 30.3 mm), dowel centre 80 mm ahead
// Kinematics (exact, from the tooth counts): the wheel turns +s / r about +X for forward travel s.
// V2: 40T on the servo drives 16T on the axle, an external mesh, so the servo turns -1 / 2.5 of the
// wheel. V1: a 60T pulley on the servo and a 20T on the axle, joined by a belt, so the servo turns
// +1 / 3 of the wheel.
export const M = '/assets/models/robot-tour';
export const FLOOR = -0.0195;
export const CX = -0.04828;
export const AXLE = [-0.0021, 0.0264]; // y, z
export const SERVO = [0.0252, 0.008];
export const TURN = [CX, FLOOR, 0.0264];
export const R = (1.375 * 0.0254) / 2; // BaneBots 1-3/8 in wheel
export const B = 0.05995; // half the track
export const OTOS_Z = 0.0568;
export const DOWEL_Z = 0.1065;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

const KIND = {
  geared: { src: `${M}/geared.glb`, ratio: 2.5, sign: -1 },
  belted: { src: `${M}/belted.glb`, ratio: 3, sign: 1 },
};

// part groups by CAD name (optimize-cad keeps each of these as its own named mesh)
const GROUPS = {
  frame: /_Frame_1/,
  beams: /_1106_00/,
  arduino: /Arduino_Mega/,
  battery: /193_3DModel/,
  casters: /pololu/,
  otos: /sparkfun_otos/,
  dowel: /dowel/,
  servo: /DDJ_STDLOW2_|DDJ_STDLOW_ZHOUCHENG|DDJ_XT_22/,
  standoffs: /22mm_servo_mount/,
  bearings: /1601_0412_0006/,
  belt: /Belt_2GT/,
  big: /Spur_Gear_40|3421_0014_0060/, // 40T gear or 60T pulley, on the servo
  small: /Spur_Gear_16|3422_0006_0020/, // 16T gear or 20T pulley, on the axle
  hub: /DDJ_STDLOW_GEAR6|1910_0025_0816|3217_2701|Hub_disc|Pulley_shaft/, // turns with the servo output
  axle: /2101_0006_0070|T61H_RM61|wheel_spacer|1mm_spacer/, // turns with the wheel
  wheel: /Wheel_T61P/,
};

/**
 * Loads one version into a carrier whose origin is the turning point, so rotating the carrier about
 * Y turns the robot in place exactly as the differential drive does. Returns the parts by group and
 * side, the drive pivots, and a small look() for per-group opacity and tint.
 */
export async function loadRobot(stage, kind) {
  const { THREE } = stage;
  const k = KIND[kind];
  const obj = await stage.load(k.src, { add: false });
  const carrier = new THREE.Group();
  carrier.name = `${kind} carrier`;
  carrier.position.set(...TURN);
  obj.position.set(-TURN[0], -TURN[1], -TURN[2]);
  carrier.add(obj);
  stage.root.add(carrier);
  carrier.updateWorldMatrix(true, true);

  const parts = {};
  for (const [g, re] of Object.entries(GROUPS)) parts[g] = stage.part(re, obj);
  // side: the mirrored module is the one at -X (the robot's right); the other is at +X (its left)
  const side = (list) => ({ L: list.filter((o) => !/Mirror/.test(o.name)), R: list.filter((o) => /Mirror/.test(o.name)) });
  const S = {};
  for (const g of ['servo', 'standoffs', 'bearings', 'belt', 'big', 'small', 'hub', 'axle', 'wheel']) S[g] = side(parts[g]);
  // bearings: outer (in the side plate), inner (inboard of the gear) and, in V1, the third one on the
  // servo axis in the printed centre tower
  const box = new THREE.Box3(), c = new THREE.Vector3();
  const centre = (o) => { box.setFromObject(o); return box.getCenter(c).clone(); };
  const bearing = { L: {}, R: {} };
  for (const s of ['L', 'R']) for (const o of S.bearings[s]) {
    const p = obj.worldToLocal(centre(o));
    if (p.y > 0.015) bearing[s].third = o;
    else if (Math.abs(p.x - CX) > 0.05) bearing[s].outer = o;
    else bearing[s].inner = o;
  }

  const pivots = {};
  for (const s of ['L', 'R']) {
    pivots[s] = {
      axle: stage.pivot([...S.axle[s], ...S.wheel[s], ...S.small[s]], [0, AXLE[0], AXLE[1]], [1, 0, 0]),
      servo: stage.pivot([...S.hub[s], ...S.big[s]], [0, SERVO[0], SERVO[1]], [1, 0, 0]),
    };
  }
  /** wheel angles (radians about +X, positive rolls forward) for the left and right wheel */
  function drive(left, right = left) {
    pivots.L.axle.setAngle(left); pivots.R.axle.setAngle(right);
    pivots.L.servo.setAngle((k.sign * left) / k.ratio); pivots.R.servo.setAngle((k.sign * right) / k.ratio);
  }

  // looks: every group gets its own copies of its materials, so each can fade and glow on its own
  const looks = new Map();
  function lookOf(list) {
    const key = list;
    if (looks.has(key)) return looks.get(key);
    const mats = [], meshes = [];
    for (const p of list) p.traverse((o) => {
      if (!o.isMesh) return;
      meshes.push(o);
      o.material = [].concat(o.material).map((m) => { const cm = stage.cloneMaterial(m); cm.userData.e0 = cm.emissive ? cm.emissive.clone() : null; mats.push(cm); return cm; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    const L = { mats, meshes, list, a: 1, tint: '', tk: 0 };
    looks.set(key, L);
    return L;
  }
  const tc = new THREE.Color();
  /** look(list, { opacity, tint, k }): opacity 0..1 (0 hides); tint a CSS colour mixed in by k */
  function look(list, o = {}) {
    if (!list || !list.length) return;
    const L = lookOf(list);
    const a = Math.round(clamp(o.opacity ?? 1, 0, 1) * 1000) / 1000;
    if (a !== L.a) {
      L.a = a;
      for (const m of L.meshes) { m.visible = a > 0.005; m.castShadow = a > 0.55; }
      for (const m of L.mats) { m.opacity = a; const t = a < 0.999; if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; } m.depthWrite = a > 0.55; }
      stage.invalidate();
    }
    const tint = o.tint || '', tk = Math.round(clamp(o.k ?? (tint ? 1 : 0), 0, 1) * 1000) / 1000;
    if (tint !== L.tint || tk !== L.tk) {
      L.tint = tint; L.tk = tk;
      for (const m of L.mats) {
        if (!m.emissive) continue;
        m.emissive.copy(m.userData.e0 || tc.set(0));
        if (tint && tk > 0) m.emissive.lerp(tc.set(tint).multiplyScalar(0.55), tk);
      }
      stage.invalidate(false);
    }
  }
  const all = (...names) => names.flatMap((n) => (parts[n] ? parts[n] : n.includes('.') ? S[n.split('.')[0]][n.split('.')[1]] : []));
  return { kind, obj, carrier, parts, S, bearing, pivots, drive, look, all, ratio: k.ratio, sign: k.sign };
}

/** Views framed once at rest and cached per stage shape; place() blends two of them on a sphere. */
export function views(stage, el, rest) {
  const { THREE } = stage;
  const cache = new Map();
  let aspect = 0;
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  function get(key, make) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (Math.abs(a - aspect) > 1e-3) { aspect = a; cache.clear(); }
    if (!cache.has(key)) cache.set(key, sph(rest ? rest(make) : make()));
    return cache.get(key);
  }
  const sp = new THREE.Spherical();
  function place(a, b, k, drift = 0) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), clamp(lerp(a.s.phi, b.s.phi, k), 0.02, Math.PI - 0.02), a.s.theta + dT * k + drift);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }
  return { get, place, clear: () => cache.clear() };
}

/** An invisible box to frame: stage.frame() fits its eight corners. */
export function frameBox(THREE, min, max) {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const m = new THREE.Mesh(g);
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  m.updateWorldMatrix(true, false);
  return m;
}

/** HTML readout rows that only touch the DOM when a value changes. */
export function readout(root) {
  const K = Object.fromEntries([...root.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  return {
    K,
    put(k, text) { if (K[k] && shown[k] !== text) { K[k].textContent = text; shown[k] = text; } },
    style(k, prop, v) { const key = `${k}.${prop}`; if (K[k] && shown[key] !== v) { K[k].style[prop] = v; shown[key] = v; } },
  };
}

// Shared rig for the ftc-decode-two-sided scrollies: Jerry's concept CAD (one web model, one
// download for every demo on the page) with every moving part turned about its real axis.
//
// The web model is tools/cad/configs/ftc-decode-two-sided-robot.json run on a pre-pass that
// bakes each rigid group of parts (parts that move together) into one node; screws, nuts and
// washers are the only parts left out. Coordinates are the CAD's own (metres, Y up): +x across
// the robot (x = 0 left side plate, 0.4572 right), +y up (floor at 0), +z toward the front plate.
//
// Axes. Every axis below was read from the STEP with tools/cad-axes.py (bore and pin cylinders,
// STEP (X, Y, Z) = GLB (x, -z, y) in mm) and matches the pulley and gear centres in the model:
//  - diffy body bores: P1 (231.1, 36.0) and P2 (285.1, 36.0), along z; spider cross pins along x
//    at z -203.5 (pod 1) and -209.5 (pod 2)
//  - 9T pinions KPL32-32-9 on the motors: (255.2, 77.8) and (213.9, 84.6); 48T idlers
//    2302-0014-0048: (270.2, 60.6) and (221.5, 63.1); front 24T chain idlers (248.5, 27.9) and
//    (267.7, 27.9)
//  - worm shaft along x at (y 36.0, z -151.4) (the worm wheel's throat is centred on it); worm
//    wheel and driven link on A (183.6, 60.0)
//  - 4-bar pins, from the link bores: A (183.6, 60.0), B (273.6, 60.0), C (178.6, 149.9),
//    D (278.6, 149.9)
//  - belt pulleys: idler on the passive link (260.7, 100.0), D (278.6, 149.9), E (267.9, 167.9),
//    F (228.6, 228.9), G (331.7, 20.0)
//  - drive wheels (228.6, 52.0), motor pulleys (156.1, 30.7) and (301.1, 30.7), along z
//  - turret: vertical, through (x 228.6, z -302.5), the centre of the ring gear's bolt pattern
import * as THREE from 'three';

export const MODEL = '/assets/models/ftc-decode-two-sided/robot.glb';
export const DEG = Math.PI / 180;
/** GLB millimetres -> model metres */
export const mm = (x, y, z) => [x / 1000, y / 1000, z / 1000];
export const Z = [0, 0, 1], X = [1, 0, 0], Y = [0, 1, 0];

export const AX = {
  P1: [231.1, 36.0], P2: [285.1, 36.0], M1: [255.2, 77.8], M2: [213.9, 84.6],
  I1: [270.2, 60.6], I2: [221.5, 63.1], CA: [248.5, 27.9], CB: [267.7, 27.9],
  A: [183.6, 60.0], B: [273.6, 60.0], C0: [178.6, 149.9], D0: [278.6, 149.9],
  IDL: [260.7, 100.0], E: [267.9, 167.9], F: [228.6, 228.9], G: [331.7, 20.0],
  WHEEL: [228.6, 52.0], MP1: [156.1, 30.7], MP2: [301.1, 30.7],
  TURRET: [228.6, -302.5], // x, z
};
export const SPIDER_Z = [-203.5, -209.5];
export const WORM = { y: 36.0, z: -151.4 };

// ------------------------------------------------------------------ gear train (from tooth counts in the CAD)
// m1, m2: motor shaft angles (or speeds), signed about +z. Everything else is linear in them.
export const K = 9 / 24; // 9T pinion -> 48T idler -> 24T on a pod shaft
export function train(m1, m2) {
  const p2f = K * m1, p1f = -K * m1, p1b = K * m2, p2b = K * m2; // front: four 24T gears in a row reverse pod 1
  const car1 = (p1f + p1b) / 2, car2 = (p2f + p2b) / 2; // = (9/48)(m2 - m1), (9/48)(m1 + m2)
  return {
    pin1: m1, pin2: m2, idl1: -(9 / 48) * m1, idl2: -(9 / 48) * m2,
    chA: K * m1, chB: -K * m1, p1f, p1b, p2f, p2b, car1, car2,
    spd1: -(p1f - car1) / 2, spd2: -(p2f - car2) / 2, // spider on its pin, relative to its carrier (14T:28T)
    wormsh: -2 * car1, // 28T bevel on carrier 1 -> 14T bevel on the worm shaft
    fourbar: car1 / 14, // single-start worm into the 28T worm wheel: carrier 1 / 14 at the driven link
    Bpul: 4 * car2, // 48T on carrier 2 -> 12T at B
    Gpul: (52 / 12) * car2,
  };
}
export const MOTOR_RPM = 5800; // goBILDA 5000-0002-0001, tested no-load speed at 12 V
export const F_RATIO = 4 * 12 / 38; // roller drive at F per turn of carrier 2 (belt path, all 12T through the joints)

// ------------------------------------------------------------------ 4-bar kinematics
const A = AX.A, B = AX.B, C0 = AX.C0, D0 = AX.D0;
const LAC = Math.hypot(C0[0] - A[0], C0[1] - A[1]);
const LBD = Math.hypot(D0[0] - B[0], D0[1] - B[1]);
const LCD = Math.hypot(D0[0] - C0[0], D0[1] - C0[1]);
export const THETA0 = Math.atan2(C0[1] - A[1], C0[0] - A[0]); // 93.18 deg: the CAD pose (transfer)
const PSI0 = Math.atan2(D0[1] - B[1], D0[0] - B[0]);
// Endstops (Jerry, Sept 26: the 4-bar goes all the way to its endstops on either side). Found by
// sweeping the linkage and everything it carries against every static part of the CAD in fine
// steps (surface samples, /home/claude/work/ftc-decode-concept/cad/endstops*.py): on each side the
// first thing the linkage lands on is the last 48 mm wheel in the row along that side of the robot,
// under the back end of the coupler where the arm servos sit. Right: driven link at 21.4 deg
// (coupler 86.9 mm out, 71.0 mm down, tilted 16.2 deg); left: 176.6 deg (86.8 mm, 70.8 mm, 16.1
// deg). Nothing on the links or the coupler touches anything before that. The two tray arms are
// held in their CAD pose on the coupler (their servo angles are not in the CAD): from about 33 deg
// (right) and 159 deg (left) their roller wheels overlap the side wheel rows.
export const THETA_RIGHT = 21.4 * DEG, THETA_LEFT = 176.6 * DEG;
/** driven link angle (rad, from +x) -> { C, D (mm), phi: coupler tilt, psi: passive link turn } */
export function solve(th) {
  const C = [A[0] + LAC * Math.cos(th), A[1] + LAC * Math.sin(th)];
  const dx = C[0] - B[0], dy = C[1] - B[1], d = Math.hypot(dx, dy);
  const a = (LBD * LBD - LCD * LCD + d * d) / (2 * d), h = Math.sqrt(Math.max(0, LBD * LBD - a * a));
  const px = B[0] + (a * dx) / d, py = B[1] + (a * dy) / d;
  const c1 = [px - (h * dy) / d, py + (h * dx) / d], c2 = [px + (h * dy) / d, py - (h * dx) / d];
  const D = c1[1] > c2[1] ? c1 : c2; // the branch with D above B
  return { C, D, phi: Math.atan2(D[1] - C[1], D[0] - C[0]), psi: Math.atan2(D[1] - B[1], D[0] - B[0]) - PSI0 };
}

// ------------------------------------------------------------------ loading and rigging
const GROUPS = ['wheel0', 'wheel1', 'wheel2', 'wheel3', 'mpul0', 'mpul1', 'mpul2', 'mpul3', 'omni0', 'omni1', 'omni2', 'omni3',
  'pin1', 'pin2', 'idl1', 'idl2', 'chA', 'chB', 'p1f', 'p1b', 'p2f', 'p2b', 'car1', 'spd1', 'car2', 'spd2', 'wormsh',
  'linkA', 'linkP', 'idler', 'Bpul', 'belt1', 'belt2', 'belt3', 'belt4', 'belt5', 'beltS', 'beltP', 'Gpul', 'Dpul', 'Epul', 'Fpul',
  'armL', 'armR', 'cplr', 'turret', 'ring', 'shell', 'sidewheels', 'walls', 'plates', 'ramps', 'bottom', 'top'];

export async function loadRobot(stage) {
  const model = await stage.load(MODEL);
  const P = {};
  for (const g of GROUPS) {
    const n = stage.part(new RegExp(`^anim_dcc_\\d+_${g}$`), model)[0];
    if (!n) throw new Error(`ftc-decode-two-sided: part ${g} not found`);
    P[g] = n;
  }
  // the static parts, merged by material into unnamed meshes
  const body = model.children.filter((c) => !/^anim_/.test(c.name));
  return { model, P, body };
}

/**
 * Pivots every moving group about its real axis. Nested: parts riding on a moving link are pivoted
 * inside that link's pivot, created while the model is still in its CAD pose.
 */
export function rigRobot(stage, P, which = {}) {
  const piv = {};
  const zAt = (name, [x, y]) => (piv[name] = stage.pivot(P[name], mm(x, y, 0), Z));
  if (which.pto !== false) {
    zAt('pin1', AX.M1); zAt('pin2', AX.M2); zAt('idl1', AX.I1); zAt('idl2', AX.I2);
    zAt('chA', AX.CA); zAt('chB', AX.CB);
    zAt('p1f', AX.P1); zAt('p1b', AX.P1); zAt('p2f', AX.P2); zAt('p2b', AX.P2);
    zAt('car1', AX.P1); zAt('car2', AX.P2); zAt('Bpul', AX.B); zAt('Gpul', AX.G);
    // spiders ride on their carriers and turn on the cross pins (along x)
    piv.spd1 = stage.pivot(P.spd1, mm(AX.P1[0], AX.P1[1], SPIDER_Z[0]), X);
    piv.spd2 = stage.pivot(P.spd2, mm(AX.P2[0], AX.P2[1], SPIDER_Z[1]), X);
    piv.car1.attach(piv.spd1); piv.car2.attach(piv.spd2);
    piv.wormsh = stage.pivot(P.wormsh, mm(0, WORM.y, WORM.z), X);
  }
  // 4-bar: driven link (with the worm wheel) about A, passive link about B, coupler placed from C and D
  zAt('linkA', AX.A);
  zAt('linkP', AX.B);
  piv.idler = stage.pivot(P.idler, mm(...AX.IDL, 0), Z);
  piv.linkP.attach(piv.idler);
  piv.linkP.attach(P.belt2); piv.linkP.attach(P.belt3);
  piv.cplr = stage.pivot([P.cplr, P.armL, P.armR, P.belt4, P.belt5], mm(...AX.C0, 0), Z);
  for (const [n, at] of [['Dpul', AX.D0], ['Epul', AX.E], ['Fpul', AX.F]]) {
    piv[n] = stage.pivot(P[n], mm(...at, 0), Z);
    piv.cplr.attach(piv[n]);
  }
  piv.cplrHome = piv.cplr.position.clone();
  if (which.drive) {
    for (let i = 0; i < 4; i++) {
      zAt(`wheel${i}`, AX.WHEEL);
      zAt(`mpul${i}`, i % 2 ? AX.MP2 : AX.MP1);
    }
  }
  if (which.turret) piv.turret = stage.pivot(P.turret, mm(AX.TURRET[0], 0, AX.TURRET[1]), Y);

  const rig = {
    piv,
    theta: THETA0,
    kin: solve(THETA0),
    /** place the 4-bar at driven link angle th (rad) */
    setFourbar(th) {
      const k = solve(th);
      rig.theta = th; rig.kin = k;
      piv.linkA.setAngle(th - THETA0);
      piv.linkP.setAngle(k.psi);
      piv.cplr.setAngle(k.phi);
      piv.cplr.position.copy(piv.cplrHome).add(new THREE.Vector3((k.C[0] - C0[0]) / 1000, (k.C[1] - C0[1]) / 1000, 0));
      stage.invalidate();
      return k;
    },
    /**
     * Pulleys of the roller path for a given carrier 2 angle: each pulley's absolute angle, set
     * relative to the link that carries it. All pulleys from B to E are 12T, so they turn with B.
     */
    setRollerPath(car2) {
      const b = 4 * car2, { phi, psi } = rig.kin;
      piv.Bpul?.setAngle(b);
      piv.idler.setAngle(b - psi);
      piv.Dpul.setAngle(b - phi);
      piv.Epul.setAngle(b - phi);
      piv.Fpul.setAngle((12 / 38) * (b - phi));
      piv.Gpul?.setAngle((52 / 12) * car2);
    },
  };
  return rig;
}

// ------------------------------------------------------------------ looks
/**
 * Per-group opacity and tint, set every scroll frame but written only when a value changes.
 * Materials are copied once per group with stage.cloneMaterial, so section caps keep working and
 * other groups keep theirs. look(name | object | array, opacity, color, strength).
 */
export function looks(stage) {
  const st = new Map();
  const black = new THREE.Color(0), tmp = new THREE.Color();
  function prep(obj) {
    if (st.has(obj)) return st.get(obj);
    const mats = [], meshes = [];
    obj.traverse((m) => {
      if (!m.isMesh) return;
      meshes.push(m);
      const list = [].concat(m.material).map((x) => { const c = stage.cloneMaterial(x); mats.push(c); return c; });
      m.material = list.length === 1 ? list[0] : list;
    });
    const s = { obj, mats, meshes, o: 1, key: '' };
    st.set(obj, s);
    return s;
  }
  function look(objs, o = 1, color = null, k = 0) {
    for (const obj of [].concat(objs)) {
      if (!obj) continue;
      const s = prep(obj);
      o = Math.round(o * 200) / 200;
      if (o !== s.o) {
        const wasT = s.o < 1, isT = o < 1;
        s.o = o;
        obj.visible = o > 0.004;
        for (const m of s.mats) { m.opacity = o; m.transparent = isT; m.depthWrite = !isT; if (wasT !== isT) m.needsUpdate = true; }
        for (const m of s.meshes) m.castShadow = !isT;
        stage.invalidate();
      }
      const key = color && k > 0.004 ? `${color}|${Math.round(k * 100)}` : '';
      if (key !== s.key) {
        s.key = key;
        if (key) tmp.set(color).multiplyScalar(Math.round(k * 100) / 100); else tmp.copy(black);
        for (const m of s.mats) if (m.emissive) { m.emissive.copy(tmp); m.emissiveIntensity = 1; }
        stage.invalidate(false);
      }
    }
  }
  return look;
}

// ------------------------------------------------------------------ scroll helpers
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Camera views framed once with everything at rest and cached per canvas aspect; place(a, b, k)
 * blends between two cached views along a sphere about the target (never re-framed on moving parts).
 * defs: { key: () => ({ pos, target }) } built with stage.frame(..., { apply: false, refresh: true }).
 */
export function viewSet(stage, el, defs) {
  let cache = null, aspect = 0;
  const sph = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  const get = (key) => {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!cache || a !== aspect) { aspect = a; cache = {}; }
    return (cache[key] ||= sph(defs[key]()));
  };
  const sp = new THREE.Spherical();
  function place(ka, kb, k, drift = 0) {
    const a = get(ka), b = get(kb);
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }
  return { place, get };
}

/** An invisible box (model metres) to frame a view on, instead of parts that move. */
export function frameBox(size, center) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size));
  m.position.set(...center);
  m.updateMatrixWorld();
  return m;
}

/**
 * A small readout on the stage: rows of label and value, written only when a value changes. With
 * `mini`, phones show only the one-line summary (key 'mini') instead of the rows.
 */
export function hud(layer, rows, mini = false) {
  const el = document.createElement('div');
  el.className = 'rx-hud';
  el.innerHTML = rows.map(([k, label, x]) => `<div class="rx-hud-row${x || mini ? ' rx-hud-x' : ''}"><span>${label}</span><b class="num" data-k="${k}"></b></div>`).join('')
    + (mini ? '<div class="rx-hud-mini num" data-k="mini"></div>' : '');
  layer.append(el);
  const K = Object.fromEntries([...el.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  return {
    el,
    put(k, text) { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } },
  };
}
export const fmt = (v) => Math.round(v).toLocaleString('en-US');

/** Belt path of two pulleys (centres in mm, radii in mm) as a closed CCW loop, resampled every `step` mm. */
export function beltLoop(c1, r1, c2, r2, step = 4) {
  const pts = [];
  for (const [c, r] of [[c1, r1], [c2, r2]]) for (let i = 0; i < 180; i++) { const a = (i / 180) * Math.PI * 2; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const hull = lo.slice(0, -1).concat(hi.slice(0, -1)); // counter-clockwise
  const seg = [], len = [0];
  for (let i = 0; i < hull.length; i++) { const a = hull[i], b = hull[(i + 1) % hull.length]; seg.push([a, b]); len.push(len[len.length - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = len[len.length - 1];
  const at = (s) => {
    s = ((s % L) + L) % L;
    let i = 0; while (len[i + 1] < s) i++;
    const [a, b] = seg[i], t = (s - len[i]) / (len[i + 1] - len[i] || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  return { L, at, count: Math.max(8, Math.round(L / step)) };
}

// GT2: 2 mm pitch, so a pulley's pitch radius is teeth / pi mm. Dots ride just outside the belt's back.
export const pitchR = (teeth) => teeth / Math.PI;
export const BELTS = {
  // name: [pulley 1 centre, teeth, pulley 2 centre, teeth, z of the belt (mm), group that carries it]
  belt1: [AX.P2, 48, AX.B, 12, -262.4, 'ground'],
  belt2: [AX.B, 12, AX.IDL, 12, -291.4, 'linkP'],
  belt3: [AX.IDL, 12, AX.D0, 12, -282.4, 'linkP'],
  belt4: [AX.D0, 12, AX.E, 12, -291.4, 'cplr'],
  belt5: [AX.E, 12, AX.F, 38, -405.9, 'cplr'],
  beltS: [AX.P2, 52, AX.G, 12, -252.6, 'ground'],
  beltP: [AX.P1, 30, AX.P2, 30, -281.1, 'ground'],
};

/**
 * Moving dots on a belt (annotation, not CAD): an InstancedMesh parented to the group that carries
 * the belt. set(s) moves the dots s mm along the belt (positive = the way pulley 1 turns for +angle).
 */
export function beltDots(name, parent, color = '#ff2bd6', radius = 1.25) {
  const [c1, t1, c2, t2, z] = BELTS[name];
  const loop = beltLoop(c1, pitchR(t1) + 1.6, c2, pitchR(t2) + 1.6, 5);
  const geo = new THREE.SphereGeometry(radius / 1000, 10, 8);
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, loop.count);
  mesh.name = `dots:${name}`;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4();
  // the parent pivot group sits at its pivot point: express the dots in its local frame
  parent.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const v = new THREE.Vector3();
  const set = (s) => {
    for (let i = 0; i < loop.count; i++) {
      const p = loop.at(s + (i * loop.L) / loop.count);
      v.set(p[0] / 1000, p[1] / 1000, z / 1000).applyMatrix4(inv);
      m.makeTranslation(v.x, v.y, v.z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  set(0);
  parent.add(mesh);
  return { mesh, set, r1: pitchR(t1), dispose() { mesh.removeFromParent(); geo.dispose(); mat.dispose(); } };
}


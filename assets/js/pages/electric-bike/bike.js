// Shared rig for the Electric Bike demos: loads Jerry's final CAD, sorts its parts into groups by
// their CAD names, pivots every rotating part about its real axis and drives the whole drivetrain
// from one number, the motor angle. Everything else follows from the tooth counts in the CAD.
//
// Axes: tools/cad-axes.py on /home/claude/cad_src/ebike_full_ebike_asm.step. Every bore axis in
// the drive runs along STEP Y, which is the model's Z (cad.dir([0, 1, 0]) = [0, 0, -1]), so every
// shaft turns about Z through the point below. Values are the bore centres in STEP millimetres
// (X, -, Z) exactly as cad-axes.py printed them:
//   16T pulley :2 and motor 1 Main Shaft   ('Y', 66.9, -17.5)   8 mm keyway bore, 10 mm shaft
//   16T pulley :1 and motor 2 Main Shaft   ('Y', 58.6, 50.0)
//   72T pulley :2, 20T pulley, 6202 :1/:4  ('Y', -39.8, -24.8)  14 mm keyway bores (jackshaft)
//   72T pulley :1, 6202 :2/:3, spacers     ('Y', 8.3, -94.5)    14 mm keyway bores (output shaft)
//   626-2RS :5..:8 on 91273A813           ('Y', 25.7, 41.5)    6 mm bores (belt 1 idler A)
//   626-2RS :1..:4 on 91273A814           ('Y', 42.8, 13.8)    6 mm bores (belt 1 idler B)
//   698-2RS :1..:6 on 92981A754           ('Y', 8.3, -20.2)    8 mm bores (belt 2 idler)
// The chain sprocket's four bolt holes (cad-axes: (-20.9,-107.6) (-4.7,-65.3) (21.3,-123.8)
// (37.5,-81.5)) are centred on the output axis too.
import { cad } from '/assets/js/lib/stage.js';
import beltPaths from './belts.js';

export const MODEL = '/assets/models/electric-bike/final.glb';
export const MODEL_V1 = '/assets/models/electric-bike/v1.glb';
// the carbon fibre parts (phase A carbon set, /home/claude/work/ebike/demos.md: the one part named
// "cf" and the flat 2 mm and 4 mm plates; the aluminum plates are 3.2 mm), shaded as carbon
export const CARBON = 'motor_mount|4mm_drive_side_bearing_plate|2mm_non_drive_side_bearing_plate|2mm_bearing_retaining_plate|battery_door|cf_CSK_battery_holder|drive_side_static_battery_plate';

// tooth counts (part names, checked against the geometry) and HTD 5M pitch radii in metres
export const T = { motor: 16, big: 72, jack: 20, chain: 20, jockey: 11, belt1: 115, belt2: 84 };
const PITCH = 0.005;
const pr = (teeth) => (teeth * PITCH) / (2 * Math.PI);
export const R16 = pr(16), R20 = pr(20), R72 = pr(72);
const R_IDLER = 0.0095; // 626 and 698 bearings are 19 mm OD; the belt's back rolls on them
export const STAGE1 = T.big / T.motor; // 4.5
export const STAGE2 = T.big / T.jack; // 3.6
export const TOTAL = STAGE1 * STAGE2; // 16.2

const Z = [0, 0, 1]; // model +Z: counterclockwise seen from the non-drive side, the way the rear wheel rolls forward
const at = (x, z) => cad.point([x, 0, z]);
// angle of each axis per radian of motor angle (backside idlers turn the other way)
export const AXES = {
  motor1: { p: at(66.9, -17.5), k: 1 },
  motor2: { p: at(58.6, 50.0), k: 1 },
  jack: { p: at(-39.8, -24.8), k: 1 / STAGE1 },
  output: { p: at(8.3, -94.5), k: 1 / TOTAL },
  idlerA: { p: at(25.7, 41.5), k: -R16 / R_IDLER },
  idlerB: { p: at(42.8, 13.8), k: -R16 / R_IDLER },
  idler2: { p: at(8.3, -20.2), k: -(R20 / R_IDLER) / STAGE1 },
};

// Belt back contours (model metres, x/y at the belt's mid plane), sliced from the belt meshes in the
// CAD (the phase A rig, /home/claude/work/ebike/rig.json). Both run counterclockwise seen from +Z.
// A marker every 5 teeth on belt 1 and every 4 on belt 2 (both divide the tooth count, so the
// pattern closes on itself), long enough to follow by eye without strobing at speed.
export const BELTS = {
  belt1: { z: 0.04108, w: 0.020, teeth: T.belt1, every: 5, file: 'belt1' },
  belt2: { z: -0.01561, w: 0.020, teeth: T.belt2, every: 4, file: 'belt2' },
};

// ------------------------------------------------------------------ part groups, by CAD name
const RULES = [
  ['frame', /rough_bike_frame_mockup/],
  ['battery', /48V_16ah_battery|battery_door|battery_top_bottom_doors|cf_CSK_battery_holder|non_drive_battery_brace|T_Slotted_Framing|Draw_Latch|Component35/],
  ['batteryPlate', /drive_side_static_battery_plate|polycarb_battery_plate_adapter/],
  ['plateND', /non_drive_side_plate|2mm_non_drive_side_bearing_plate/],
  ['plateD', /drivetrain_side_plate|4mm_drive_side_bearing_plate/],
  ['retainer', /2mm_bearing_retaining_plate/],
  ['motorMount', /motor_mount/],
  ['brackets', /seat_tube_mount|_0_1_1_93_/],
  ['idlerMount', /polycarb_idler_mount|pc_static_idler_mount/],
  ['standoffs', /Hex_Standoff/],
  ['motorCase', /Front_Plate|Wire_Exit|Stator_Mount/],
  ['stator', /Stator_Lamination_Stack/],
  ['magnets', /Magnet_Array/],
  ['rotor', /Rotor_End_Cap|Rotor_Housing|Main_Shaft/],
  ['pulley16', /16t_21mm_Pulley/],
  ['pulley72o', /72t_21mm_Pulley_14mm_Keyway_Bore_1$/],
  ['pulley72j', /72t_21mm_Pulley_14mm_Keyway_Bore_2$/],
  ['pulley20', /20t_21mm_Pulley/],
  ['sprocket', /20t_sprocket/],
  ['hub', /RobotShop|sprocket_hub_adapter_plate|hub_sprocket_spacer/],
  ['printed', /3dp_spacer/],
  ['bearing6202', /6202_14_2RS/],
  ['idlerBearings', /626_2RS|698_2RS/],
  ['idlerHardware', /Shoulder_Screw|PATIKIL|uxcell/],
  ['belt1', /two_idler_ebike_motors_belt/],
  ['belt2', /ebike_driveside_belt/],
  ['jockey', /Jockey_Wheel/],
];
export const ROTATING = ['magnets', 'rotor', 'pulley16', 'pulley72j', 'pulley72o', 'pulley20', 'sprocket', 'hub', 'printed', 'idlerBearings'];

/**
 * Load the final CAD into a stage and rig it. Returns { model, groups, set(motorAngle), meshes,
 * look(name, { opacity, tint, tintI }) } where groups maps a group name to its top-level parts.
 */
export async function loadBike(stage, url = MODEL) {
  const { THREE } = stage;
  const model = await stage.load(url, { carbon: new RegExp(CARBON) });
  const groups = {};
  const nodes = model.children.slice();
  const center = new THREE.Vector3();
  for (const n of nodes) {
    const name = n.name.replace(/^anim_eb_\d+_/, '');
    const rule = RULES.find(([, rx]) => rx.test(name));
    const g = rule ? rule[0] : 'other';
    (groups[g] ||= []).push(n);
    new THREE.Box3().setFromObject(n).getCenter(center);
    n.userData.c = center.clone();
  }
  // Every mesh gets its own material so a group can fade or light up by itself. Black parts are
  // lifted a little so they read against the dark stage (their color stays black-ish).
  const meshes = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    meshes.push(o);
  });
  liftBlacks(model);

  // Rotating parts go to the axis whose (x, y) is within 3 mm of the part's centre.
  const pivots = {};
  const onAxis = {};
  for (const g of ROTATING) {
    for (const n of groups[g] || []) {
      const c = n.userData.c;
      const hit = Object.entries(AXES).find(([, a]) => Math.hypot(c.x - a.p[0], c.y - a.p[1]) < 0.003);
      if (hit) (onAxis[hit[0]] ||= []).push(n);
    }
  }
  for (const [id, parts] of Object.entries(onAxis)) {
    const a = AXES[id];
    pivots[id] = stage.pivot(parts, [a.p[0], a.p[1], 0], Z);
  }
  // The jockey wheel is round about its axle, so its bounding-box centre is on the axis. The chain
  // turns it at 20/11 of the sprocket speed; which way depends on the chain's path around it.
  if (groups.jockey) pivots.jockey = stage.pivot(groups.jockey, 'center', Z);

  // belt markers: dashes one tooth apart on both side faces of each belt, moving with the belt
  const overlay = new THREE.Group();
  overlay.name = 'belt markers (annotation)';
  stage.scene.add(overlay);
  const markers = {};
  for (const [id, b] of Object.entries(BELTS)) {
    markers[id] = beltMarker(THREE, beltPaths[b.file], b);
    overlay.add(markers[id].mesh);
  }

  let motorAngle = 0;
  // The chain wraps over the top of the drive sprocket and under the jockey (photo v1-chain-wrap and
  // Jerry's routing sketch), so the jockey turns against the sprocket.
  const jockeySign = -1;
  function set(theta) {
    motorAngle = theta;
    for (const [id, pv] of Object.entries(pivots)) {
      if (id === 'jockey') pv.setAngle(jockeySign * theta * (T.chain / T.jockey) / TOTAL);
      else pv.setAngle(theta * AXES[id].k);
    }
    // teeth that have passed a point on each belt: 16 per motor turn on belt 1, 20 per jackshaft turn on belt 2
    markers.belt1.setTeeth((theta * T.motor) / (2 * Math.PI));
    markers.belt2.setTeeth((theta / STAGE1) * T.jack / (2 * Math.PI));
    stage.invalidate();
  }

  // looks: per group opacity and emissive tint. tint is a color and tintI its strength, or
  // emissive is a ready THREE.Color (for blending two tints).
  const tintC = new THREE.Color();
  function look(name, { opacity = 1, tint = null, tintI = 0.5, emissive = null } = {}) {
    if (!emissive && tint && tintI > 0) emissive = tintC.set(tint).multiplyScalar(tintI);
    for (const n of groups[name] || []) paint(n, opacity, emissive);
  }
  function paint(n, opacity, emissive) {
    n.visible = opacity > 0.01;
    n.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      const want = opacity < 0.999;
      if (m.transparent !== want) { m.transparent = want; m.needsUpdate = true; }
      m.opacity = opacity;
      m.depthWrite = !want;
      if (m.emissive) {
        if (emissive) m.emissive.copy(emissive);
        else m.emissive.set(0);
        m.emissiveIntensity = 1;
      }
    });
  }
  set(0);
  return { model, groups, pivots, markers, overlay, set, look, paint, get angle() { return motorAngle; } };
}

/** Near-black CAD colors are lifted a little so black parts read against the dark stage. */
export function liftBlacks(model) {
  const done = new Set();
  model.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (done.has(m) || !m.color) continue;
      done.add(m);
      if (m.color.r < 0.004 && m.color.g < 0.004 && m.color.b < 0.004) m.color.setScalar(0.012);
    }
  });
}

// A flat ribbon on each side face of a belt, 1.2 mm deep, with a dash every few teeth. It lies in the
// belt's own face plane, so it hides behind the pulley flanges exactly as paint on the belt would.
function beltMarker(THREE, pts, b) {
  const n = pts.length;
  const pos = [], uv = [], idx = [];
  let s = 0;
  const len = [0];
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1], c = pts[i % n];
    s += Math.hypot(c[0] - a[0], c[1] - a[1]);
    len.push(s);
  }
  const total = s;
  const faces = [b.z + b.w / 2 + 0.0003, b.z - b.w / 2 - 0.0003];
  for (const z of faces) {
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n], o = pts[(i - 1 + n) % n];
      let tx = q[0] - o[0], ty = q[1] - o[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = -ty, ny = tx; // inward normal for a counterclockwise loop
      const u = (len[i] / total) * (b.teeth / b.every);
      pos.push(p[0] + nx * 0.0004, p[1] + ny * 0.0004, z, p[0] + nx * 0.0016, p[1] + ny * 0.0016, z);
      uv.push(u, 0, u, 1);
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  // dash texture: two teeth long, then a gap
  const W = 40, on = Math.round((2 / b.every) * W), data = new Uint8Array(W * 4);
  for (let i = 0; i < W; i++) { const a = i < on ? 255 : 0; data.set([a, a, a, 255], i * 4); }
  const tex = new THREE.DataTexture(data, W, 1);
  tex.wrapS = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ color: '#fff1e2', alphaMap: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return {
    mesh,
    // the pattern moves toward increasing u (the belt's running direction) as teeth pass
    setTeeth(t) { tex.offset.x = -((t / b.every) % 1e6); },
    setOpacity(a) { mat.opacity = a; mesh.visible = a > 0.01; },
  };
}

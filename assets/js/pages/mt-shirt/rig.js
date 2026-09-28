// The Monkeytype shirt mechanism, rigged from Jerry's CAD (monkeytype merch v22). Shared by the
// two scrollies on the page:
//   explode.js     the closed box opening into the pose printed on the shirt
//   drivetrain.js  one push of the servo through the bevel pair, belt, spur gears and slider-crank
//
// The GLB is his CAD exactly as exported: his semi-exploded "shirt" pose, where every layer was
// lifted straight up (STEP +Z; the corner guide lines and the shaft lines are vertical). The closed
// pose moves each group back down along that same axis by the distance its mating features give
// (servo tab holes onto the tub wall holes, standoffs and rail on the tub floor, lid ring on the
// rim, web plate on the standoff tops); see /home/claude/work/monkeytype-merch/demos.md.
//
// Part names are the CAD names as tools/optimize-cad.mjs keeps them (anim_mt_<n>_<name>, with
// every character that is not a letter or digit turned into "_"). Coordinates in comments are
// STEP millimetres, Z up; cad.point / cad.dir convert them to the model's metres, Y up.
import { cad } from '/assets/js/lib/stage.js';

export const MODEL = '/assets/models/mt-shirt/mechanism.glb';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;

// Explode groups: dz is the move along STEP Z from the CAD pose to the closed box (mm); win is when
// the group lifts in the hero scroll (fraction of the whole scrolly), top down like an assembly manual.
export const GROUPS = [
  { key: 'lidScrews', re: /_M4_x_10_csk_machine_screw_v1_(9|1[0-2])$/, dz: -90.6, win: [0.25, 0.38] },
  { key: 'logo', re: /_Component(58|63)_1$/, dz: -90, win: [0.28, 0.42] },
  { key: 'web', re: /_Component68_1$/, dz: -60, win: [0.32, 0.46] },
  { key: 'bars', re: /_Component(56|57|60|61|62)_1$/, dz: -60, win: [0.32, 0.46] },
  { key: 'barScrews', re: /_M4_x_10_csk_machine_screw_v1_[1-8]$/, dz: -60, win: [0.32, 0.46] },
  { key: 'lidRing', re: /_Component59_1$/, dz: -45, win: [0.35, 0.48] },
  { key: 'standoffs', re: /_1501_0006_0240_v1_\d$/, dz: -41, win: [0.5, 0.6] },
  { key: 'servo', re: /_DDJ_|_2317_4008_0024_1$/, dz: -60, win: [0.52, 0.66] },
  { key: 'servoScrews', re: /_2802_0004_0006_v1_[1-4]$/, dz: -40, win: [0.52, 0.66] },
  { key: 'beltStage', re: /_3422_|_monkeybelt_|_2317_4008_0024_2$/, dz: -40.5, win: [0.52, 0.66] },
  { key: 'shafts', re: /_Component7[1-3]_1$/, dz: -10, win: [0.52, 0.66] },
  { key: 'gears', re: /_Spur_Gear_/, dz: -18.5, win: [0.56, 0.68] },
  { key: 'coupler', re: /_Component69_1$/, dz: -18.5, win: [0.56, 0.68] },
  { key: 'plate', re: /_Component52_1$|_2802_0004_0006_v1_5$/, dz: -24, win: [0.56, 0.68] },
  { key: 'plateScrews', re: /_2802_0004_0006_v1_1_[1-4]$/, dz: -30, win: [0.56, 0.68] },
  { key: 'crankScrew', re: /_2802_0004_0006_v1_6$/, dz: -33.5, win: [0.56, 0.68] },
  { key: 'switch', re: /_Bottom_1$|_Top_1$|_Pulsador_|_Pieza5_|_Pin[12]_1$|_Led_|_Component38_1$/, dz: -22.05, win: [0.58, 0.7] },
  { key: 'battery', re: /_Body|_AA_R6_|_Spring_|_Contact_/, dz: -20.1, win: [0.6, 0.72] },
  { key: 'wires', re: /_Component5[45]_1$/, dz: -38.5, win: [0.6, 0.72] },
  { key: 'rail', re: /_LS_MGN7_/, dz: -15, win: [0.6, 0.72] },
  { key: 'railScrews', re: /_2802_0004_0006_v1_1_[56]$/, dz: -30, win: [0.6, 0.72] },
  // the four explode guide lines under the corner screws: hidden while closed, drawn in as the screws lift
  { key: 'guides', re: /_Component6[4-7]_1$/, dz: 0, win: [0.25, 0.33], fade: true },
];

/** Loads the model and sorts its moving parts into GROUPS: { model, parts: { key: [Object3D] }, base: Map(obj -> position) }. */
export async function loadMechanism(stage) {
  const model = await stage.load(MODEL);
  const parts = {};
  const base = new Map();
  const claimed = new Set();
  for (const g of GROUPS) {
    parts[g.key] = stage.part(g.re, model).filter((o) => !claimed.has(o));
    for (const o of parts[g.key]) { claimed.add(o); base.set(o, o.position.clone()); }
  }
  return { model, parts, base };
}

// ------------------------------------------------------------------ the drivetrain (drivetrain.js)
// Axes from the STEP (tools/cad-axes.py), checked against the part bounds in the GLB:
//   servo spline + bevel 1       along +X through (y -26.4, z -14.4)
//   bevel 2 + pulley 1 (20T)     along +Z through (-19.2, -26.4)
//   pulley 2 (20T) + 36T gear    along +Z through (-71.1, 3.6)
//   12T gear + crank arm         along +Z through (-73.4, -26.3)
//   carriage pin                 (-54.4, -50.3); the carriage runs along X on the MGN7 rail
// Linkage from the CAD: crank 31.98 mm (12T axis to crank pin), coupler 33.07 mm (pin to pin), crank
// axis 24.0 mm off the rail line: an offset slider-crank. In the CAD pose the crank pin sits at
// -115.36 degrees about the 12T axis (from STEP +X, counterclockwise seen from above).
//
// One push (Jerry, Sept 27: the rail block pushes the keycap to the end of the switch's travel and
// back), measured on the STEP: the carriage plate's front face (X -40.73) is 33.02 mm behind the
// keycap's top face (X -7.71), the two faces overlapping in Y and Z, so the plate meets the keycap
// 33.02 mm past the CAD pose and then presses keycap and stem (`Pulsador`) along +X by the switch's
// 4 mm total travel (Cherry's published value: the switch model in the CAD is simplified and has no
// working stop; pressed 4 mm, its keycap skirt still clears the housing by 1.3 mm, measured). The
// push starts with the block's back end at the rail's back end (X -77.73), 18.83 mm behind the CAD
// pose, so the carriage runs 55.85 mm. Servo angle phi: 0 at the start, PHI_CAD = 15 in the CAD pose
// (every offset zero), STROKE_DEG = 38.79 at the bottom of the key's travel (crank at -44.0 degrees,
// 22 degrees short of the linkage's dead point at -21.65). At the bottom the block's front end is
// 8.5 mm past the rail's front end (X -7.73), as the CAD's geometry makes it.
export const AX = {
  servo: { p: [0, -26.4, -14.4], d: [1, 0, 0] },
  bevel: { p: [-19.2, -26.4, 0], d: [0, 0, 1] },
  spur36: { p: [-71.1, 3.6, 0], d: [0, 0, 1] },
  spur12: { p: [-73.4, -26.3, 0], d: [0, 0, 1] },
  pin: { p: [-54.4, -50.3, 0], d: [0, 0, 1] },
};
export const CRANK = 31.98, LINK = 33.07, RAIL_Y = -50.3, THETA0 = -115.36;
export const PHI_CAD = 15;          // servo degrees from the start of the push to the CAD pose
export const KEY_GAP = 33.02;       // carriage plate to keycap face in the CAD pose, mm
export const KEY_TRAVEL = 4;        // Cherry MX total travel, mm
export const STROKE_DEG = 38.788;   // servo degrees for the whole push, to the bottom of the key's travel

/** Slider-crank at servo angle phi (0..STROKE_DEG; PHI_CAD = the CAD pose): crank angle, crank pin, carriage pin. */
export function linkage(phi) {
  const u = phi - PHI_CAD;
  const th = (THETA0 + 3 * u) * DEG; // the 12T turns three times as far as the 36T, the other way
  const px = AX.spur12.p[0] + CRANK * Math.cos(th), py = AX.spur12.p[1] + CRANK * Math.sin(th);
  const dy = RAIL_Y - py;
  const sx = px + Math.sqrt(LINK * LINK - dy * dy);
  return { u, theta: THETA0 + 3 * u, px, py, sx, psi: Math.atan2(dy, sx - px) / DEG };
}
const REST = linkage(PHI_CAD);
const START = linkage(0).sx;
export const TRAVEL = linkage(STROKE_DEG).sx - START; // 55.85 mm
/** Carriage travel from the start of the push (mm) and how far the key is pressed (0..KEY_TRAVEL mm). */
export function travel(k) {
  const dx = k.sx - REST.sx;
  return { car: k.sx - START, key: clamp(dx - KEY_GAP, 0, KEY_TRAVEL) };
}

/**
 * Rigs the drivetrain on a loaded mechanism. Returns set(phi): every part placed for servo angle
 * phi, a pure function of phi (phi = PHI_CAD is the CAD pose, every offset zero).
 */
export function rigDrivetrain(stage, mech) {
  const P = mech.parts;
  // find every part before any pivot exists: a pivot group is named after its first part and would
  // match these patterns too
  const byName = (re) => stage.part(re, mech.model);
  const L = {
    servo: byName(/_DDJ_STDLOW_GEAR6_|_2317_4008_0024_1$/),
    bevel: byName(/_2317_4008_0024_2$|_3422_0006_0020_core_1$|_3422_series_barrel_1$|_3422_series_flange_1$/),
    spur36: byName(/_3422_0006_0020_core_2$|_3422_series_barrel_2$|_3422_series_flange_2$|_Spur_Gear_36_teeth_/),
    spur12: [...byName(/_Spur_Gear_12_teeth_/), ...P.crankScrew],
    carriage: [...byName(/_LS_MGN7_Block_/), ...P.plate, ...P.plateScrews],
    key: byName(/_Component38_1$|_Pulsador_/), // keycap and stem, pressed along +X together
  };
  const piv = (list, ax) => stage.pivot(list, cad.point(ax.p), cad.dir(ax.d));
  const servo = piv(L.servo, AX.servo);
  const bevel = piv(L.bevel, AX.bevel);
  const spur36 = piv(L.spur36, AX.spur36);
  const spur12 = piv(L.spur12, AX.spur12);
  const coupler = piv(P.coupler, AX.pin);
  const couplerBase = coupler.position.clone();
  const carriage = L.carriage;
  const carBase = carriage.map((o) => o.position.clone());
  const key = L.key;
  const keyBase = key.map((o) => o.position.clone());
  let last = null;
  function set(phi) {
    if (phi === last) return linkage(phi);
    last = phi;
    const k = linkage(phi);
    const dx = (k.sx - REST.sx) / 1000; // metres along STEP X, which is model X
    const dk = travel(k).key / 1000;
    servo.setAngle(-k.u * DEG);
    bevel.setAngle(-k.u * DEG);
    spur36.setAngle(-k.u * DEG);
    spur12.setAngle(3 * k.u * DEG);
    coupler.setAngle((k.psi - REST.psi) * DEG);
    coupler.position.set(couplerBase.x + dx, couplerBase.y, couplerBase.z);
    carriage.forEach((o, i) => o.position.set(carBase[i].x + dx, carBase[i].y, carBase[i].z));
    key.forEach((o, i) => o.position.set(keyBase[i].x + dk, keyBase[i].y, keyBase[i].z));
    stage.invalidate();
    return k;
  }
  return { set, groups: { servo, bevel, spur36, spur12, coupler }, carriage };
}

// ------------------------------------------------------------------ cameras
/** Spherical form of a framed view, for blending between cached views without cutting through the model. */
export function sph(THREE, v) {
  return { t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) };
}
/** Camera between cached views a and b (k 0..1), plus extra azimuth dAz and elevation dEl in degrees. */
export function place(stage, a, b, k, dAz = 0, dEl = 0) {
  const { THREE } = stage;
  let dT = b.s.theta - a.s.theta;
  while (dT > Math.PI) dT -= 2 * Math.PI;
  while (dT < -Math.PI) dT += 2 * Math.PI;
  const target = a.t.clone().lerp(b.t, k);
  const phi = clamp(lerp(a.s.phi, b.s.phi, k) - dEl * DEG, 0.05, Math.PI - 0.05);
  const s = new THREE.Spherical(lerp(a.s.radius, b.s.radius, k), phi, a.s.theta + dT * k + dAz * DEG);
  stage.setView({ pos: new THREE.Vector3().setFromSpherical(s).add(target), target });
}

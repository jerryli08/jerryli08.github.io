// Shared rig for the FRC REBUILT robot scrollies: loads Jerry's final CAD, gives the polycarbonate
// its clear look and the bumpers their blue, and builds every moving part about its real axis.
//
// Model: /assets/models/frc-rebuilt/robot.glb, made by /home/claude/work/2856-frc-rebuilt/bake-robot.mjs
// from the raw GLB of his final assembly: fasteners dropped (screws, nylock nuts, retaining rings),
// the parts that move separately baked into one named node each (anim_frc_<group>, the CAD nodes
// listed there), the four MAXSwerve modules stored as two and placed twice, everything else merged
// by material, 0.6 mm tessellation tolerance (1.2 mm inside the swerve modules). The bumper foam is
// its own node only so it can be blue like the real bumpers (the CAD has it black).
//
// Frame: metres, +Y up, +Z is the robot's front (intake), -Z the back (shooters); the floor is at
// y = -0.066. Every axis is parallel to the model's X axis (y, z below):
//   pivot    0.2111, -0.0083  tools/cad-axes.py: the REV-21-2810 pivot axle and the 40T sprocket
//                             (STEP Y 8.3, Z 211.1 mm)
//   roller   0.0771,  0.2657  midway between the arm plates' two bearing bolt holes
//   motor    0.0593, -0.2000  the roller NEO 2.0's 12T pulley (WCP-1017)
//   gearbox  0.1186, -0.1206  the MAXPlanetary output; its WCP-0576 sprocket has 12 #25 seats
//   encoder  0.2170, -0.0813  WCP-0581, 24 #25 seats, on the Through Bore Encoder's shaft; it
//                             presses on the outside of the chain, so it turns the other way
//   hinge    0.3725,  0.3280  the top hopper panel's live joint: one bolt through each "1 hole
//                             LIVE JOINT" angle and the side panel (STEP Y -328.0, Z 372.5)
//   lower    0.2065, -0.4240  transfer shafts and flywheel shafts (1/2 in hex, centred)
//   upper    0.2985, -0.4320
//   flywheel 0.3770, -0.4210
import * as THREE from 'three';

export const MODEL = '/assets/models/frc-rebuilt/robot.glb';
export const FLOOR = -0.066;
export const DEG = Math.PI / 180;
export const AX = {
  pivot: [0.2111, -0.0083], roller: [0.0771, 0.26565], motor: [0.0593, -0.2], gearbox: [0.1186, -0.1206],
  encoder: [0.217, -0.0813], hinge: [0.3725, 0.328], lower: [0.2065, -0.424], upper: [0.2985, -0.432], fly: [0.377, -0.421],
};
export const LANES = [0.1265, 0.2955, 0.4635]; // lane centres (x) between the shooter plates
export const FUEL_R = 0.075; // REBUILT fuel, 150 mm
export const WOOD_Z = 0.0443; // inner face of the front bumper wood (z), from the CAD
// Stowed: the smallest swing that puts every part of the arm behind the inner face of the bumper
// wood (computed on the CAD's triangles: 132 degrees, limited by the arm plate). Negative swings
// the roller up and back.
export const STOW = -132 * DEG;

// The sprung top hopper panel. It sits in front of the side panels' front edges, which are its stop
// when it is open, so it can only fold forward, away from the hopper (positive about +X, the
// opposite sense to the stow). Checked on the CAD's triangles (voxels of 1.5 to 2 mm):
//  - it stays fully open until the arm is 106 degrees up, then folds just ahead of the shooters and
//    the transfer as the arm comes over, keeping at least 5.7 mm clear of them all the way;
//  - stowed (132 degrees) it lies folded 101 degrees, 6 mm clear of the shooter parts and 3 mm
//    clear of the top edge of the front panels, which stop it at about 107 degrees.
// knots: [arm swing, degrees up; panel fold, degrees]
const FOLD = [[106, 0], [113, 16], [114, 24], [115, 30], [116, 36], [117, 41], [118, 46], [119, 50], [120, 55], [122, 63], [124, 71], [126, 79], [128, 87], [130, 94], [131.3, 99], [132, 101]];
export const FOLD_STOWED = 101;
/** fold of the top panel (radians, positive = forward) for an arm angle (radians, STOW..0) */
export function foldFor(arm) {
  const s = -arm / DEG;
  if (s <= FOLD[0][0]) return 0;
  if (s < FOLD[1][0]) { const t = (s - FOLD[0][0]) / (FOLD[1][0] - FOLD[0][0]); return FOLD[1][1] * t * t * (3 - 2 * t) * DEG; }
  for (let i = 1; i < FOLD.length - 1; i++) {
    const [s0, f0] = FOLD[i], [s1, f1] = FOLD[i + 1];
    if (s <= s1) return (f0 + ((f1 - f0) * (s - s0)) / (s1 - s0)) * DEG;
  }
  return FOLD_STOWED * DEG;
}
/** a point on the top panel (y, z as modelled, open and deployed) for an arm angle */
export function onPanel(y, z, arm) {
  const f = foldFor(arm);
  const [y1, z1] = rot(y, z, AX.hinge, f);
  return rot(y1, z1, AX.pivot, arm);
}
/** a point on the arm (y, z in the deployed pose) after the arm turns by a */
export const onArm = (y, z, a) => rot(y, z, AX.pivot, a);
function rot(y, z, c, a) {
  const cs = Math.cos(a), sn = Math.sin(a), dy = y - c[0], dz = z - c[1];
  return [c[0] + cs * dy - sn * dz, c[1] + sn * dy + cs * dz];
}

/** Load the robot into the stage and rig it. Returns handles; every motion is about a CAD axis. */
export async function loadRobot(stage, o = {}) {
  const model = await stage.load(MODEL, o);
  const nodes = new Map();
  const swerve = [];
  model.traverse((n) => {
    const m = /^anim_frc_(.+)$/.exec(n.name);
    if (!m || (n.parent && /^anim_frc_/.test(n.parent.name))) return;
    if (/^SWERVE_/.test(m[1])) swerve.push(n); else nodes.set(m[1], n);
  });
  /** named parts: parts('roller', 'arm') */
  const parts = (...names) => names.flat().flatMap((k) => (k === 'swerve' ? swerve : nodes.has(k) ? [nodes.get(k)] : []));

  // ---- looks: clear polycarbonate (exported as opaque off-white), blue bumper covers
  const clearOf = new Map();
  model.traverse((m) => {
    if (!m.isMesh) return;
    const mat = m.material;
    const c = mat?.color;
    if (!c || Array.isArray(mat)) return;
    // the CAD's polycarbonate colour: base colour factor 0.922 / 0.922 / 0.898
    if (Math.abs(c.r - 0.922) < 0.01 && Math.abs(c.g - 0.922) < 0.01 && Math.abs(c.b - 0.898) < 0.01) {
      if (!clearOf.has(mat)) {
        const k = new THREE.MeshPhysicalMaterial({ color: '#d7e3ea', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.FrontSide });
        k.userData.clear = true;
        clearOf.set(mat, k);
      }
      m.material = clearOf.get(mat);
      m.castShadow = false;
      m.renderOrder = 2;
    }
  });
  const blue = new THREE.MeshStandardMaterial({ color: '#23408e', roughness: 0.85, metalness: 0 });
  for (const b of parts('bumpers')) b.traverse((m) => { if (m.isMesh) m.material = blue; });

  // ---- rig (roller and the folding panel first, so their pivots ride inside the arm's)
  const X = [1, 0, 0];
  const P = (a) => [0, a[0], a[1]];
  const roller = stage.pivot(parts('roller'), P(AX.roller), X);
  const fold = stage.pivot(parts('fold'), P(AX.hinge), X);
  const arm = stage.pivot([...parts('arm', 'rollerBelt'), roller, fold], P(AX.pivot), X);
  const pivotShaft = stage.pivot(parts('pivotShaft'), P(AX.pivot), X);
  const motorPulley = stage.pivot(parts('motorPulley'), P(AX.motor), X);
  const gearboxSprocket = stage.pivot(parts('gearboxSprocket'), P(AX.gearbox), X);
  const encSprocket = stage.pivot(parts('encSprocket'), P(AX.encoder), X);
  const lower = stage.pivot(parts('lower'), P(AX.lower), X);
  const upper = stage.pivot(parts('upper'), P(AX.upper), X);
  const fly = stage.pivot(parts('fly'), P(AX.fly), X);

  const s = { roller: 0, fly: 0, transfer: 0, arm: 0, fold: 0 };
  const applyRoller = () => {
    // with the motor still, the roller keeps its heading while the arm swings (24T to 24T belt
    // from a pulley on the pivot axis), so its angle on the arm is the drive angle minus the arm's
    roller.setAngle(s.roller - s.arm);
    pivotShaft.setAngle(s.roller);
    motorPulley.setAngle(2 * s.roller); // 12T to 24T
  };
  return {
    model, parts, swerve, arm, roller, fold,
    /** arm angle, radians: 0 deployed as modelled, STOW folded up; the top panel follows foldFor */
    setArm(a, f = foldFor(a)) {
      s.arm = a; s.fold = f;
      arm.setAngle(a);
      fold.setAngle(f); // forward, away from the hopper
      gearboxSprocket.setAngle(a * (40 / 12)); // same chain, same sense
      encSprocket.setAngle(-a * (40 / 24)); // on the outside of the chain: the other way
      applyRoller();
    },
    get armAngle() { return s.arm; },
    /** roller surface angle; the motor pulley turns twice as far (12T to 24T, then 24T to 24T) */
    setRoller(a) { s.roller = a; applyRoller(); },
    setTransfer(a) { s.transfer = a; lower.setAngle(a); upper.setAngle(a); },
    setFly(a) { s.fly = a; fly.setAngle(a); },
    state: s,
    /** after a section plane or a highlight re-preps materials as double sided, keep clear parts front sided */
    fixClear() {
      model.traverse((m) => {
        if (!m.isMesh) return;
        for (const mat of [].concat(m.material)) if (mat?.userData?.clear && mat.side !== THREE.FrontSide) { mat.side = THREE.FrontSide; mat.needsUpdate = true; }
      });
      stage.invalidate();
    },
  };
}

/** Fuel balls: one shared geometry and material. */
export function fuelKit() {
  const geo = new THREE.SphereGeometry(FUEL_R, 28, 18);
  const mat = new THREE.MeshStandardMaterial({ color: '#f3c316', roughness: 0.62, metalness: 0 });
  return {
    geo, mat,
    ball() { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// Shared rig for the FRC REBUILT robot demos: loads Jerry's final CAD, gives the polycarbonate
// its clear look and the bumpers their blue, and builds every moving part about its real axis.
//
// Model: /assets/models/frc-rebuilt/robot.glb. Made from the raw GLB of his final assembly with
// /home/claude/work/2856-frc-rebuilt/instance-swerve.mjs (stores the two identical pairs of swerve
// modules once each), tools/optimize-cad.mjs with tools/cad/configs/frc-rebuilt-robot.json
// (fasteners removed, nothing else) and simplify-abs.mjs in the same folder (0.4 mm tolerance). Moving and named
// parts keep their own nodes, called anim_frc_<tag>_<CAD name>; <tag> is the part's place in the
// sorted keepIndices list of that config, then the four swerve modules, so KEEP below must stay
// equal to that list.
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
// The top hopper panel folds inward about its live joint while the arm stows: flat against the
// angles inside the front panel when stowed (180 degrees), unfolded from about 104 degrees of swing
// down. This schedule keeps it clear of the shooters and the transfer at every angle in the CAD.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const foldFor = (arm) => Math.PI * smooth(104, 130, -arm / DEG);

// sorted keepIndices of tools/cad/configs/frc-rebuilt-robot.json (input GLB node indices)
const KEEP = [2, 3, 4, 5, 6, 7, 12, 13, 14, 15, 20, 23, 27, 30, 35, 36, 39, 122, 124, 125, 126, 139, 140, 150, 152, 154, 157, 158, 159, 184, 185, 186, 189, 1455, 1456, 1457, 1458, 1480, 1481, 1482, 1483, 1484, 1485, 1486, 1487, 1488, 1489, 1490, 1491, 1492, 1497, 1500, 1503, 1506, 1509, 1512, 1515, 1525, 1535, 1545, 1558, 1571, 1596, 1597, 1598, 1599, 1602, 1605, 1608, 1611, 1614, 1633, 1634, 1635, 1638, 1641, 1644, 1647, 1650, 1653, 1656, 1657, 1658, 1659, 1660, 1661, 1662, 1687, 1697, 1698, 1699, 1709, 1719, 1721, 1722, 1723, 1724, 1737, 1762, 1763, 1788, 1867, 1872, 1873, 1896, 1900, 1901, 1902, 1903, 1904, 1905, 1906, 1907, 1911, 1941, 2193, 2196, 2197, 2200, 2201, 2202, 2205];

// groups, by input node index (names are the CAD's)
export const G = {
  // the intake arm: the two arm plates, the pivot spacer and 40T sprocket, the cross tubes, the
  // ramp over the arm (Component50), the roller belt, the roller bearings, and the front of the
  // hopper (side panels, their spacers, the front panels and their angles), which is bolted to
  // the arm plates through the same five holes
  arm: [7, 1902, 139, 1480, 125, 126, 157, 184, 185, 150, 2202, 6, 12, 13, 14, 1481, 1482, 1483, 1484, 1485, 1486, 1487, 1488, 1489, 1490, 158],
  roller: [2, 3, 4, 5, 15, 35, 36, 124], // spins about the roller axis (on the arm)
  fold: [189, 1491, 1492], // the top hopper panel and its two live-joint angles
  dup: [1903], // "Component38:2": an exact copy of the +X arm plate in the same place; hidden
  pivotShaft: [20, 23, 154, 1896], // the two 24T pulleys on the pivot's hex shaft
  motorPulley: [186], rollerMotor: [159], motorBelt: [152], rollerBelt: [150], rollerTube: [5, 124],
  gearboxSprocket: [122], gearbox: [39], chain: [1941], pivotSprocket: [1480], encoder: [1911, 2196, 2197, 2200], encSprocket: [2193],
  armPlates: [7, 1902], pivotPlates: [27, 30, 140], hopperFront: [1481, 1482, 1490, 158, 189], topPanel: [189],
  lower: [1545, 1558, 1571, 1633, 1635, 1644, 1647, 1653], // 4-wheel flex sets + shaft
  upper: [1515, 1525, 1535, 1634, 1638, 1641, 1650], // 3-wheel flex sets + shaft
  feeders: [1515, 1525, 1535, 1545, 1558, 1571],
  tBelt: [1656], tMotors: [1737, 1763], tMotorPulleys: [1762, 1788],
  fly: [1497, 1500, 1503, 1506, 1509, 1512, 1596, 1597, 1598, 1599, 1602, 1605, 1608, 1611, 1614, 1867, 1872, 1873],
  flyWheels: [1497, 1500, 1503, 1506, 1509, 1512],
  hoods: [1657, 1658, 1659], backing: [1660, 1661, 1662], ramps: [1719, 1723, 1724], dividers: [1721, 1722], ridge: [2201],
  shooterPlates: [1697, 1698, 1900, 1901], krakens: [1687, 1699, 1709],
  hopperPlates: [1904, 1905, 1906, 1907], bumpers: [1455, 1456, 1457, 1458], wood: [2205],
};

const tagOf = (i) => { const t = KEEP.indexOf(i); if (t < 0) throw new Error(`rig: node ${i} is not kept`); return t; };

/** Load the robot into the stage and rig it. Returns handles; every motion is about a CAD axis. */
export async function loadRobot(stage, o = {}) {
  const model = await stage.load(MODEL, o);
  const byTag = new Map();
  const swerve = [];
  model.traverse((n) => {
    const m = /^anim_frc_(\d+)_/.exec(n.name);
    if (!m || (n.parent && /^anim_frc_/.test(n.parent.name))) return;
    if (/SWERVE_/.test(n.name)) { swerve.push(n); return; }
    const t = +m[1];
    if (!byTag.has(t)) byTag.set(t, []);
    byTag.get(t).push(n);
  });
  const parts = (list) => list.flatMap((i) => byTag.get(tagOf(i)) || []);

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
  for (const b of parts(G.bumpers)) b.traverse((m) => { if (m.isMesh) m.material = blue; });
  for (const d of parts(G.dup)) d.visible = false;

  // ---- rig (roller and the folding panel first, so their pivots ride inside the arm's)
  const X = [1, 0, 0];
  const P = (a) => [0, a[0], a[1]];
  const roller = stage.pivot(parts(G.roller), P(AX.roller), X);
  const fold = stage.pivot(parts(G.fold), P(AX.hinge), X);
  const arm = stage.pivot([...parts(G.arm), roller, fold], P(AX.pivot), X);
  const pivotShaft = stage.pivot(parts(G.pivotShaft), P(AX.pivot), X);
  const motorPulley = stage.pivot(parts(G.motorPulley), P(AX.motor), X);
  const gearboxSprocket = stage.pivot(parts(G.gearboxSprocket), P(AX.gearbox), X);
  const encSprocket = stage.pivot(parts(G.encSprocket), P(AX.encoder), X);
  const lower = stage.pivot(parts(G.lower), P(AX.lower), X);
  const upper = stage.pivot(parts(G.upper), P(AX.upper), X);
  const fly = stage.pivot(parts(G.fly), P(AX.fly), X);

  const s = { roller: 0, fly: 0, transfer: 0, arm: 0, fold: 0 };
  const applyRoller = () => {
    // with the motor still, the roller keeps its heading while the arm swings (24T to 24T belt
    // from a pulley on the pivot axis), so its angle on the arm is the drive angle minus the arm's
    roller.setAngle(s.roller - s.arm);
    pivotShaft.setAngle(s.roller);
    motorPulley.setAngle(2 * s.roller); // 12T to 24T
  };
  const rig = {
    model, parts, G, arm, roller, fold, swerve,
    /** arm angle, radians: 0 deployed as modelled, STOW folded up; the top panel follows foldFor */
    setArm(a, f = foldFor(a)) {
      s.arm = a; s.fold = f;
      arm.setAngle(a);
      fold.setAngle(-f); // inward is the same sense as the stow
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
    /** show polycarbonate clear (true) or as the CAD exports it (false) */
    setClear(on) {
      model.traverse((m) => {
        if (!m.isMesh) return;
        for (const mat of [].concat(m.material)) if (mat?.userData?.clear) { mat.opacity = on ? 0.3 : 0.92; mat.depthWrite = !on; mat.needsUpdate = true; }
      });
      stage.invalidate();
    },
  };
  return rig;
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

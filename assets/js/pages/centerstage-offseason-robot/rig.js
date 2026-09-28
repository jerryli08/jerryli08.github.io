// The pitching arm of Jerry's STEAM Carnival robot, rigged about the real axes in his CAD.
//
// Model: /assets/models/centerstage-offseason-robot/robot.glb, made from his STEP
// (final hcls centerstage ftc bot.step) by /home/claude/work/hcls-2024-ftc-offseason-bot/prep-robot.mjs
// and tools/optimize-cad.mjs. The STEP holds three slide kits on top of each other; the web model keeps
// the extended 336 mm kit (the one carrying the claw) plus the retracted kit's belt, and leaves the other
// copies out. Parts are grouped (G_*) by their STEP instance paths.
//
// Frame (glTF): metres, +Y up, +Z is the robot's front (the way the arm reaches), X across the robot.
// A STEP point (x, y, z) mm is (x, z, -y) / 1000 here. Axes and travel, measured on the STEP
// (demos.md in the phase A folder; centres of the hubs' bores):
//   pivot   along X through (y 0.046, z 0): both pivot motor shafts and both hubs, 94 mm above the floor
//   wrist   along X through (y 0.0703, z 1.3634), the wrist servo hub, in the CAD pose (slides out)
//   fingers along Y (vertical in the CAD pose) through the finger servo hubs at
//           (x 0.0532, z 1.3953) and (x -0.1312, z 1.3953). The CAD pose is CLOSED: each finger
//           runs forward from its hub along the outside of the claw (arms 175 mm apart) and hooks
//           inward at its tip (tips 141 mm apart), in front of two 76.2 mm pixels side by side.
//           Opening swings each tip outward: the +x finger turns about +Y by +angle (its tip, 86 mm
//           out along +Z from the hub, goes toward +x), the -x finger by -angle.
//   slides  each of the four stages travels 244.8 mm along the arm (matched part by part between the
//           extended and the retracted copies of the kit); each ball carriage moves half as far as the
//           stage it carries, and the claw rides the last stage: 979.2 mm in all.
// The CAD pose is the arm flat with the slides all the way out (e = 1, pitch 0).
// Pitch: phi > 0 raises the claw (a turn about +X by -phi). From TestTeleop.java: 3,895.9 ticks per
// turn of the arm, gravity term 0.18 cos(angle + 110 deg), angle = -360 ticks / 3895.9, so the arm is
// flat at 1,190 ticks and phi = (1190 - ticks) / 10.822 deg: down preset 1,225 ticks (-3.2 deg),
// up preset 50 ticks (105.3 deg).

export const MODEL = '/assets/models/centerstage-offseason-robot/robot.glb';
export const PIVOT = [0, 0.046, 0];
export const WRIST = [0, 0.0703, 1.3634];
export const FINGER_R = [0.0532, 0, 1.3953];
export const FINGER_L = [-0.1312, 0, 1.3953];
export const STAGE = 0.2448; // m per stage
export const TRAVEL = 4 * STAGE; // 0.9792 m
export const FLOOR = -0.048; // wheel contact, STEP z = -48
export const TICKS_PER_DEG = 3895.9 / 360;
export const phiFromTicks = (t) => (1190.4 - t) / TICKS_PER_DEG; // degrees
export const PHI_UP = phiFromTicks(50); // 105.3
export const CLAW_C = [-0.039, 0.0077, 1.4159]; // claw body centre in the CAD pose (for the lever arm)

const DEG = Math.PI / 180;
// a group's nodes as optimize-cad.mjs names them (anim_hc_<n>_G_X__<k>), anchored so the rig's own
// pivot groups ("pivot:anim_hc_5_G_PIVOT_CH__0") never match
const G = (name) => new RegExp(`^anim_hc_\\d+_${name}(__\\d+)?$`);

export async function rigRobot(stage, { belts = true } = {}) {
  const { THREE } = stage;
  const model = await stage.load(MODEL);
  const part = (name) => stage.part(G(name), model);
  const X = [1, 0, 0], Y = [0, 1, 0];

  // fingers turn about their servo hubs; the wrist carries them; the claw carries the wrist
  const fR = stage.pivot(part('G_FINGER_R'), FINGER_R, Y);
  const fL = stage.pivot(part('G_FINGER_L'), FINGER_L, Y);
  const wrist = stage.pivot([...part('G_WRIST'), fR, fL], WRIST, X);
  const group = (name, objs) => { const g = new THREE.Group(); g.name = name; model.add(g); for (const o of objs) g.attach(o); return g; };
  const claw = group('rig-claw', [...part('G_CLAW'), ...part('G_WRIST_SERVO'), wrist]);
  const stages = [1, 2, 3, 4].map((k) => group(`rig-stage-${k}`, part(`G_STAGE_${k}`)));
  const cars = [1, 2, 3, 4].map((k) => group(`rig-car-${k}`, part(`G_CAR_${k}`)));
  const beltExt = part('G_BELT_EXT'), beltRet = part('G_BELT_RET');
  const armFixed = ['G_PIVOT_CH', 'G_ARM_MISC', 'G_SLIDE_BASE', 'G_SLIDE_MOTOR', 'G_BELT_EXT', 'G_BELT_RET'].flatMap(part);
  const arm = stage.pivot([...armFixed, ...stages, ...cars, claw], PIVOT, X);
  // the pivot group is not turned yet, so its local axes are the model's: slides run along local Z
  const base = new Map([...stages, ...cars, claw].map((g) => [g, g.position.z]));
  if (!belts) for (const b of [...beltExt, ...beltRet]) b.visible = false;

  let last = '';
  /** pose({ phi (deg), e (0 in .. 1 out), wrist (deg, + turns the claw the way the arm pitches up), grip: [r, l] (deg, + opens) }) */
  function pose({ phi = 0, e = 1, wrist: w = 0, grip = [0, 0] } = {}) {
    const key = `${phi}|${e}|${w}|${grip[0]}|${grip[1]}`;
    if (key === last) return false;
    last = key;
    const back = (1 - e) * STAGE;
    stages.forEach((g, i) => { g.position.z = base.get(g) - back * (i + 1); });
    cars.forEach((g, i) => { g.position.z = base.get(g) - back * (i + 0.5); });
    claw.position.z = base.get(claw) - back * 4;
    if (belts) {
      for (const b of beltExt) b.visible = e > 0.97;
      for (const b of beltRet) b.visible = e < 0.03;
    }
    arm.setAngle(-phi * DEG);
    wrist.setAngle(-w * DEG);
    // a turn about +Y by +a takes +Z toward +X: the +x finger's tip swings out to +x, the -x finger's to -x
    fR.setAngle(grip[0] * DEG);
    fL.setAngle(-grip[1] * DEG);
    stage.invalidate();
    return true;
  }
  return { model, part, arm, wrist, claw, stages, cars, fR, fL, pose };
}

// ---------------------------------------------------------------- props (not in the CAD)
export const PIXEL_T = 0.0127;
// FTC CENTERSTAGE pixel: a hexagon 3 in (76.2 mm) across the flats and 0.5 in (12.7 mm) thick,
// with a round hole in the middle. Lying flat, centred on its middle.
export function pixelGeometry(THREE) {
  const across = 0.0762, thick = 0.0127;
  const R = across / 2 / Math.cos(Math.PI / 6);
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; s[i ? 'lineTo' : 'moveTo'](R * Math.cos(a), R * Math.sin(a)); }
  s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.0135, 0, Math.PI * 2, true); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick - 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 20 });
  geo.translate(0, 0, -(thick - 0.002) / 2);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// ---------------------------------------------------------------- the backdrop (official field CAD)
// FIRST's CENTERSTAGE backdrop, am-5103, from AndyMark's full-field STEP (am-5100 CenterStage Full
// Field.STEP, the CAD file on andymark.com/products/ftc-2023-24; AndyMark makes FIRST's field kit),
// prepared by /home/claude/work/hcls-2024-ftc-offseason-bot/prep-backdrop.mjs: fasteners left out,
// Y up, origin on the floor the easel's legs stand on (outside the field), directly under the bottom
// edge of the scoring face, centred across it; the face looks toward +Z. Measured on the model:
//   the scoring face is flat and leans back 60.00 degrees from the floor; its bottom edge is 147.8 mm
//   above the origin; the field tiles' top (the robot's floor) is 17.5 mm above the origin (the tiles
//   are 15 mm thick in the same STEP, and the easel's lowest edge sits on them)
//   the frame's bottom edge is notched for the first row: six notches, centres x = +-38, +-114,
//   +-190 mm; a pixel (pointy end down) settles with its centre 58.2 mm up the face from its
//   bottom edge, whichever notch
//   the frame's lowest front edge stands 95.2 mm in front of the face's bottom edge
export const BD_MODEL = '/assets/models/centerstage-offseason-robot/backdrop.glb';
export const BD_TILT = 60; // degrees from the floor
const BD_EDGE = 0.1478, BD_TILE = 0.0175, BD_REST = 0.0582;
export const BD_LIP = 0.0952;

// Loads it into `into` (the robot model, so it shares the robot's frame) with the face's bottom edge
// at z = edgeZ, centred at x, standing on the robot's floor. Returns the scoring plane and the rest
// pose of a pixel in a notch. The white tape lines lie only 0.1 mm proud of the face, so they are
// drawn with a depth offset (no flicker).
export async function loadBackdrop(stage, into, { x = 0, edgeZ = -0.34 } = {}) {
  const { THREE } = stage;
  const obj = await stage.load(BD_MODEL, { add: false });
  obj.name = 'backdrop';
  obj.position.set(x, FLOOR - BD_TILE, edgeZ);
  into.add(obj);
  obj.updateMatrixWorld(true);
  for (const m of stage.part(/BD_LINES/, obj)) m.traverse((o) => {
    if (o.isMesh) for (const mat of [].concat(o.material)) Object.assign(mat, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  });
  const t = BD_TILT * DEG;
  const normal = new THREE.Vector3(0, Math.cos(t), Math.sin(t)); // out of the face: toward +Z and up
  const up = new THREE.Vector3(0, Math.sin(t), -Math.cos(t)); // up the face
  const edge = new THREE.Vector3(x, FLOOR - BD_TILE + BD_EDGE, edgeZ); // on the face's bottom edge
  // a pixel resting in a notch: its back face on the face, its centre half a pixel off it
  const rest = (px) => edge.clone().setX(px).addScaledVector(up, BD_REST).addScaledVector(normal, PIXEL_T / 2);
  return { obj, plane: { point: edge, normal, up }, rest };
}

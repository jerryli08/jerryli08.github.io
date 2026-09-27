// The pitching arm of Jerry's STEAM Carnival robot, rigged about the real axes in his CAD.
//
// Model: /assets/models/steam-carnival-robot/robot.glb, made from his STEP
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
//           (x 0.0532, z 1.3953) and (x -0.1312, z 1.3953)
//   slides  each of the four stages travels 244.8 mm along the arm (matched part by part between the
//           extended and the retracted copies of the kit); each ball carriage moves half as far as the
//           stage it carries, and the claw rides the last stage: 979.2 mm in all.
// The CAD pose is the arm flat with the slides all the way out (e = 1, pitch 0).
// Pitch: phi > 0 raises the claw (a turn about +X by -phi). From TestTeleop.java: 3,895.9 ticks per
// turn of the arm, gravity term 0.18 cos(angle + 110 deg), angle = -360 ticks / 3895.9, so the arm is
// flat at 1,190 ticks and phi = (1190 - ticks) / 10.822 deg: down preset 1,225 ticks (-3.2 deg),
// up preset 50 ticks (105.3 deg).

export const MODEL = '/assets/models/steam-carnival-robot/robot.glb';
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
const G = (name) => new RegExp(`_${name}(__\\d+)?$`);

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
    fR.setAngle(-grip[0] * DEG); // the +x finger opens toward +x
    fL.setAngle(grip[1] * DEG); // the -x finger opens toward -x
    stage.invalidate();
    return true;
  }
  return { model, part, arm, wrist, claw, stages, cars, fR, fL, pose };
}

// ---------------------------------------------------------------- props (not in the CAD)
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

// A CENTERSTAGE-style backdrop: a board leaning back 60 degrees from the floor, a hexagon grid on
// its face, a low lip along its bottom edge and two posts under it. It is placed behind the robot
// (-Z), where the arm's up preset brings the claw. Returns { group, plane: { point, normal, up } }.
export function backdrop(THREE, { bottomY = 0.25, bottomZ = -0.19, width = 0.62, height = 0.52 } = {}) {
  const g = new THREE.Group(); g.name = 'prop-backdrop';
  const tilt = 60 * DEG; // from the floor
  // up the face: toward -Z and +Y; the face looks toward +Z (the robot) and up
  const up = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt));
  const normal = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const c = document.createElement('canvas'); c.width = 512; c.height = 430;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2d33'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(210, 215, 225, 0.55)'; x.lineWidth = 2.2;
  const r = 20, w = Math.sqrt(3) * r;
  for (let row = 0; row * 1.5 * r < c.height + r; row++) {
    for (let col = -1; col * w < c.width + w; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0) + 12, cy = c.height - (row * 1.5 * r + 14);
      x.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; x[i ? 'lineTo' : 'moveTo'](cx + r * 0.92 * Math.cos(a), cy + r * 0.92 * Math.sin(a)); }
      x.closePath(); x.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const board = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.008),
    [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: '#2b2d33', roughness: 0.6 })).concat([
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: '#2b2d33', roughness: 0.6 })]));
  const bottom = new THREE.Vector3(0, bottomY, bottomZ);
  const centre = bottom.clone().addScaledVector(up, height / 2).addScaledVector(normal, -0.004);
  board.position.copy(centre);
  board.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  // keep the texture upright: the box's +Y should run up the face
  const yNow = new THREE.Vector3(0, 1, 0).applyQuaternion(board.quaternion);
  const twist = new THREE.Quaternion().setFromUnitVectors(yNow, up);
  board.quaternion.premultiply(twist);
  const dark = new THREE.MeshStandardMaterial({ color: '#1d1e22', roughness: 0.7 });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, 0.012), dark);
  lip.position.copy(bottom).addScaledVector(normal, 0.012);
  lip.quaternion.copy(board.quaternion);
  const postH = bottomY - FLOOR;
  const posts = [-1, 1].map((s) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.025, postH + height * Math.sin(tilt) * 0.5, 0.025), dark);
    p.position.set(s * (width / 2 - 0.03), FLOOR + (postH + height * Math.sin(tilt) * 0.5) / 2, bottomZ - height * Math.cos(tilt) * 0.5 - 0.02);
    return p;
  });
  for (const m of [board, lip, ...posts]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  return { group: g, plane: { point: bottom, normal, up } };
}

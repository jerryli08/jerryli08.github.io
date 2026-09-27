// Shared rig for the 1 lb combat robot page: loads Jerry's CAD (v1.glb, v2.glb from his STEP
// exports), paints the printed parts the colours they were printed in, finds the parts by their
// CAD names and pivots the moving ones about their real axes.
//
// Axes (from the STEP, see /home/claude/work/battlebot/demos.md): GLB metres, Y up, forward is -Z.
//   weapon: vertical line through STEP (x 0, y 76)  -> GLB point (0, 0.020, -0.076), dir +Y
//   wheels: STEP line along X at (y 0, z 20)        -> GLB points (+-0.0711, 0.020, 0), dir +X
// The wheel bottoms sit at GLB y = -0.0086, so the robot is lifted 8.6 mm to stand on y = 0.
import { cad } from '/assets/js/lib/stage.js';

export const MODELS = { v1: '/assets/models/battlebot/v1.glb', v2: '/assets/models/battlebot/v2.glb' };
export const AXIS_POINT = cad.point([0, 76, 20]); // [0, 0.020, -0.076]
export const AXIS_DIR = [0, 1, 0];
export const AXLE_X = 0.07112, AXLE_Y = 0.020, WHEEL_R = 0.028575, TRACK = 2 * AXLE_X;
export const LIFT = 0.0086;

// Weapon numbers: the same math as Jerry's weapon calculator (740 KV, 11.1 V, 4.409 in blade, no reduction)
export const KV = 740, VOLTS = 11.1, BLADE_IN = 4.409;
export const RPM_MAX = KV * VOLTS;                      // 8,214 rpm
export const W_MAX = (RPM_MAX * 2 * Math.PI) / 60;      // 860.2 rad/s
export const TIP_R = (BLADE_IN * 0.0254) / 2;           // 0.0560 m, the swing radius of both blades in the CAD
export const tipOf = (w) => ({ rpm: (w * 60) / (2 * Math.PI), fts: (w * TIP_R) / 0.3048, mph: w * TIP_R * 2.2369363 });
export const fmtInt = (v) => Math.round(v).toLocaleString('en-US');

export { spinTo, drawnSpeed } from './physics.js';

/** Load one version and paint it. Returns { model, p: parts }. */
export async function loadRobot(stage, version, opts = {}) {
  const model = await stage.load(MODELS[version], opts);
  paint(stage, model, version);
  return { model, p: parts(stage, model) };
}

export function parts(stage, model) {
  const P = (re) => stage.part(re, model);
  return {
    blade: P(/Weapon_Blade/), rotor: P(/M4006_01_Rotor/), screws: P(/M3x06/),
    stator: P(/M4006_02_Stator/), motorBearings: P(/M4006_03_Bearing/),
    wheelL: P(/Wheel_assembly_1/), wheelR: P(/Wheel_assembly_2/),
    driveL: P(/drive_motor_3/), driveR: P(/drive_motor_5/),
    top: P(/Top_Plate/), bottom: P(/Bottom_Plate/),
    tpu: P(/full_tpu/), center: P(/Center_frame/), guards: P(/wheel_guard/), clamps: P(/motor_clamp/),
    switch: P(/rev_switch/), topBearing: P(/4mm_id_bearing/), spacer: P(/spacer/),
  };
}

// The STEP colours are dark CAD defaults. Recolour (colour only) to what the photos show:
// a teal TPU frame, near-black plates, and on version 2 a grey one-tooth blade. Version 1 was
// never printed, so its frame keeps the blue of Jerry's own render.
function paint(stage, model, version) {
  const T = stage.THREE;
  const plate = new T.MeshStandardMaterial({ color: '#141517', roughness: 0.78, metalness: 0, envMapIntensity: 0.55 });
  const teal = new T.MeshStandardMaterial({ color: '#12a396', roughness: 0.72, metalness: 0 });
  const grey = new T.MeshStandardMaterial({ color: '#4e5258', roughness: 0.66, metalness: 0, envMapIntensity: 0.7 });
  const set = (re, mat) => {
    for (const p of stage.part(re, model)) p.traverse((m) => { if (m.isMesh) m.material = mat; });
  };
  set(/Top_Plate|Bottom_Plate/, plate);
  if (version === 'v2') {
    set(/full_tpu/, teal);
    set(/Weapon_Blade/, grey);
  } else set(/Weapon_Blade/, plate);
}

/** Pivots for the weapon (blade, bell and blade screws) and both wheels about their CAD axes. */
export function rig(stage, p) {
  const weapon = stage.pivot([...p.blade, ...p.rotor, ...p.screws], AXIS_POINT, AXIS_DIR);
  const wheelL = stage.pivot(p.wheelL, [-AXLE_X, AXLE_Y, 0], [1, 0, 0]);
  const wheelR = stage.pivot(p.wheelR, [AXLE_X, AXLE_Y, 0], [1, 0, 0]);
  return { weapon, wheelL, wheelR };
}

/** A translucent disc the size of the blade's swing, shown as the blade blurs at speed. */
export function blurDisc(T, color = '#8b9097') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.25)');
  grad.addColorStop(0.72, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.97, 'rgba(255,255,255,0.95)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({ color, map: tex, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
  const disc = new T.Mesh(new T.CircleGeometry(TIP_R, 64), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.renderOrder = 3;
  disc.visible = false;
  disc.castShadow = false; disc.receiveShadow = false;
  disc.setSpeed = (w) => {
    const a = Math.max(0, Math.min(0.38, ((w - 60) / 240) * 0.38));
    mat.opacity = a; disc.visible = a > 0.01;
  };
  return disc;
}

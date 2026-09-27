// Shared rig for the Golden Retriever demos: loads the robot from Jerry's CAD and pivots every
// moving part about the axis it turns on in that CAD.
//
// Model frame (metres, Y up, floor at y = 0): +X is the arm side (lift rails, carriage and the
// SO-101 all sit on the +X face), the wheels turn about X, and +Z is taken as forward.
//
// Axes, all measured in the CAD (phase A notes: arm-rig.json and demos.md in the project folder):
//   drive wheels   axis X through (y 0.036, z 0.178), wheel radius 36 mm (72 mm Rhino wheels)
//   free wheels    axis X through (y 0.036, z -0.144)
//   winch pulley   axis X through (y 0.992, z 0.178), 112 mm circumference, so 112 mm of line per turn
//   carriage       slides in Y on the two MGN9 rails, -258 mm to +302 mm from its CAD position
//   SO-101 arm     six revolute joints; the arm is one fused solid in the STEP, split into seven
//                  links, each joint axis found from its STS3215 servo horn and idler disk
import * as THREE from 'three';

export const MODEL = '/assets/models/golden-retriever/robot.glb';
export const DEG = Math.PI / 180;
export const WHEEL_R = 0.036;
export const TRACK_HALF = 0.1983;
export const PULLEY_R = 0.112 / (2 * Math.PI);
export const LIFT_MIN = -0.258, LIFT_MAX = 0.302;
export const PLATE_Y = 0.4265; // top of the grid plate the arm stands on, CAD position

// Arm frame in the model: node "SO-101 follower arm ...", translated (0.3605, 0.42611, 0) and
// turned +90 deg about Y, so the arm's local +Z is the model's +X and local +X is the model's -Z.
const ARM_T = [0.3605, 0.42611, 0];
const armPoint = ([x, y, z]) => [ARM_T[0] + z, ARM_T[1] + y, ARM_T[2] - x];
const armDir = ([x, y, z]) => [z, y, -x];
// joint origins and axes in the arm's own frame (arm-rig.json)
export const JOINTS = [
  { key: 'pan', name: 'Shoulder pan', origin: [-0.0001, 0, 0.0074], axis: [0, 1, 0], min: -90, max: 90 },
  { key: 'lift', name: 'Shoulder lift', origin: [0, 0.1198, 0.0388], axis: [1, 0, 0], min: 0, max: 100 },
  { key: 'elbow', name: 'Elbow', origin: [0, 0.1486, -0.0738], axis: [1, 0, 0], min: -170, max: 0 },
  { key: 'wflex', name: 'Wrist flex', origin: [0, 0.1526, 0.0606], axis: [1, 0, 0], min: -100, max: 100 },
  { key: 'wroll', name: 'Wrist roll', origin: [0.0071, 0.152, 0], axis: [0, 0, 1], min: -180, max: 180 },
  { key: 'grip', name: 'Gripper', origin: [0, 0.172, 0.1457], axis: [1, 0, 0], min: 0, max: 95 },
].map((j) => ({ ...j, point: armPoint(j.origin), dir: armDir(j.axis) }));

// Poses in degrees (pan, lift, elbow, wrist flex, wrist roll, gripper). All zeros is the CAD
// pose: arm folded, moving jaw straight up, wide open. The reach and lift-off poses put the grip
// point at x 0.669 m, y 0.668 m (reach) with the carriage at its CAD height, by forward kinematics
// on the CAD. Wrist roll 90 turns the jaws to close sideways around a standing object.
export const POSES = {
  rest: [0, 0, 0, 0, 0, 0],
  pre: [0, 62, -70, 8, 90, 40],
  reach: [0, 76, -78, 2, 90, 40],
  lift: [0, 70, -80, 10, 90, 75],
  carry: [0, 40, -95, 55, 90, 75],
};
export const REACH = { x: 0.669, y: 0.668 };
// approximate gap between the jaw tips against gripper angle, from the CAD geometry
const GAP = [[0, 0.13], [30, 0.093], [55, 0.06], [70, 0.04], [85, 0.02], [95, 0]];
export function gripAngleFor(width) {
  for (let i = 1; i < GAP.length; i++) {
    const [a0, g0] = GAP[i - 1], [a1, g1] = GAP[i];
    if (width >= g1) return a0 + ((g0 - width) / (g0 - g1)) * (a1 - a0);
  }
  return 95;
}

const re = {
  driveL: /_(Low_Profile_Servo_Hub_25T|32mm_OD_Pattern_Spacer_4mm|Rhino_Wheel_72mm_14mm_bore_30A)_1$/,
  driveR: /_(Low_Profile_Servo_Hub_25T|32mm_OD_Pattern_Spacer_4mm|Rhino_Wheel_72mm_14mm_bore_30A)_2$/,
  freeL: /_(Rhino_Wheel_72mm_14mm_bore_30A_3|Sonic_Hub_8mm_REX_bore_1|8mm_REX_Plastic_Spacer_16mm_1|8mm_REX_Stainless_Shaft_48mm_with_E_clip_1)$/,
  freeR: /_(Rhino_Wheel_72mm_14mm_bore_30A_4|Sonic_Hub_8mm_REX_bore_2|8mm_REX_Plastic_Spacer_16mm_2|8mm_REX_Stainless_Shaft_48mm_with_E_clip_2)$/,
  winch: /_(Sonic_Hub_8mm_REX_bore_3|8mm_REX_Servo_Shaft_25T_36mm_1|Hub_Mount_Winch_Pulley_112mm_circ_1)$/,
  line: /Synthetic_Cable/,
  carriage: /_Carriage_1__\d+$/,
  link: (i) => new RegExp(`_SO101_L${i}_`),
};

/**
 * Loads the robot into the stage and rigs it. Returns handles:
 *   model, arm.set(i, deg) / arm.pose([...deg]) / arm.angles, lift.set(dy), wheels.set(left, right),
 *   grip (an Object3D between the jaws that follows the gripper), links, groups for highlighting.
 */
export async function loadRobot(stage, o = {}) {
  const model = await stage.load(MODEL, { add: o.add });
  const P = (rx) => {
    const a = stage.part(rx, model);
    if (!a.length) throw new Error(`rig: no part matches ${rx}`);
    return a;
  };

  // the arm is printed PLA, not metal: the STEP colour alone would read as gold, so give it a matte finish
  const links = [0, 1, 2, 3, 4, 5, 6].map((i) => P(re.link(i)));
  const pla = new THREE.MeshStandardMaterial({ color: '#f2c833', roughness: 0.55, metalness: 0 });
  for (const l of links) for (const m of l) m.traverse((x) => { if (x.isMesh) { pla.color.copy(x.material.color); x.material = pla; } });

  // wheels (each wheel turns with its hub, spacer and, on the free wheels, its REX shaft)
  const driveL = stage.pivot(P(re.driveL), [0, 0.036, 0.178], [1, 0, 0]);
  const driveR = stage.pivot(P(re.driveR), [0, 0.036, 0.178], [1, 0, 0]);
  const freeL = stage.pivot(P(re.freeL), [0, 0.036, -0.144], [1, 0, 0]);
  const freeR = stage.pivot(P(re.freeR), [0, 0.036, -0.144], [1, 0, 0]);
  const winch = stage.pivot(P(re.winch), [0.19, 0.992, 0.178], [1, 0, 0]);

  // arm: nested pivots, innermost first, so each joint carries everything beyond it
  let child = null;
  const pivots = [];
  for (let i = 5; i >= 0; i--) {
    const j = JOINTS[i];
    const parts = [...links[i + 1], ...(child ? [child] : [])];
    child = stage.pivot(parts, j.point, j.dir);
    pivots[i] = child;
  }
  // grip point, between the jaws, on the wrist roll axis (CAD pose: x 0.556, y 0.578, z -0.007)
  const grip = new THREE.Object3D();
  grip.name = 'grip';
  grip.position.set(0.556, 0.578, -0.0071);
  model.add(grip);
  pivots[4].attach(grip);

  // lift: the carriage, the arm base and the whole arm ride the rails together
  const liftG = new THREE.Group();
  liftG.name = 'lift';
  model.add(liftG);
  for (const x of [...P(re.carriage), ...links[0], pivots[0]]) liftG.attach(x);
  // winch line: scaled from its top end so its lower end follows the carriage
  const lineG = new THREE.Group();
  lineG.position.set(0.1912, 0.992, 0.1596);
  model.add(lineG);
  for (const x of P(re.line)) lineG.attach(x);
  const LINE_LEN = 0.992 - 0.424;

  const angles = [0, 0, 0, 0, 0, 0];
  const arm = {
    angles,
    set(i, deg) { angles[i] = deg; pivots[i].setAngle(deg * DEG); },
    pose(a) { for (let i = 0; i < 6; i++) if (a[i] != null) arm.set(i, a[i]); },
  };
  const lift = {
    dy: 0,
    set(dy) {
      dy = Math.min(LIFT_MAX, Math.max(LIFT_MIN, dy));
      lift.dy = dy;
      liftG.position.y = dy;
      lineG.scale.y = (LINE_LEN - dy) / LINE_LEN;
      winch.setAngle(dy / PULLEY_R); // positive about +X winds the line in and raises the carriage
      stage.invalidate();
    },
  };
  let wl = 0, wr = 0;
  const wheels = {
    get left() { return wl; }, get right() { return wr; },
    set(l, r) { wl = l; wr = r; driveL.setAngle(l); freeL.setAngle(l); driveR.setAngle(r); freeR.setAngle(r); },
    roll(dl, dr) { wheels.set(wl + dl / WHEEL_R, wr + dr / WHEEL_R); }, // metres rolled by each side
  };
  return {
    model, arm, lift, wheels, grip, links, pivots,
    groups: {
      drive: [...P(re.driveL), ...P(re.driveR)],
      free: [...P(re.freeL), ...P(re.freeR)],
      winch: [...P(re.winch), ...P(re.line)],
      carriage: P(re.carriage),
      arm: links.flat(),
    },
  };
}

// ------------------------------------------------------------------ side camera (annotation)
// The detection webcam sits low on the arm side, angled up at the shelf (Jerry's description; the
// footage shows a webcam beside the arm base). It is not in the CAD, so this spot is approximate.
// The wedge is an annotation of where it looks, not a part. Robot frame (model metres).
export const SIDE_CAM = { at: [0.235, 0.36, 0.08], tilt: 18, label: new THREE.Vector3(0.62, 0.5, 0.08) };
export function sideCameraWedge(THREEns, parent) {
  const g = new THREEns.Group();
  g.name = 'side-camera-view';
  const L = 0.78, hw = Math.tan(26 * DEG) * L, hh = Math.tan(17 * DEG) * L;
  const c = [[L, -hh, -hw], [L, hh, -hw], [L, hh, hw], [L, -hh, hw]];
  const pos = [], lp = [];
  for (let i = 0; i < 4; i++) { pos.push(0, 0, 0, ...c[i], ...c[(i + 1) % 4]); lp.push(0, 0, 0, ...c[i], ...c[i], ...c[(i + 1) % 4]); }
  const g1 = new THREEns.BufferGeometry(); g1.setAttribute('position', new THREEns.Float32BufferAttribute(pos, 3));
  const g2 = new THREEns.BufferGeometry(); g2.setAttribute('position', new THREEns.Float32BufferAttribute(lp, 3));
  g.add(new THREEns.Mesh(g1, new THREEns.MeshBasicMaterial({ color: '#ff6b35', transparent: true, opacity: 0.1, side: THREEns.DoubleSide, depthWrite: false })));
  g.add(new THREEns.LineSegments(g2, new THREEns.LineBasicMaterial({ color: '#ff8a5c', transparent: true, opacity: 0.75 })));
  g.position.set(...SIDE_CAM.at);
  g.rotation.z = SIDE_CAM.tilt * DEG; // tips the view from +X up toward +Y
  parent.add(g);
  return g;
}

// ------------------------------------------------------------------ helpers shared by the demos
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const lerpPose = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

/** Injects a page-scoped stylesheet once (the demos' own UI: chat, labels, HUD). */
export function style(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}

/**
 * Screen-space labels for points in the scene: HTML chips positioned over the canvas.
 * add(text, getWorldPos, cls) -> label; update() after the camera or the scene moves.
 */
export function labelLayer(stage, el) {
  const layer = document.createElement('div');
  layer.className = 'gr-labels';
  el.appendChild(layer);
  const list = [];
  const v = new THREE.Vector3();
  const api = {
    el: layer,
    add(text, pos, cls = '') {
      const d = document.createElement('div');
      d.className = `gr-label ${cls}`;
      d.innerHTML = `<span>${text}</span>`;
      layer.appendChild(d);
      const l = { el: d, pos, visible: true, set text(t) { d.firstChild.textContent = t; } };
      list.push(l);
      return l;
    },
    show(l, on) { l.visible = on; l.el.style.display = on ? '' : 'none'; },
    clear() { for (const l of list) l.el.remove(); list.length = 0; },
    update() {
      const w = el.clientWidth, h = el.clientHeight;
      stage.camera.updateMatrixWorld();
      for (const l of list) {
        if (!l.visible) continue;
        const p = typeof l.pos === 'function' ? l.pos(v) : v.copy(l.pos);
        if (!p) { l.el.style.opacity = '0'; continue; }
        p.project(stage.camera);
        const behind = p.z > 1;
        const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
        l.el.style.opacity = behind || x < -40 || x > w + 40 || y < -20 || y > h + 20 ? '0' : '';
        l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    },
  };
  return api;
}

export const SHARED_CSS = `
.gr-labels { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
.gr-label { position: absolute; left: 0; top: 0; will-change: transform; transition: opacity .25s; }
.gr-label > span { position: absolute; left: 0; bottom: 8px; transform: translateX(-50%); white-space: nowrap;
  padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.35; color: #f3eee8;
  background: rgba(12, 10, 9, 0.78); border: 1px solid rgba(255, 255, 255, 0.16); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.gr-label::after { content: ''; position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; background: #ff6b35; box-shadow: 0 0 0 3px rgba(255, 107, 53, .25); }
.gr-label.gr-accent > span { border-color: rgba(255, 107, 53, .6); color: #ffd9c9; }
.gr-label.gr-nodot::after { display: none; }
.gr-label.gr-nodot > span { bottom: 0; transform: translate(-50%, 50%); }
@media (max-width: 640px) { .gr-label > span { font-size: 11px; padding: 2px 7px; } }
`;

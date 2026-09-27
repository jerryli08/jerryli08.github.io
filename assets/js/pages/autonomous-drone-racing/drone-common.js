// Shared by the demos on this page: loads the race drone from Jerry's CAD and rigs its props.
//
// Model frame (metres, Y up), from the CAD: the nose is -X; the X500 frame centre (top plate) is at
// x 0.418, z -0.1115; the downward camera's sensor (Sony IMX708 in "Raspberry Pi Camera Module 3:3")
// sits 46.9 mm below the top plate and 135.8 mm ahead of the centre; the forward camera's sensor
// ("Raspberry Pi Camera Module 3:2") is 140.7 mm ahead, looking along -X.
// Motor shafts from tools/cad-axes.py on the STEP (mm, Z up), one per "DJ-2216-KV880:n":
//   (241.1, -65.3), (594.8, -65.3), (241.1, 288.4), (594.8, 288.4), axis +Z.
// All four props in the CAD are the same part; here the diagonal pairs turn opposite ways.
import { cad } from '/assets/js/lib/stage.js';

export const MODEL = '/assets/models/autonomous-drone-racing/drone.glb';
export const CENTER = [0.418, 0, -0.1115];
export const DOWN_SENSOR = [0.2822, -0.0469, -0.1115];
export const FWD_SENSOR = [0.2773, -0.0079, -0.1115];
const MOTORS = [[241.1, -65.3], [594.8, -65.3], [241.1, 288.4], [594.8, 288.4]];
// counter-clockwise seen from above (+1) for the front-right and rear-left motors
const SENSE = [-1, 1, 1, -1];

export const GROUPS = {
  cameras: /Raspberry_Pi_Camera_Module_3_/,
  fwdCam: /Raspberry_Pi_Camera_Module_3_2/,
  downCam: /Raspberry_Pi_Camera_Module_3_3/,
  compute: /Raspberry_Pi_5_1|rpi5_rpicam3_mount|raspi_top_cover/,
  pi: /Raspberry_Pi_5_1/,
  sensing: /ARK_Flow_Rev_2|optical_downwards_picam3_mount/,
  ark: /ARK_Flow_Rev_2/,
  power: /Turnigy_3300mAh|top_battery_mount|PCBA_PM06/,
  battery: /Turnigy_3300mAh/,
  printed: /rpi5_rpicam3_mount|raspi_top_cover|optical_downwards_picam3_mount|top_battery_mount|new_landing_gear_mount/,
  props: /Propeller_10x45/,
};

/** Loads the drone. The returned `wrap` holds the model with the frame centre at its origin. */
export async function loadDrone(stage, o = {}) {
  const THREE = stage.THREE;
  const model = await stage.load(MODEL, { add: false });
  const wrap = new THREE.Group(); wrap.name = 'drone-wrap';
  model.position.set(-CENTER[0], 0, -CENTER[2]);
  wrap.add(model);
  if (o.add !== false) stage.root.add(wrap);
  wrap.updateWorldMatrix(true, true);
  // props turn about their motor shafts
  const props = stage.part(GROUPS.props, model).map((p) => {
    const b = new THREE.Box3().setFromObject(p), c = b.getCenter(new THREE.Vector3());
    // nearest motor, compared in the model's frame (the wrap only shifts it)
    const cl = model.worldToLocal(c.clone());
    let k = 0, best = Infinity;
    MOTORS.forEach(([x, y], i) => { const q = cad.point([x, y, 0]); const d = Math.hypot(q[0] - cl.x, q[2] - cl.z); if (d < best) { best = d; k = i; } });
    const [x, y] = MOTORS[k];
    const pv = stage.pivot(p, cad.point([x, y, 0]), cad.dir([0, 0, 1]));
    return { pivot: pv, sense: SENSE[k] };
  });
  const REV = 4; // revolutions per second, for show
  return {
    model, wrap, props,
    camDrop: -DOWN_SENSOR[1],
    part: (re) => stage.part(re, model),
    spin(dt) { for (const p of props) p.pivot.setAngle(p.pivot.angle + p.sense * dt * REV * Math.PI * 2); },
  };
}

/** Inject a stylesheet once. */
export function css(id, text) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style'); s.id = id; s.textContent = text;
  document.head.appendChild(s);
}

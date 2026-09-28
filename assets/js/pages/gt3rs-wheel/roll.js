// Scrolly "roll": the GT3 RS wheel from Jerry's CAD, stood on its lips with the axle level.
// Scrolling rolls it three full turns about its axle, then the camera pans around it: face, side,
// back and from above. Jerry, Sept 27, 21:12: no ruler, tick marks or mark on the wheel; it just
// rolls and the view pans.
//
// Geometry, measured from the real CAD (GLB frame, metres, Y up; the model lies face up):
//  - the axle is the GLB's Y axis through x = 0, z = 0: circles fitted to the barrel (radius
//    253.6 mm at y = -237.6 mm, off-centre by under 0.01 mm) and to the centre bore (radius 31.3 mm,
//    y -72 to -101 mm) are both centred on it
//  - the face is at y = 0, the back lip at y = -264 mm; both lips are 272.5 mm in radius (545 mm
//    across), so the bare rim rolls on its lips: one turn = pi x 545 mm = 1.712 m along the ground
//  - seven spokes leave the hub and each splits in two before the rim (7 at r = 130 mm, 14 at
//    r = 180 to 220 mm)
// Upright: the model is turned +90 degrees about X, so its face (GLB +Y) looks along world +Z and the
// axle is level. The camera tracks the wheel, so it turns in place as it rolls.
// Every picture is a pure function of (step, stepP); nothing moves on its own.
import { createStage } from '/assets/js/lib/stage.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;

const R = 0.2725; // lip radius, m (CAD)
const DEPTH = 0.264; // face lip to back lip, m (CAD)
const C = 2 * Math.PI * R; // 1.712 m per turn
const TURNS = 3;
const ROLL_STEPS = 2; // steps 0 and 1 roll the wheel (1.5 turns each); the rest pan around it

// Distance rolled at scroll time u (0..ROLL_STEPS): a trapezoid speed profile (gentle start and stop,
// steady in between), integrated in closed form
const RAMP = 0.12; // fraction of the roll spent speeding up, and again slowing down
function rolled(u) {
  const x = clamp(u / ROLL_STEPS, 0, 1), vmax = 1 / (1 - RAMP);
  let f;
  if (x < RAMP) f = (vmax * x * x) / (2 * RAMP);
  else if (x > 1 - RAMP) { const y = 1 - x; f = 1 - (vmax * y * y) / (2 * RAMP); }
  else f = vmax * (x - RAMP / 2);
  return f * TURNS * C;
}

// camera views (azimuth 0 looks from +Z at the face, 90 from +X, the way it rolls), framed once at rest
const VIEWS = [
  { azimuth: 30, elevation: 8, pad: 1.25 }, // rolling (steps 0 and 1)
  { azimuth: 30, elevation: 8, pad: 1.25 },
  { azimuth: 0, elevation: 3, pad: 1.12 }, // the face
  { azimuth: -90, elevation: 7, pad: 1.16 }, // side on: the barrel's depth
  { azimuth: -180, elevation: 9, pad: 1.12 }, // the back
  { azimuth: -300, elevation: 42, pad: 1.14 }, // from above, back round to the front
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, envIntensity: 1.25 });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;

  // printed in ABS and vapor smoothed (Jerry): smooth, slightly glossy plastic, no layer lines
  const model = await stage.load('/assets/models/gt3rs-wheel/wheel.glb', { add: false, moulded: /.*/ });
  const upright = new THREE.Group();
  upright.name = 'wheel, upright';
  upright.rotation.x = 90 * DEG; // GLB +Y (the face) to world +Z; the axle is level
  upright.position.z = DEPTH / 2; // the face lip at z = +132 mm, the back lip at -132 mm
  upright.add(model);
  stage.add(upright); // re-fits the ground under the lips (y = -272.5 mm)

  // the axle: the GLB's Y axis through the origin (see the top of this file)
  const mesh = model.children.length ? model.children : [model];
  const axle = stage.pivot(mesh, [0, 0, 0], [0, 1, 0]);

  // views, framed once with the wheel at rest, cached per stage shape and shift
  let views = null, key = '';
  function viewsNow(shift) {
    const k = `${el.clientWidth}x${el.clientHeight}|${shift}`;
    if (views && k === key) return views;
    key = k;
    const a = axle.angle;
    axle.setAngle(0);
    views = VIEWS.map((v) => {
      const f = stage.frame(upright, { ...v, apply: false });
      return { t: f.target.clone(), s: new THREE.Spherical().setFromVector3(f.pos.clone().sub(f.target)) };
    });
    axle.setAngle(a);
    return views;
  }
  const sp = new THREE.Spherical(), camPos = new THREE.Vector3(), camT = new THREE.Vector3();
  function place(a, b, k) { // orbit from view a to view b around the wheel, never through it
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    camT.copy(a.t).lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    camPos.setFromSpherical(sp).add(camT);
    stage.setView({ pos: camPos, target: camT });
  }

  const last = VIEWS.length - 1;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, last);
    stepP = clamp(stepP, 0, 1);
    const shift = ctx.shift();
    stage.setShift(...shift);
    // the roll: steps 0 and 1 (held poses only with reduced motion)
    const u = step < ROLL_STEPS ? step + (reduced ? 1 : stepP) : ROLL_STEPS;
    const s = rolled(u);
    axle.setAngle(-s / R); // rolling toward +X without slipping: clockwise seen from the face
    // the camera: each pan step orbits in from the view before it, then holds
    const v = viewsNow(shift.join(','));
    const k = step < ROLL_STEPS || reduced ? 1 : smooth(0, 0.62, stepP);
    place(v[Math.max(0, step - 1)], v[step], k);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose: () => stage.dispose() };
}

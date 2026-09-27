// "Five millimetres per turn" (scroll-driven): a close look at the right Y ball screw in Jerry's CAD,
// cut through the screw's own axis (x = 516.4 mm, from tools/cad-axes.py). Scrolling turns the screw
// about that axis and the ball nut, the spacer stack and the whole gantry move 5 mm per turn (rig.js).
// The last step lifts the cut and shows both Y screws turning together from the motor end.
// Every picture is a pure function of (step, progress through the step).
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadCnc, viewSet, viewSetter, blendView, hud, smooth, clamp, lerp, mm, LEAD, STEPS_PER_TURN } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#27c7ff';
const CUT_X = 516.4; // mm, the right Y screw's axis
// Y position (mm) at the start and end of each step
const Y = [[0, 0], [0, 20], [20, 40], [40, 140]];
const TORQUE = 1.9, EFF = 0.9; // N·m holding torque of the 23HS30-2804S (StepperOnline); ball screw efficiency, assumed
const PUSH = (2 * Math.PI * TORQUE * EFF) / (LEAD / 1000); // N

// a box in model millimetres to frame a view on (never added to the scene)
function region(x0, y0, z0, x1, y1, z1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) / 1000, (y1 - y0) / 1000, (z1 - z0) / 1000));
  m.position.set(...mm((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  m.updateMatrixWorld(true);
  return m;
}

export async function mount(el, ctx) {
  const rig = await loadCnc(el);
  const { stage, P, setXY } = rig;
  const setView = viewSetter(stage);
  const reduced = ctx.reducedMotion;
  const cut = stage.sectionPlane([-1, 0, 0], CUT_X / 1000);
  stage.setCapColor('#3a3631', '#2c2925');

  const R = {
    motor: region(470, 45, -680, 560, 125, -520),
    nut: region(480, 45, -470, 575, 165, -300),
    far: region(470, 45, -80, 560, 125, 45),
  };
  const V = viewSet(stage, el, [
    { obj: R.motor, azimuth: 122, elevation: 14, pad: 2.0 },
    { obj: R.nut, azimuth: 38, elevation: 12, pad: 2.0 },
    { obj: R.far, azimuth: 112, elevation: 18, pad: 2.3 },
    { obj: [P.frame, P.ymotors, P.gantry], azimuth: 24, elevation: 40, pad: 1.02 },
  ]);

  const ov = labelLayer(stage);
  const lab = [
    [ov.label('NEMA 23 stepper', mm(CUT_X, 112, -640), { minW: 440 }),
      ov.label('Coupler: 6.35 mm shaft to 10 mm screw', mm(CUT_X, 96, -572), { color: BLUE, side: 'l', minW: 440 }),
      ov.label('SFU1605 screw, 16 mm', mm(CUT_X, 76, -470), { color: ORANGE, side: 'l', minW: 440 })],
    [ov.label('Ball nut', P.ynuts, { color: ORANGE, minW: 440 }),
      ov.label('Five spacer plates to the gantry', P.spacers, { minW: 440 }),
      ov.label('Carriage blocks on the rail', P.yblocks, { side: 'l', minW: 440 })],
    [ov.label('BK12 fixed support', mm(CUT_X, 113, -5), { color: BLUE, side: 'l', minW: 440 }),
      ov.label('12 mm journal', mm(CUT_X, 89.4, 12), { color: ORANGE, minW: 440 })],
    [ov.label('Left Y screw', mm(-37.1, 92, -60), { side: 'l', minW: 440 }),
      ov.label('Right Y screw', mm(516.4, 92, -60), { minW: 440 })],
  ];
  // the nut label follows the whole ynuts group (both nuts): pin it to the right nut instead
  lab[1][0].obj = null; lab[1][0].p = new THREE.Vector3();
  const nutAt = (y) => lab[1][0].p.set(...mm(CUT_X + 10, 107, -366 + y));

  const H = hud(ov.layer, [['turns', 'Screw turns'], ['steps', 'Full motor steps', true], ['y', 'Gantry travel']],
    `${LEAD} mm per turn. At its 1.9 N·m holding torque the motor could push about ${(PUSH / 1000).toFixed(1)} kN through the screw (computed, 90\u00a0% screw efficiency assumed; torque falls with speed).`);
  const f1 = (v) => v.toFixed(1);

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, Y.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy);
    const k = reduced ? 1 : smooth(0.08, step === Y.length - 1 ? 0.6 : 0.85, stepP);
    const y = lerp(Y[step][0], Y[step][1], k);
    setXY(0, y);
    nutAt(y);
    // the cut lifts away (to past the right motor) as the last step comes in
    const kv = reduced || step === 0 ? 1 : smooth(0, 0.45, stepP);
    cut.set((CUT_X + (step === 3 ? 90 * kv : 0)) / 1000);
    const views = V(`${sx}`);
    setView(blendView(views[Math.max(0, step - 1)], views[step], kv));
    lab.forEach((ls, i) => ls.forEach((l) => { l.a = i === step ? 1 : 0; }));
    const turns = y / LEAD;
    H.put('turns', f1(turns));
    H.put('steps', Math.round(turns * STEPS_PER_TURN).toLocaleString('en-US'));
    H.put('y', `${f1(y)} mm`);
    H.put('mini', `${f1(turns)} turns, ${f1(y)} mm`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose?.(); for (const r of Object.values(R)) r.geometry.dispose(); stage.dispose(); } };
}

// "The turntable", scroll-driven. The arm turns about the real axis (vertical through x 0,
// z 79.5 mm), the NEMA 23's 80-tooth pulley turns 288/80 = 3.6 times as far, then the bearing stack
// is pulled apart along the axis and cut through one of its eight posts (the post at x +100 mm,
// z 79.5 mm) by a plane through the axis, so the post's bearings show in section. It replaces the
// turn slider and the view buttons; nothing is clicked. Views are framed once, with the turntable at
// rest (whole robot from below), or fixed close views on the post.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRig, RATIO, AXIS, clamp, smooth, lerp, readout, glow, blendView } from './rig.js';

// turntable angle through the steps: from below at rest, a quarter turn, the three stations, then
// still while the stack comes apart and is cut
function thetaAt(step, q) {
  if (step === 1) return 90 * smooth(0.1, 0.85, q);
  if (step === 2) return 90 - 180 * smooth(0.05, 0.5, q) + 90 * smooth(0.55, 0.95, q);
  return 0;
}
const EXPLODE = [0, 0, 0, 1, 0.35];     // the cut is pulled apart a little so its labels read
const Z0 = AXIS[2];                     // the plane through the axis and the post

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const { P } = rig;
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'STOCK']) P[n].visible = false;
  stage.fitGround();
  const reduced = !!ctx.reducedMotion;

  const robot = [P.ROT, P.BASE, P.RING, P.BELT];
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      const keep = { ...rig.state };
      rig.set({ theta: 0, explode: 0 }); rig.turret.updateMatrixWorld(true);
      const whole = stage.frame(robot, { azimuth: 40, elevation: -18, pad: a < 1 ? 1.0 : 1.12, apply: false, refresh: true });
      rig.set(keep);
      views = [
        whole, whole, whole,
        // pulled apart: close on the post at x +100 mm so the layers read
        { pos: new T.Vector3(0.43, 0.11, 0.46), target: new T.Vector3(0.05, -0.03, Z0) },
        // cut: looking along +Z at the section plane, square on to the post (+X is on the left from here)
        { pos: new T.Vector3(0.118, -0.026, Z0 - 0.2), target: new T.Vector3(0.1, -0.034, Z0) },
      ];
      if (a < 1) { views[3] = { pos: new T.Vector3(0.52, 0.13, 0.56), target: views[3].target }; views[4] = { pos: new T.Vector3(0.118, -0.026, Z0 - 0.26), target: views[4].target }; }
    }
    return views;
  }

  // keeps z >= constant... parked in front of everything, then swept back to the plane through the axis
  const cut = stage.sectionPlane([0, 0, 1], 0.3);
  const disc = glow(stage, [P.RING], '#ff6b35', 0.28);
  const pulley = glow(stage, [P.TPUL], '#ff6b35', 0.5);

  const ov = labelLayer(stage);
  const L = {
    motor: ov.label('NEMA 23, 80T pulley', [0, -0.04, 0.3628], { color: '#ff6b35' }),
    disc: ov.label('Printed disc, 288 teeth', [0, -0.049, Z0 + 0.107], { color: '#ff6b35', side: 'l' }),
  };
  // label points on the post at x 100 mm (CAD heights); all but the middle plate move with the stack
  const LAB = [
    { text: 'Bottom plate (turns)', x: 0.088, y: -0.0235, dy: 0.09, side: 'l' },
    { text: 'Upper thrust bearing', x: 0.1, y: -0.027, dy: 0.045, side: 'r' },
    { text: 'Fixed middle plate', x: 0.118, y: -0.0295, dy: 0, side: 'l' },
    { text: 'MR106 on the hole edge', x: 0.1, y: -0.0305, dy: 0, side: 'r' },
    { text: 'Lower thrust bearing', x: 0.1, y: -0.0335, dy: -0.045, side: 'r' },
    { text: 'Printed pulley disc (turns)', x: 0.088, y: -0.043, dy: -0.09, side: 'l' },
  ].map((l) => ({ ...l, el: ov.label(l.text, [l.x, l.y, Z0], { color: '#fff1e2', side: l.side }) }));

  const hud = readout(ov, `
    <table class="num"><thead><tr><th></th><th>Turned</th></tr></thead><tbody>
      <tr><td>Turntable <small>288T disc</small></td><td data-k="a"></td></tr>
      <tr><td>NEMA 23 pulley <small>80T</small></td><td data-k="m"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Reduction <small>tooth counts from the CAD</small></span><b class="num">3.6 : 1</b></div>`);

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 4);
    stage.setShift(...ctx.shift());
    const q = reduced ? 1 : clamp(stepP, 0, 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const prev = Math.max(0, step - 1);
    const theta = reduced ? [0, 90, 0, 0, 0][step] : thetaAt(step, q);
    const explode = lerp(EXPLODE[prev], EXPLODE[step], k);
    rig.set({ theta, explode });

    const v = viewsNow();
    stage.setView(step === prev ? v[step] : blendView(v[prev], v[step], k));
    // the cut sweeps back from the front to the plane through the axis in the last step
    const c = step === 4 ? smooth(0.1, 0.9, k) : 0;
    cut.set(lerp(0.3, -Z0, c));

    const turning = step <= 2 ? 1 : step === 3 ? 1 - k : 0;
    disc(step === 1 || step === 2 ? 1 : step === 3 ? 1 - k : 0);
    pulley(step === 1 || step === 2 ? 1 : step === 3 ? 1 - k : 0);
    hud.show(turning);
    L.motor.a = turning; L.disc.a = turning;
    // the disc label rides the disc's rim
    const a = (theta * Math.PI) / 180;
    L.disc.p.set(AXIS[0] + 0.107 * Math.sin(a), -0.049, Z0 + 0.107 * Math.cos(a));
    const stack = step === 3 ? smooth(0.5, 1, k) : step === 4 ? 1 : 0;
    for (const l of LAB) { l.el.p.y = l.y + l.dy * explode; l.el.a = stack; }

    const m = RATIO * theta;
    hud.put('a', `${Math.round(theta)}°`);
    hud.put('m', `${Math.round(m)}°, ${(m / 360).toFixed(2)} turns`);
    hud.put('mini', `Turntable ${Math.round(theta)}°, motor pulley ${Math.round(m)}° (3.6 : 1)`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); cut.remove(); stage.dispose(); } };
}

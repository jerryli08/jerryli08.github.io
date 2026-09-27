// "The telescoping arm", scroll-driven. The carriage runs out along the real slide direction (-Z of
// the turntable); each SAR340 slide's three members and two ball rows move at their own rates
// (rig.js). It replaces the reach slider and the "cut the slides" button; nothing is clicked.
// Steps: folded into the frame; cut through the upper ball rows (a horizontal section plane at
// y 41 mm in the CAD sweeps down) while the carriage starts out; close on the motor end, where the open
// belt (belt.js, drawn along the path the CAD's pulley, idlers and clamps set) runs round the pulley
// and its teeth travel with the carriage; out to 355 mm; back in.
// The camera views are framed once per stage shape on fixed boxes, never on a moving part.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRig, STROKE, EXT_PITCH_R, clamp, smooth, lerp, readout, glow, blendView, inward } from './rig.js';

const CUT_Y = 0.041;      // m: through the upper ball rows
const Y_TOP = 0.075;      // m: just above the arm (nothing cut)
const S1 = 0.12;           // m of reach while the slide is cut open
const S2 = 0.2;            // m of reach by the end of the close look at the belt
const END = -0.1205;      // m: where the slide members end at the front, retracted (CAD)
const TURN = 2 * Math.PI * EXT_PITCH_R; // 160 mm of belt per motor turn (80 T GT2, CAD)

// reach through the steps: folded, starting out (cut), the belt at the motor end, out to 355 mm, back in
function reachAt(step, q) {
  if (step === 0) return 0;
  if (step === 1) return S1 * smooth(0.3, 0.95, q);
  if (step === 2) return lerp(S1, S2, smooth(0.15, 0.95, q));
  if (step === 3) return lerp(S2, STROKE, smooth(0.1, 0.8, q));
  return STROKE * (1 - smooth(0.1, 0.8, q));
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const { P } = rig;
  // the arm alone: everything below and behind it is hidden
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'STOCK', 'PSU', 'BAY_L', 'BAY_R',
    'BASE', 'NEMA23', 'TPUL', 'BELT', 'MIDPLATE', 'RING', 'THR_UP', 'THR_LO', 'MR106']) P[n].visible = false;
  stage.fitGround();
  const reduced = !!ctx.reducedMotion;

  // fixed boxes to frame: the whole arm at full reach, and the right-hand slide where its ball rows
  // front end while it is cut open: there the three members' ends telescope out (retracted, all three
// end at z -120.5 mm in the CAD; the inner member runs out s, the middle member s / 2)
  const box = (min, max) => { const m = new T.Mesh(new T.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2])); m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2); m.updateMatrixWorld(true); return m; };
  const ARM = box([-0.145, 0, -0.121 - STROKE], [0.145, 0.065, 0.29]);
  const SLIDE = box([0.105, 0.035, -0.25], [0.15, 0.045, -0.085]);
  // the left motor end: the pulley, the two idlers beside it, the rear outer idler and the clamps' start
  const DRIVE = box([-0.145, 0.045, 0.205], [-0.02, 0.062, 0.28]);
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      views = {
        arm: stage.frame(ARM, { azimuth: 68, elevation: 28, pad: 1.02, apply: false, refresh: true }),
        cut: stage.frame(SLIDE, { dir: [0.5, 0.75, -0.42], pad: a < 1 ? 1.1 : 1.25, apply: false, refresh: true }),
        belt: stage.frame(DRIVE, { azimuth: -24, elevation: 34, pad: a < 1 ? 1.05 : 1.12, apply: false, refresh: true }),
      };
    }
    return views;
  }

  const cut = stage.sectionPlane([0, -1, 0], Y_TOP); // keeps y <= constant; parked above the arm
  const pulleys = glow(stage, [P.EPUL_L, P.EPUL_R], '#ff6b35', 0.7);
  const beltGlow = glow(stage, rig.belts, '#ff9a4a', 0.7);

  const ov = labelLayer(stage);
  const L = {
    slide: ov.label('Telescoping slide, SAR340', [0.14, 0.05, 0.2], { color: '#fff1e2' }),
    carriage: ov.label('Carriage: 2020 extrusion', [-0.05, 0.065, -0.12], { color: '#fff1e2', side: 'l' }),
    magnets: ov.label('4 electromagnets', [0.0, 0.012, -0.121], { color: '#fff1e2', side: 'l', minW: 420 }),
    motor: ov.label('NEMA 17, one per side', [0.05, 0.06, 0.2425], { color: '#ff6b35' }),
    // in section (from the CAD, right-hand slide at y 41 mm): inner member x 115 to 117 mm, inner
    // ball row 118 to 122, middle member between, outer ball row 124 to 128, outer member 130 to 134
    inner: ov.label('Inner member, on the carriage', [0.116, CUT_Y, END], { color: '#fff1e2', side: 'l' }),
    mid: ov.label('Middle member', [0.123, CUT_Y, END], { color: '#8fc3ff', side: 'l' }),
    outer: ov.label('Outer member, on the frame', [0.132, CUT_Y, END + 0.004], { color: '#fff1e2' }),
    // the motor end, left side (CAD): pulley top, the belt clamps on the carriage (ride with it), the
    // run across the back, and the belt's run along the outside of the slides
    pulley: ov.label('80T motor pulley (CAD)', [-0.04918, 0.06, 0.2425], { color: '#ff6b35' }),
    clamps: ov.label('Both belt ends clamped to the carriage', [-0.11, 0.065, 0.259], { color: '#fff1e2' }),
    back: ov.label('GT2 belt', [-0.105, 0.0574, 0.2765], { color: '#fff1e2', side: 'l' }),
    run: ov.label('GT2 belt, one per side', [0, 0, 0], { color: '#fff1e2', minW: 420 }),
  };
  const runAt = new T.Vector3();
  const hud = readout(ov, `
    <table class="num"><thead><tr><th></th><th>Out</th></tr></thead><tbody>
      <tr><td>Carriage <small>inner member</small></td><td data-k="c"></td></tr>
      <tr><td>Middle member</td><td data-k="m"></td></tr>
      <tr class="rx-hud-x"><td>Inner ball row</td><td data-k="bi"></td></tr>
      <tr class="rx-hud-x"><td>Outer ball row</td><td data-k="bo"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Motor turns <small>80T GT2 pulley, 160 mm a turn</small></span><b class="num" data-k="t"></b></div>`);

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 4);
    const [fx, fy] = ctx.shift();
    stage.setShift(fx, el.clientWidth < 640 ? -0.07 : fy); // on a phone, clear of the readout across the top
    const q = reduced ? 1 : clamp(stepP, 0, 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const s = reachAt(step, q);
    rig.set({ s });

    // camera: the whole arm; close over the right-hand slide while it is cut open; close on the left
    // motor end for the belt; then the whole arm again
    const v = viewsNow();
    const inCut = step === 1 ? k : step === 2 ? 1 - k : 0;
    const view = step === 1 ? blendView(v.arm, v.cut, k) : step === 2 ? blendView(v.cut, v.belt, k)
      : step === 3 ? blendView(v.belt, v.arm, k) : v.arm;
    stage.setView(view);
    // the cut sweeps down to the ball rows as the camera arrives, and back up as it leaves
    cut.set(lerp(Y_TOP, CUT_Y, smooth(0.2, 1, inCut)));

    const inBelt = step === 2 ? k : step === 3 ? 1 - k : 0;
    pulleys(step === 2 ? k : step === 3 ? 1 : step === 4 ? 1 - k : 0);
    beltGlow(step === 2 ? 0.55 * k : step === 3 ? 0.55 : step === 4 ? 0.55 * (1 - k) : 0);
    const whole = step === 1 || step === 2 ? 1 - Math.max(inCut, inBelt) : step === 3 ? k : 1;
    for (const n of ['slide', 'carriage', 'magnets']) L[n].a = step === 0 ? 1 : 0;
    L.motor.a = step === 0 || step === 4 ? 1 : step === 3 ? whole : 0;
    L.pulley.a = L.back.a = smooth(0.6, 1, inBelt);
    L.clamps.a = smooth(0.6, 1, inBelt);
    L.clamps.p.z = 0.259 - s;
    rig.turret.updateMatrixWorld(true);
    rig.beltAnchor.outerR.getWorldPosition(runAt);
    L.run.p.copy(runAt);
    L.run.a = step === 3 ? smooth(0.5, 1, k) : step === 4 ? 1 - smooth(0, 0.4, k) : 0;
    // the section labels ride their members
    L.inner.p.z = END + 0.004 - s;
    L.mid.p.z = END + 0.004 - s / 2;
    for (const n of ['inner', 'mid', 'outer']) L[n].a = smooth(0.6, 1, inCut);

    const mm = s * 1000;
    hud.put('c', `${Math.round(mm)} mm`); hud.put('m', `${Math.round(mm / 2)} mm`);
    hud.put('bi', `${Math.round(0.75 * mm)} mm`); hud.put('bo', `${Math.round(0.25 * mm)} mm`);
    hud.put('t', (s / TURN).toFixed(2));
    hud.put('mini', `Carriage ${Math.round(mm)} mm, middle member ${Math.round(mm / 2)} mm, motor ${(s / TURN).toFixed(2)} turns`);
    ov.update();
    inward(el, ov.labels, [hud.el]);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); cut.remove(); for (const b of [ARM, SLIDE, DRIVE]) { b.geometry.dispose(); b.material.dispose(); } stage.dispose(); } };
}

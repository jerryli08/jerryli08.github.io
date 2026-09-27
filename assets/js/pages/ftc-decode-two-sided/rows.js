// Four rows of wheels (scroll-driven), from Jerry's concept CAD, with the 4-bar at transfer as the CAD
// holds it. Jerry, Sept 27: "the outermost 2 rows of wheels that are not on the 4 bar are fixed to the
// chassis and also driven by the PTO that drives the two rows of wheels on the 4 bar", and "on the 4
// bar, the 2 servos with bevels are for controlling the angles of the 2 arms that hold the rows of
// wheels on the 4 bar". Steps:
//   0 the four rows, named: two on the arms on top of the 4-bar, two outer rows fixed to the chassis
//   1 carrier 2 turns: its belts run up the 4-bar to F and the rows on the arms turn; its side branch
//     (52T -> 12T at G, the shaft forward and the 20T pulley at the front) turns too, and the outer
//     rows turn with that pulley (the belt from it to the rows is not in the CAD)
//   2 cut just in front of the arms: the servo right of F turns its 14T bevel, which turns the 28T
//     bevel on the left arm, and the left arm swings down about F, half as far as the servo
//   3 the servo left of F does the same for the right arm
// Every axis is the CAD's (rig.js, from tools/cad-axes.py): F for the arms, the roller shafts on the
// arms, the 14T bevels along (1, 1, 0) and (-1, 1, 0) through F, G, and the outer rows' axes. The
// picture is a pure function of the scroll. The arm angles are for the animation: how far the
// servos turn the arms is not in the CAD.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, rigRobot, looks, beltDots, mm, AX, DEG, F_RATIO, smooth, lerp, clamp, viewSet, frameBox, hud } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#27c7ff', YEL = '#ffd166';
const ARM = 35 * DEG; // how far each arm swings down in the animation
const TURNS = 1.2; // turns of carrier 2 over step 1 (the picture is slowed down)
const STEPS = [
  { view: 'rows', ghost: 0, run: 0 },
  { view: 'rows', ghost: 1, run: 1 },
  { view: 'arms', ghost: 0, run: 0, arm: 'L' },
  { view: 'arms', ghost: 0, run: 0, arm: 'R' },
];
const CUT_Z = -0.372; // keeps everything behind the last wheel of each row on the arms

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 26 });
  const { model, P, body } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: true, side: true });
  const { piv } = rig;
  const look = looks(stage);
  const reduced = ctx.reducedMotion;
  // the outer plates, the side walls and everything above the arms are left out, to see the rows
  look([P.shell, P.walls, P.top, P.turret, P.ring], 0);
  stage.fitGround();

  // a cut just in front of the arms for the servo steps, parked in front of the robot until then;
  // made before the belt dots (their unlit materials must not get the section-cap shader)
  const cut = stage.sectionPlane([0, 0, -1], 5);
  stage.setCapColor('#3a3631', '#2c2925');
  const dots = {
    belt1: beltDots('belt1', model, BLUE), belt2: beltDots('belt2', piv.linkP, BLUE), belt3: beltDots('belt3', piv.linkP, BLUE),
    belt4: beltDots('belt4', piv.cplr, BLUE), belt5: beltDots('belt5', piv.cplr, BLUE), beltS: beltDots('beltS', model, BLUE),
  };

  const narrow = () => el.clientWidth < el.clientHeight * 1.3;
  const V = viewSet(stage, el, {
    // the whole robot from the front right, all four rows along their length
    rows: () => stage.frame(frameBox([0.46, 0.2, 0.46], [0.2286, 0.12, -0.21]), { azimuth: 34, elevation: 26, pad: narrow() ? 1.0 : 1.02, apply: false, refresh: true }),
    // from the front and a little above, cut just in front of the arms: the back end of the coupler,
    // where the two servos and their bevels sit
    arms: () => stage.frame(frameBox([0.25, 0.12, 0.06], [0.2286, 0.215, -0.405]), { azimuth: 0, elevation: 30, pad: narrow() ? 1.12 : 1.06, apply: false, refresh: true }),
  });

  // parts by role
  const armRows = [P.rollL, P.rollR];
  const outerRows = [P.sideL, P.sideR];
  const path4bar = [P.car2, P.Bpul, P.belt1, P.idler, P.belt2, P.belt3, P.Dpul, P.belt4, P.Epul, P.belt5, P.Fpul];
  const pathSide = [P.beltS, P.Gpul];
  const chassis = [...body, P.ramps, P.bottom, P.plates, P.wheel0, P.wheel1, P.wheel2, P.wheel3, P.mpul0, P.mpul1, P.mpul2, P.mpul3,
    P.omni0, P.omni1, P.omni2, P.omni3, P.pin1, P.pin2, P.idl1, P.idl2, P.chA, P.chB, P.p1f, P.p1b, P.p2f, P.p2b, P.car1, P.spd1, P.spd2,
    P.wormsh, P.beltP, P.linkA, P.linkP, P.cplr];

  const ov = labelLayer(stage);
  const L = {
    arm: ov.label('Rows on the 4-bar’s arms', mm(AX.RR[0], AX.RR[1] + 18, -60), { color: ORANGE }),
    out: ov.label('Outer rows, fixed to the chassis', mm(AX.SIDE_R[0], AX.SIDE_R[1] + 26, -60), { color: BLUE, minW: 520 }),
    outS: ov.label('Outer rows', mm(AX.SIDE_R[0], AX.SIDE_R[1] + 26, -60), { color: BLUE }), // phones
    c2: ov.label('Carrier 2', mm(AX.P2[0], AX.P2[1] + 20, -252.9), { color: BLUE, side: 'l' }),
    G: ov.label('G', mm(AX.G[0] + 8, AX.G[1], -255.6), { color: BLUE }),
    front: ov.label('20T pulley at the front', mm(AX.G[0] + 8, AX.G[1], 6.5), { color: BLUE, minW: 520 }),
    F: ov.label('F', mm(AX.F[0], AX.F[1] + 16, -407.1), { color: BLUE, side: 'l', minW: 520 }),
    srvL: ov.label('Servo for the left arm', mm(290, 281, -407.1), { color: YEL, minW: 520 }),
    srvR: ov.label('Servo for the right arm', mm(167, 281, -411.9), { color: YEL, side: 'l', minW: 520 }),
    srvLS: ov.label('Servo', mm(290, 281, -407.1), { color: YEL }), // phones
    srvRS: ov.label('Servo', mm(167, 281, -411.9), { color: YEL, side: 'l' }),
    b14: ov.label('14T bevels', mm(AX.F[0], 262, -409), { color: YEL, minW: 520 }),
    b28: ov.label('28T bevel on each arm, at F', mm(AX.F[0] - 6, AX.F[1] - 12, -396.7), { color: ORANGE, side: 'l', minW: 520 }),
    armL: ov.label('Left arm', mm(0, 0, -391.6), { color: ORANGE, side: 'l' }),
    armR: ov.label('Right arm', mm(0, 0, -427.4), { color: ORANGE }),
  };
  const H = hud(ov.layer, [
    ['f', 'F, to the rows on the 4-bar', true], ['g', 'G, toward the outer rows', true],
    ['aL', 'Left arm'], ['aR', 'Right arm'],
  ], true);
  H.put('f', `${F_RATIO.toFixed(2)} turns per turn of carrier 2`);
  H.put('g', `${(52 / 12).toFixed(2)} turns per turn of carrier 2`);
  const armText = (a) => (Math.abs(a) < 0.05 * DEG ? 'as in the CAD' : `${(Math.abs(a) / DEG).toFixed(1)}° down, its servo ${(2 * Math.abs(a) / DEG).toFixed(1)}°`);
  const onArm = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - AX.F[0], dy = y - AX.F[1]; return [(AX.F[0] + c * dx - s * dy) / 1000, (AX.F[1] + s * dx + c * dy) / 1000]; };

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, el.clientWidth >= 640 ? sy - 0.04 : sy); // a little lower, clear of the readout
    const S = STEPS[step], prev = STEPS[Math.max(0, step - 1)];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);

    // carrier 2 turns only in step 1 (the rows on the arms, the side branch and the outer rows with it)
    const run = step < 1 ? 0 : step > 1 || reduced ? 1 : smooth(0.08, 0.92, stepP);
    const car2 = reduced ? 0 : run * TURNS * 2 * Math.PI;
    piv.car2.setAngle(car2);
    // the arms: the left one swings in step 2, the right one in step 3, each after the camera settles
    const armK = (s) => (step < s ? 0 : step > s || reduced ? 1 : smooth(0.45, s === STEPS.length - 1 ? 0.8 : 0.9, stepP));
    rig.setArms(ARM * armK(2), -ARM * armK(3));
    rig.setRollerPath(car2);
    const b = 4 * car2, kin = rig.kin;
    dots.belt1.set(car2 * dots.belt1.r1);
    dots.belt2.set((b - kin.psi) * dots.belt2.r1);
    dots.belt3.set((b - kin.psi) * dots.belt3.r1);
    dots.belt4.set((b - kin.phi) * dots.belt4.r1);
    dots.belt5.set((b - kin.phi) * dots.belt5.r1);
    dots.beltS.set(car2 * dots.beltS.r1);

    // camera, and the cut for the arm steps
    V.place(prev.view, S.view, k);
    const cutK = lerp(prev.view === 'arms' ? 1 : 0, S.view === 'arms' ? 1 : 0, k);
    cut.set(cutK > 0.002 ? lerp(0.03, CUT_Z, smooth(0, 1, cutK)) : 5);
    for (const d of Object.values(dots)) d.mesh.visible = cutK < 0.3;

    // looks: in step 1 the chassis goes see-through and both of carrier 2's paths light up
    const ghost = lerp(prev.ghost, S.ghost, k);
    const lit = 0.5 * ghost;
    look(chassis, 1 - 0.78 * ghost);
    for (const q of [...path4bar, ...pathSide]) look(q, 1, BLUE, 0.1 + lit);
    look(armRows, 1, ghost > 0.5 ? BLUE : ORANGE, ghost > 0.5 ? 0.1 + lit : 0.35 * (1 - ghost / 0.5) + 0.1 * cutK);
    // the outer rows and their end plates step aside in the arm view (they sit behind the cut, below the arms)
    look(outerRows, 1 - cutK, BLUE, 0.3 + 0.3 * ghost);
    look(P.sideplates, (1 - 0.78 * ghost) * (1 - cutK));
    // the arm steps: the servos' bevels and the arm that is moving light up
    const aL = step === 2 ? 1 : step === 3 ? 1 - k : 0, aR = step === 3 ? k : 0;
    look(P.bevL, 1 - 0.78 * ghost, YEL, 0.5 * cutK * (0.4 + 0.6 * aL));
    look(P.bevR, 1 - 0.78 * ghost, YEL, 0.5 * cutK * (0.4 + 0.6 * aR));
    look(P.armL, 1 - 0.78 * ghost, ORANGE, 0.5 * cutK * aL);
    look(P.armR, 1 - 0.78 * ghost, ORANGE, 0.5 * cutK * aR);

    // labels
    const wa = 1 - smooth(0, 0.3, cutK), ia = smooth(0.7, 1, cutK);
    L.arm.a = wa * (1 - ghost);
    const narrowStage = el.clientWidth < 520;
    L.out.a = wa; L.outS.a = narrowStage ? wa : 0;
    L.c2.a = L.G.a = L.front.a = L.F.a = wa * ghost;
    L.srvL.a = L.srvR.a = L.b14.a = L.b28.a = ia;
    L.srvLS.a = L.srvRS.a = narrowStage ? ia : 0;
    L.armL.p.set(...onArm(AX.RL[0] + 10, AX.RL[1] - 12, rig.arms[0]), -0.3916);
    L.armR.p.set(...onArm(AX.RR[0] - 10, AX.RR[1] - 12, rig.arms[1]), -0.4274);
    L.armL.a = L.armR.a = ia;
    H.put('aL', armText(rig.arms[0]));
    H.put('aR', armText(rig.arms[1]));
    H.put('mini', step < 2 ? `F ${F_RATIO.toFixed(2)} and G ${(52 / 12).toFixed(2)} turns per turn of carrier 2`
      : `Left arm ${(rig.arms[0] / DEG).toFixed(0)}°, right arm ${(-rig.arms[1] / DEG).toFixed(0)}°: each servo turns twice as far`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); for (const d of Object.values(dots)) d.dispose(); stage.dispose(); } };
}

// The differential PTO (scroll-driven): the two intake motors run through the three cases, and the
// reader sees which output moves. Steps:
//   0 at rest, the whole intake with its parts named
//   1 same way: carrier 2 turns, the belts run to the rollers and the side belt toward the outer rows, the 4-bar holds
//   2 opposite ways: carrier 1 turns, the worm swings the 4-bar out to its left endstop, the rollers stop
//   3 one motor: both carriers turn at half speed, the 4-bar swings back to transfer while the rollers run
//   4 inside the differentials: cut open at their axes, running the same way again
// While the motors drive (steps 1 to 3) the camera is in close on the gearbox (Jerry, Sept 27), on a
// view framed once at rest, and the motor input chain (pinions, 48T idlers, the 24T gears and pod
// shafts, the front gear row and the back 30T belt) lights up yellow along with the two output paths.
// Every gear, carrier, spider, pulley and link turns about its real axis in the CAD by the ratios
// the tooth counts give (rig.js train()). The motor angles are a pure function of the scroll: each
// step ramps its motors up and down over the step, and the amount they turn is set so the 4-bar
// lands exactly on its endstop (step 2) and back on transfer (step 3). The readout shows the real
// no-load speeds for goBILDA 5000 motors at 5,800 RPM, scaled by the same ramp.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, rigRobot, train, looks, beltDots, mm, AX, DEG, THETA0, THETA_LEFT, MOTOR_RPM, F_RATIO,
  smooth, lerp, clamp, viewSet, frameBox, hud, fmt } from './rig.js';

const C1 = '#ff6b35', C2 = '#27c7ff', CIN = '#ffd166';
const TURN = 2 * Math.PI;
const SWING = (THETA_LEFT - THETA0) * 14 * (48 / 9); // motor 2 minus motor 1 (rad) that puts the 4-bar on its left endstop
// per step: motor speeds as fractions of 5,800 RPM, and how far each motor turns over the step (rad)
const STEPS = [
  { s: [0, 0], d: [0, 0], view: 'whole' },
  { s: [1, 1], d: [6 * TURN, 6 * TURN], view: 'gear' },
  { s: [-1, 1], d: [-SWING / 2, SWING / 2], view: 'gear' },
  { s: [1, 0], d: [SWING, 0], view: 'gear' },
  { s: [1, 1], d: [4 * TURN, 4 * TURN], view: 'cut' },
];
// speed over a step: up, hold, down (the readout); its integral, normalised, spreads each step's turns
const ramp = (x) => smooth(0.03, 0.2, x) * (1 - smooth(0.78, 0.95, x));
const N = 400, G = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) G[i] = G[i - 1] + ramp((i - 0.5) / N) / N;
for (let i = 1; i <= N; i++) G[i] /= G[N];
const Gat = (x) => { const t = clamp(x, 0, 1) * N, i = Math.min(N - 1, Math.floor(t)); return lerp(G[i], G[i + 1], t - i); };
const BASE = [[0, 0]];
for (let i = 1; i < STEPS.length; i++) BASE.push([BASE[i - 1][0] + STEPS[i - 1].d[0], BASE[i - 1][1] + STEPS[i - 1].d[1]]);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 30 });
  const { model, P, body } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: true });
  const { piv } = rig;
  const look = looks(stage);
  const reduced = ctx.reducedMotion;
  // only the intake: everything around it is hidden
  look([P.shell, P.sideL, P.sideR, P.sideplates, P.walls, P.plates, P.ramps, P.bottom, P.top, P.turret, P.ring, P.wheel0, P.wheel1, P.wheel2, P.wheel3], 0);
  stage.fitGround();

  // seen from the front with the front drive pod cut away (keeps z <= -118 mm); a second cut through
  // the differentials' axes (keeps y <= 36.5 mm) comes in for the last step, parked above everything until then
  const cutZ = stage.sectionPlane([0, 0, -1], -0.118);
  const cutY = stage.sectionPlane([0, -1, 0], 5);
  stage.setCapColor('#8f867c', '#766e65');

  // the moving belts carry dots (annotation) so the roller path reads as running. Made after the
  // section planes: their basic materials must not get the section-cap shader (it needs lighting)
  const dots = {
    belt1: beltDots('belt1', model, C2), belt2: beltDots('belt2', piv.linkP, C2), belt3: beltDots('belt3', piv.linkP, C2),
    belt4: beltDots('belt4', piv.cplr, C2), belt5: beltDots('belt5', piv.cplr, C2), beltP: beltDots('beltP', model, CIN),
    beltS: beltDots('beltS', model, C2),
  };
  const V = viewSet(stage, el, {
    whole: () => stage.frame(frameBox([0.3, 0.26, 0.17], [0.225, 0.13, -0.205]), { azimuth: 22, elevation: 16, pad: 1.0, apply: false, refresh: true }),
    // in close on the gearbox: both motors, their pinions and idlers, the differentials, the worm and
    // the pulleys on carrier 2 (a fixed box, so nothing moving is framed)
    gear: () => stage.frame(frameBox([0.14, 0.095, 0.16], [0.236, 0.058, -0.21]), { azimuth: 30, elevation: 26, pad: el.clientWidth < el.clientHeight * 1.3 ? 1.2 : 1.1, apply: false, refresh: true }),
    cut: () => stage.frame(frameBox([0.11, 0.04, 0.115], [0.258, 0.03, -0.206]), { azimuth: 0, elevation: 80, pad: el.clientWidth < el.clientHeight * 1.3 ? 1.7 : 1.3, apply: false, refresh: true }),
  });

  // labels: the whole intake, and the insides of the differentials
  const ov = labelLayer(stage);
  const whole = [
    ov.label('Motor 1', mm(255.2, 97, -176), { color: '#fff1e2' }),
    ov.label('Motor 2', mm(213.9, 104, -236), { color: '#fff1e2', side: 'l' }),
    ov.label('Differential 1', mm(231.1, 20, -170), { color: C1, side: 'l' }),
    ov.label('Differential 2', mm(285.1, 20, -172), { color: C2 }),
    ov.label('Worm', mm(183.6, 36, -151.4), { color: C1, side: 'l', minW: 480 }),
  ];
  const side = ov.label('Side belt, to the outer rows', mm(AX.G[0] + 7, AX.G[1], -255.6), { color: C2, minW: 520 });
  const bar = ov.label('4-bar', mm(0, 0, -138), { color: C1, side: 'l' });
  const roll = ov.label('F, split to both rollers', mm(0, 0, -407), { color: C2 });
  const input = ov.label('Motor input', mm(AX.I1[0] + 10, AX.I1[1] - 14, -154.3), { color: CIN, minW: 480 });
  const inside = [
    ov.label('14T side gears', mm(AX.P1[0] - 9, 36, -227.4), { side: 'l' }),
    ov.label('28T bevel, to the worm', mm(AX.P1[0] - 16, 36, -161.7), { color: C1, side: 'l', minW: 480 }),
    ov.label('48T and 52T pulleys', mm(AX.P2[0] + 17, 36, -258), { color: C2, minW: 480 }),
  ];
  const spider = ov.label('28T spider', mm(0, 0, -203.5), {});
  const carrier = ov.label('Carrier 1', mm(0, 0, -196), { color: C1, side: 'l' });
  const onCoupler = (x, y) => { const k = rig.kin, c = Math.cos(k.phi), s = Math.sin(k.phi), dx = x - AX.C0[0], dy = y - AX.C0[1]; return [(k.C[0] + c * dx - s * dy) / 1000, (k.C[1] + s * dx + c * dy) / 1000]; };
  const onCarrier1 = (x, a) => [(AX.P1[0] + Math.cos(a) * (x - AX.P1[0])) / 1000, (AX.P1[1] + Math.sin(a) * (x - AX.P1[0])) / 1000];

  const H = hud(ov.layer, [
    ['m1', 'Motor 1'], ['m2', 'Motor 2'], ['c1', 'Carrier 1, to the 4-bar', true], ['c2', 'Carrier 2, to the wheels', true],
    ['bar', '4-bar'], ['f', 'F, to both rollers'],
  ], true);
  const signed = (v) => (Math.abs(v) < 0.5 ? '0' : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);

  // each output path, split into its part in the gearbox and its part out on the linkage, which goes
  // see-through while the camera is in close on the gearbox (the front links would hide the gears)
  const path1 = [P.car1, P.wormsh], path1L = [P.linkA];
  // carrier 2 also drives the side branch to the two outer rows (Jerry, Sept 27): its 52T pulley, the
  // belt and the 12T pulley at G with the shaft and the 20T pulley it turns
  const path2 = [P.car2, P.Bpul, P.belt1, P.beltS, P.Gpul], path2L = [P.idler, P.Dpul, P.Epul, P.Fpul, P.belt2, P.belt3, P.belt4, P.belt5, P.rollL, P.rollR];
  const linkage = [P.linkP, P.cplr, P.armL, P.armR];
  // the two carbon fiber bearing plates of the gearbox (the only carbon parts in the static model)
  // stand in front of the gear row and behind the belts: see-through in close too
  const cfPlates = [];
  for (const b of body) b.traverse((m) => { if (m.isMesh && [].concat(m.material).some((x) => x.name === 'carbon')) cfPlates.push(m); });
  const pathIn = [P.pin1, P.pin2, P.idl1, P.idl2, P.p1f, P.p1b, P.p2f, P.p2b, P.chA, P.chB, P.beltP];
  const MAX = (9 / 48) * 2 * MOTOR_RPM; // 2,175 RPM: either carrier's top speed

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    // a little lower on a wide canvas, clear of the readout in the top right corner
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, el.clientWidth >= 640 ? sy - 0.05 : sy);
    const S = STEPS[step], prev = STEPS[Math.max(0, step - 1)];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);

    // motors: the angle each has turned, a pure function of the scroll
    const g = step === 0 ? 0 : Gat(stepP);
    const a1 = BASE[step][0] + S.d[0] * g, a2 = BASE[step][1] + S.d[1] * g;
    const t = train(a1, a2);
    for (const n of ['pin1', 'pin2', 'idl1', 'idl2', 'chA', 'chB', 'p1f', 'p1b', 'p2f', 'p2b', 'car1', 'car2', 'wormsh']) piv[n].setAngle(t[n]);
    piv.spd1.setAngle(t.spd1); piv.spd2.setAngle(t.spd2);
    const kin = rig.setFourbar(THETA0 + t.fourbar);
    rig.setRollerPath(t.car2);
    const b = 4 * t.car2;
    dots.belt1.set(t.car2 * dots.belt1.r1);
    dots.belt2.set((b - kin.psi) * dots.belt2.r1);
    dots.belt3.set((b - kin.psi) * dots.belt3.r1);
    dots.belt4.set((b - kin.phi) * dots.belt4.r1);
    dots.belt5.set((b - kin.phi) * dots.belt5.r1);
    dots.beltP.set(t.p1b * dots.beltP.r1);
    dots.beltS.set(t.car2 * dots.beltS.r1);

    // real no-load speeds for this moment of the step
    const r = step === 0 ? 0 : ramp(stepP);
    const w1 = S.s[0] * MOTOR_RPM * r, w2 = S.s[1] * MOTOR_RPM * r;
    const c1 = (9 / 48) * (w2 - w1), c2 = (9 / 48) * (w1 + w2);
    const barRpm = c1 / 14;
    H.put('m1', `${signed(w1)} RPM`); H.put('m2', `${signed(w2)} RPM`);
    H.put('c1', `${fmt(Math.abs(c1))} RPM`); H.put('c2', `${fmt(Math.abs(c2))} RPM`);
    const th = THETA0 + t.fourbar;
    const where = Math.abs(th - THETA_LEFT) < 0.2 * DEG ? 'on its left endstop' : Math.abs(th - THETA0) < 0.2 * DEG ? 'at transfer' : `${(th / DEG).toFixed(0)}°`;
    H.put('bar', Math.abs(barRpm) < 0.5 ? `holds, ${where}` : `${fmt(Math.abs(barRpm))} RPM (${fmt(Math.round(Math.abs(barRpm) * 6 / 10) * 10)}°/s), ${barRpm > 0 ? 'out to the left' : 'back toward transfer'}`);
    H.put('f', `${fmt(Math.abs(c2 * F_RATIO))} RPM`);
    H.put('mini', `Motors ${signed(w1)} and ${signed(w2)} RPM: 4-bar ${Math.abs(barRpm) < 0.5 ? 'holds' : `${fmt(Math.abs(barRpm))} RPM`}, F ${fmt(Math.abs(c2 * F_RATIO))} RPM`);

    // whichever path is moving lights up; in close on the gearbox the linkage is see-through
    const gz = lerp(prev.view === 'gear' ? 1 : 0, S.view === 'gear' ? 1 : 0, k);
    const fade = 1 - 0.75 * gz;
    const k1 = 0.14 + 0.46 * Math.min(1, Math.abs(c1) / MAX), k2 = 0.14 + 0.46 * Math.min(1, Math.abs(c2) / MAX);
    look(path1, 1, C1, k1); look(path1L, fade, C1, k1);
    look(path2, 1, C2, k2); look(path2L, fade, C2, k2);
    look(linkage, fade);
    look(cfPlates, 1 - 0.7 * gz);
    // in close, the front cut moves back past the front drive pod's inner plate (z -118 to -129 mm),
    // still in front of the gear row at z -134 mm
    cutZ.set(-0.118 - 0.011 * gz);
    look(pathIn, 1, CIN, 0.14 + 0.46 * Math.min(1, Math.max(Math.abs(w1), Math.abs(w2)) / MOTOR_RPM));

    // the cut through the differentials, and the camera
    const cutK = lerp(prev.view === 'cut' ? 1 : 0, S.view === 'cut' ? 1 : 0, k);
    cutY.set(cutK > 0.002 ? lerp(0.30, 0.0365, smooth(0, 1, cutK)) : 5);
    V.place(prev.view, S.view, k);
    for (const d of Object.values(dots)) d.mesh.visible = cutK < 0.35;

    // labels follow the parts they name
    const [bx, by] = [(AX.A[0] + kin.C[0]) / 2000, (AX.A[1] + kin.C[1]) / 2000];
    bar.p.set(bx, by, -0.138);
    const [fx, fy] = onCoupler(AX.F[0] + 12, AX.F[1]);
    roll.p.set(fx, fy, -0.407);
    const [qx, qy] = onCarrier1(245, t.car1); spider.p.set(qx, qy, -0.2035);
    const [kx, ky] = onCarrier1(212.5, t.car1); carrier.p.set(kx, ky, -0.196);
    const wa = 1 - smooth(0, 0.5, cutK), ia = smooth(0.5, 1, cutK);
    // the whole-intake labels in the wide view; in close on the gearbox only the motor input stays named
    for (const l of whole) l.a = wa;
    for (const l of [bar, roll, side]) l.a = wa * (1 - gz);
    input.a = wa * gz;
    for (const l of [...inside, spider, carrier]) l.a = ia;
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); for (const d of Object.values(dots)) d.dispose(); stage.dispose(); } };
}

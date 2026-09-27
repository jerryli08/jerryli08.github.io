// The roller belt path (scroll-driven): five GT2 belt stages from carrier 2 up the passive side of
// the moving 4-bar to the top of the coupler, drawn in magenta. The belts and pulleys are the CAD's;
// the running dots are an annotation on each belt's pitch line. Steps light up the stages in order
// (1; 2 and 3; 4 and 5), then the split at F to both roller shafts (Jerry, Sept 27: the roller drive
// at F is split to both rollers; the split itself is not in the CAD, so the shafts turn with F), then
// all of it while the 4-bar swings out to its right endstop and, in the last step, across to its
// left one, which shows that no belt changes length as the linkage moves. The rollers turn with the
// scroll: carrier 2's angle is a function of the scroll position, and so is the 4-bar's.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, rigRobot, looks, beltDots, mm, AX, DEG, THETA0, THETA_LEFT, THETA_RIGHT, F_RATIO,
  smooth, lerp, clamp, frameBox, hud, viewSet } from './rig.js';

const MAG = '#ff2bd6';
const BELTS = ['belt1', 'belt2', 'belt3', 'belt4', 'belt5'];
const PUL = { belt1: ['car2', 'Bpul'], belt2: ['Bpul', 'idler'], belt3: ['idler', 'Dpul'], belt4: ['Dpul', 'Epul'], belt5: ['Epul', 'Fpul'] };
const STEPS = [
  { on: ['belt1'], st: 'Stage 1, on the frame', pul: 'Carrier 2, 48T, to B, 12T', ratio: '4 : 1 up' },
  { on: ['belt2', 'belt3'], st: 'Stages 2 and 3, on the passive link', pul: 'B to the idler to D, all 12T', ratio: '1 : 1' },
  { on: ['belt4', 'belt5'], st: 'Stages 4 and 5, on the coupler', pul: 'D to E, 12T; E, 12T, to F, 38T', ratio: '1 : 1, then 12 : 38' },
  { on: ['belt5'], roll: true, view: 'top', st: 'F, split to both rollers', pul: 'F drives both roller shafts', ratio: 'F to the shafts: not in the CAD' },
  { on: BELTS, roll: true, st: 'All five, and both rollers', pul: '48T to 12T, 12T through both joints, 12T to 38T', ratio: '4 x 12/38 to F' },
  { on: BELTS, roll: true, st: 'All five, and both rollers', pul: '48T to 12T, 12T through both joints, 12T to 38T', ratio: '4 x 12/38 to F' },
];
const SWING_STEP = 4; // the first step with the 4-bar moving
const TURNS = 0.9; // turns of carrier 2 per step of scrolling (the picture is slowed down)

// the 4-bar over the scroll: at transfer for the first three steps, then out to the right endstop,
// then across to the left one (the last step finishes early: the section unpins before its end)
function thetaAt(step, x) {
  if (step < SWING_STEP) return THETA0;
  if (step === SWING_STEP) return lerp(THETA0, THETA_RIGHT, smooth(0.04, 0.7, x));
  return lerp(THETA_RIGHT, THETA_LEFT, smooth(0.04, 0.55, x));
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 28 });
  const { model, P, body } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: true });
  const { piv } = rig;
  const look = looks(stage);
  const reduced = ctx.reducedMotion;
  look([P.shell, P.sideL, P.sideR, P.sideplates, P.walls, P.plates, P.ramps, P.bottom, P.top, P.turret, P.ring, P.wheel0, P.wheel1, P.wheel2, P.wheel3], 0);
  look([P.armL, P.armR], 0.3);
  look([P.cplr, P.linkA, P.linkP], 0.45);
  // the frame and gearbox behind the belts, see-through
  look([...body, P.car1, P.p1f, P.p1b, P.p2f, P.p2b, P.chA, P.chB, P.idl1, P.idl2, P.pin1, P.pin2, P.wormsh, P.spd1, P.spd2, P.beltP, P.beltS, P.Gpul], 0.16);
  stage.fitGround();

  const dots = {
    belt1: beltDots('belt1', model, MAG), belt2: beltDots('belt2', piv.linkP, MAG), belt3: beltDots('belt3', piv.linkP, MAG),
    belt4: beltDots('belt4', piv.cplr, MAG), belt5: beltDots('belt5', piv.cplr, MAG),
  };

  // from behind the robot, nearly square on to the belts (they all run in planes across the robot),
  // framed once on a fixed box that holds the linkage at both endstops; and, for the split at F, the
  // top of the coupler at transfer with both roller shafts along their length
  const V = viewSet(stage, el, {
    belts: () => stage.frame(frameBox([0.34, 0.25, 0.16], [0.228, 0.125, -0.33]), { azimuth: 162, elevation: 12, pad: 1.14, apply: false, refresh: true }),
    top: () => stage.frame(frameBox([0.19, 0.07, 0.44], [0.2286, 0.215, -0.21]), { azimuth: 128, elevation: 24, pad: el.clientWidth < el.clientHeight * 1.3 ? 1.08 : 1.02, apply: false, refresh: true }),
  });

  const ov = labelLayer(stage);
  const L = {
    c2: ov.label('Carrier 2', mm(AX.P2[0] + 18, AX.P2[1], -262), { color: MAG }),
    B: ov.label('B', mm(AX.B[0] + 8, AX.B[1], -289), { color: MAG }),
    idl: ov.label('Idler', mm(0, 0, -291), { color: MAG, side: 'l' }),
    D: ov.label('D', mm(0, 0, -287), { color: MAG }),
    E: ov.label('E', mm(0, 0, -294), { color: MAG }),
    F: ov.label('F, roller drive', mm(0, 0, -407), { color: MAG, side: 'l' }),
    RL: ov.label('Roller shaft', mm(0, 0, -300), { color: MAG, side: 'l' }),
    RR: ov.label('Roller shaft', mm(0, 0, -300), { color: MAG }),
  };
  const LBY = { belt1: ['c2', 'B'], belt2: ['B', 'idl'], belt3: ['idl', 'D'], belt4: ['D', 'E'], belt5: ['E', 'F'] };
  const H = hud(ov.layer, [['st', 'Stage'], ['pul', 'Pulleys', true], ['ratio', 'Ratio'], ['f', 'F per turn of carrier 2', true]], true);
  H.put('f', `${F_RATIO.toFixed(3)} turns`);
  const onCoupler = (x, y) => { const k = rig.kin, c = Math.cos(k.phi), s = Math.sin(k.phi), dx = x - AX.C0[0], dy = y - AX.C0[1]; return [(k.C[0] + c * dx - s * dy) / 1000, (k.C[1] + s * dx + c * dy) / 1000]; };
  const onLinkP = (x, y) => { const a = rig.kin.psi, c = Math.cos(a), s = Math.sin(a), dx = x - AX.B[0], dy = y - AX.B[1]; return [(AX.B[0] + c * dx - s * dy) / 1000, (AX.B[1] + s * dx + c * dy) / 1000]; };

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, el.clientWidth >= 640 ? sy - 0.04 : sy); // a little lower, clear of the readout
    const S = STEPS[step], prev = STEPS[Math.max(0, step - 1)];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    V.place(prev.view || 'belts', S.view || 'belts', k);
    const kin = rig.setFourbar(thetaAt(step, reduced ? 1 : stepP));
    const car2 = reduced ? 0 : (step + stepP) * TURNS * 2 * Math.PI;
    rig.setRollerPath(car2);
    piv.car2.setAngle(car2);
    const b = 4 * car2;
    dots.belt1.set(car2 * dots.belt1.r1);
    dots.belt2.set((b - kin.psi) * dots.belt2.r1);
    dots.belt3.set((b - kin.psi) * dots.belt3.r1);
    dots.belt4.set((b - kin.phi) * dots.belt4.r1);
    dots.belt5.set((b - kin.phi) * dots.belt5.r1);
    // the stages this step is about light up; the others stay faintly tinted
    const lit = {};
    for (const n of BELTS) {
      const w = lerp(prev.on.includes(n) ? 1 : 0, S.on.includes(n) ? 1 : 0, step === 0 ? 1 : k);
      lit[n] = w;
      dots[n].mesh.visible = w > 0.5;
    }
    const pulLit = {};
    for (const n of BELTS) for (const q of PUL[n]) pulLit[q] = Math.max(pulLit[q] || 0, lit[n]);
    for (const n of BELTS) look(P[n], 1, MAG, 0.18 + 0.55 * lit[n]);
    for (const [q, w] of Object.entries(pulLit)) look(P[q], 1, MAG, 0.12 + 0.55 * w);
    // both roller shafts, driven from F
    const rl = lerp(prev.roll ? 1 : 0, S.roll ? 1 : 0, step === 0 ? 1 : k);
    look([P.rollL, P.rollR], 1, MAG, 0.08 + 0.5 * rl);
    // labels on the moving pulleys
    L.idl.p.set(...onLinkP(AX.IDL[0] - 6, AX.IDL[1]), -0.291);
    L.D.p.set(...onCoupler(AX.D0[0] + 6, AX.D0[1]), -0.287);
    L.E.p.set(...onCoupler(AX.E[0] + 8, AX.E[1] + 4), -0.294);
    L.F.p.set(...onCoupler(AX.F[0], AX.F[1] + 14), -0.407);
    L.RL.p.set(...onCoupler(AX.RL[0], AX.RL[1] + 17), -0.33);
    L.RR.p.set(...onCoupler(AX.RR[0], AX.RR[1] + 17), -0.33);
    const la = {};
    for (const n of BELTS) for (const key of LBY[n]) la[key] = Math.max(la[key] || 0, lit[n]);
    la.F = Math.max(la.F || 0, rl); la.RL = la.RR = rl;
    for (const [key, l] of Object.entries(L)) l.a = key === 'RL' || key === 'RR' ? rl : 0.35 + 0.65 * (la[key] || 0);
    H.put('st', S.st); H.put('pul', S.pul); H.put('ratio', S.ratio);
    H.put('mini', `${S.st}: ${S.ratio}`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); for (const d of Object.values(dots)) d.dispose(); stage.dispose(); } };
}

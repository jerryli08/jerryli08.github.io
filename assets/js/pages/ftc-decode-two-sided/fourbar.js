// One 4-bar, two sides (scroll-driven): the linkage from Jerry's CAD, cut just behind its front
// links and seen straight down the robot's length. Scrolling swings it from the transfer position
// (the CAD pose) out to its right endstop, all the way across to its left endstop, and back to
// transfer. The driven link turns about A; the passive link and the coupler follow from the pin
// positions in the CAD (rig.js solve()). The endstops are where the linkage lands on the carbon
// fiber floor plate (Jerry, Sept 27; measured from the CAD, rig.js THETA_RIGHT / THETA_LEFT): the
// end of the linkage around the outboard coupler pin comes down on the plate's top. The picture is
// a pure function of the scroll: the angle is a function of the step and the progress through it.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadRobot, rigRobot, looks, mm, AX, DEG, THETA0, THETA_LEFT, THETA_RIGHT, smooth, lerp, clamp, frameBox, hud } from './rig.js';

const BALL_R = 63.5; // 5 in DECODE ball, mm
const ORANGE = '#ff6b35', GREEN = '#3fb96a', PLATE = '#ffc440';
// where each step ends: transfer, right endstop, left endstop, transfer
const ENDS = [THETA0, THETA_RIGHT, THETA_LEFT, THETA0];
// where the linkage lands on the floor plate (model mm): under the outboard coupler pin, D on the
// right and C on the left, on the plate's top (y 10.0), just behind the section
const STOP_R = [352.98, 10.0, -124], STOP_L = [104.22, 10.0, -124];
const RANGE = `${(THETA_RIGHT / DEG).toFixed(1)}° to ${(THETA_LEFT / DEG).toFixed(1)}° (${((THETA_LEFT - THETA_RIGHT) / DEG).toFixed(0)}°)`;

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 16 });
  const { P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: false });
  const look = looks(stage);
  const reduced = ctx.reducedMotion;
  look([P.shell, P.plates, P.turret, P.ring, P.top], 0);
  // the side walls and the two outer rows of 48 mm wheels (fixed to the chassis), see-through: in the
  // CAD pose the coupler's back end passes through the last wheel of each outer row on its way down
  // to the floor plate (Jerry: the wheel is not the endstop)
  look([P.walls], 0.3);
  look([P.sideL, P.sideR, P.sideplates], 0.22);
  // the tray arms and their roller shafts stay in their CAD pose on the coupler; see-through, so the linkage reads
  look([P.armL, P.armR, P.rollL, P.rollR], 0.28);
  look([P.linkA, P.linkP], 1, ORANGE, 0.34);
  look(P.cplr, 1, ORANGE, 0.12); // the coupler, the bar across the top of the linkage

  // game pieces for scale (not robot CAD): three balls along each side, on the floor outside the frame
  const balls = new THREE.Group();
  const geo = new THREE.SphereGeometry(BALL_R / 1000, 40, 24);
  const mats = [new THREE.MeshStandardMaterial({ color: '#7d4bd8', roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: GREEN, roughness: 0.55 })];
  [-150, -277, -404].forEach((z, i) => {
    for (const x of [-BALL_R - 12, 457.2 + BALL_R + 12]) {
      const b = new THREE.Mesh(geo, mats[(i + (x > 0 ? 1 : 0)) % 2]);
      b.position.set(...mm(x, BALL_R, z)); b.castShadow = true;
      balls.add(b);
    }
  });
  stage.scene.add(balls); // outside stage.root, so the section does not cut them

  // section just behind the front links: everything in front of z = -120 mm is cut away
  stage.sectionPlane([0, 0, -1], -0.120);
  stage.setCapColor('#3a3631', '#2c2925');

  // framed once, at rest, on a fixed box that holds the whole travel. With the step cards over the
  // left of a wide screen, the box is set so the robot and the balls on its right fill the screen to
  // the right of the cards (after ctx.shift()); elsewhere it is centred on the robot.
  let view = null, key = '';
  function frameNow(shift) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    const k = `${a}|${shift}`;
    if (view && k === key) return view;
    key = k;
    const box = shift > 0 ? frameBox([0.7, 0.27, 0.05], [0.2286, 0.135, -0.13])
      : a < 1.3 ? frameBox([0.5, 0.3, 0.05], [0.2286, 0.15, -0.13]) : frameBox([0.76, 0.3, 0.05], [0.2286, 0.15, -0.13]);
    view = stage.frame(box, { azimuth: 0, elevation: 4, pad: a < 1.3 ? 1.02 : 1.05, apply: false, refresh: true });
    return view;
  }

  const ov = labelLayer(stage);
  const pinZ = -0.118;
  const L = {
    A: ov.label('A', mm(...AX.A, -118), { color: ORANGE, side: 'l' }),
    B: ov.label('B', mm(...AX.B, -118), { color: ORANGE }),
    C: ov.label('C', mm(...AX.C0, -118), { color: ORANGE, side: 'l' }),
    D: ov.label('D', mm(...AX.D0, -118), { color: ORANGE }),
    stopR: ov.label('Endstop: the carbon fiber floor plate', mm(...STOP_R), { color: PLATE, side: 'l', minW: 520 }),
    stopL: ov.label('Endstop: the carbon fiber floor plate', mm(...STOP_L), { color: PLATE, minW: 520 }),
    balls: ov.label('Game pieces, for scale', mm(457.2 + BALL_R + 12, 2 * BALL_R + 8, -150), { color: GREEN, side: 'l', minW: 700 }),
  };
  // the endstop labels sit under their dot, below the plate, clear of the linkage
  for (const l of [L.stopR, L.stopL]) l.pill.style.top = '9px';
  const H = hud(ov.layer, [['th', 'Driven link'], ['dx', 'Coupler sideways'], ['dy', 'Coupler height', true], ['tilt', 'Coupler tilt', true], ['range', 'Range, stop to stop']], true);
  H.put('range', RANGE);
  const mid0 = [(AX.C0[0] + AX.D0[0]) / 2, (AX.C0[1] + AX.D0[1]) / 2];
  const sgn = (v, d = 0) => { const t = Math.abs(v).toFixed(d); return `${+t === 0 ? '' : v > 0 ? '+' : '−'}${t}`; };

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, ENDS.length - 1);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy);
    stage.setView(frameNow(sx));
    const from = ENDS[Math.max(0, step - 1)], to = ENDS[step];
    // the last step has less scroll after it (the section unpins), so it finishes sooner
    const k = step === 0 || reduced ? 1 : smooth(0.02, step === ENDS.length - 1 ? 0.5 : 0.72, stepP);
    const th = lerp(from, to, k);
    const kin = rig.setFourbar(th);
    L.C.p.set(...mm(...kin.C, 0)).setZ(pinZ);
    L.D.p.set(...mm(...kin.D, 0)).setZ(pinZ);
    for (const n of ['A', 'B', 'C', 'D']) L[n].a = 1;
    // an endstop label shows while the linkage sits on it
    const onR = smooth(0.4, 0.05, Math.abs(th - THETA_RIGHT) / DEG / 10), onL = smooth(0.4, 0.05, Math.abs(th - THETA_LEFT) / DEG / 10);
    L.stopR.a = onR; L.stopL.a = onL;
    // the floor plate lights up while the linkage sits on it
    look(P.bottom, 1, PLATE, 0.3 * Math.max(onR, onL));
    L.balls.a = step === 0 ? 1 - smooth(0.6, 1, stepP) : 0;
    const mid = [(kin.C[0] + kin.D[0]) / 2, (kin.C[1] + kin.D[1]) / 2];
    const dx = mid[0] - mid0[0], dy = mid[1] - mid0[1];
    H.put('th', `${(th / DEG).toFixed(1)}° from horizontal`);
    H.put('dx', `${sgn(dx)} mm ${Math.abs(dx) < 0.5 ? '' : dx > 0 ? 'right' : 'left'}`.trim());
    H.put('dy', `${sgn(dy)} mm`);
    H.put('tilt', `${sgn(kin.phi / DEG, 1)}°`);
    H.put('mini', `Driven link ${(th / DEG).toFixed(0)}° (stops at ${(THETA_RIGHT / DEG).toFixed(1)}° and ${(THETA_LEFT / DEG).toFixed(1)}°)`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); balls.removeFromParent(); geo.dispose(); mats.forEach((m) => m.dispose()); stage.dispose(); },
  };
}

// The drivetrain from underneath (scroll-driven): four goBILDA 104 mm mecanum wheels on one line
// down the middle, each on its own 5203 motor through a 30T to 120T belt. The wheel axles run along
// the robot's length, so plain driving moves the robot sideways, toward the two intakes.
// Wheel directions come from the rollers in the CAD: at the floor, the rollers of the
// 3625-0001-0104 wheels point along (-1, 0, 1) and those of the 3625-0100-0104 wheels along
// (1, 0, 1), so one of each on an axle makes a pair that can strafe.
// Steps: drive, strafe, turn. Each wheel's angle is a pure function of the scroll: the sum of the
// turns it made in the earlier steps plus its turns so far in this one.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadRobot, rigRobot, looks, mm, smooth, clamp, frameBox, hud } from './rig.js';

const RPM = 1620 / 4; // 5203-2402-0003 (1,620 RPM) through 30T:120T
const TURNS = 1.6; // wheel turns per step of scrolling (the picture is slowed down; the numbers are real)
// wheel order: 0 front 0001, 1 front 0100, 2 back 0001, 3 back 0100; front pair 151 mm ahead of centre
const MODES = [
  { w: [1, 1, 1, 1], arrow: 0, what: 'All four the same way', move: 'Toward one intake side' },
  { w: [-1, 1, -1, 1], arrow: Math.PI / 2, what: 'Each axle’s pair opposite', move: 'Along its length' },
  { w: [1, 1, -1, -1], arrow: null, what: 'Front pair against back pair', move: 'Turns about its middle' },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 30, shadow: false });
  const { P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: false, drive: true });
  const look = looks(stage);
  const reduced = ctx.reducedMotion;
  // only the chassis: everything above the drive pods is hidden, and the floor plates, to see the wheels
  look([P.bottom, P.ramps, P.shell, P.walls, P.top, P.turret, P.ring, P.sidewheels, P.armL, P.armR, P.cplr, P.belt4, P.belt5, P.Dpul, P.Epul, P.Fpul, P.linkA, P.linkP], 0);
  look([P.wheel0, P.wheel1, P.wheel2, P.wheel3], 1, '#ff2bd6', 0.12);
  let view = null, aspect = 0;
  function frameNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!view || a !== aspect) { aspect = a; view = stage.frame(frameBox([0.3, 0.1, 0.46], [0.2286, 0.05, -0.21]), { azimuth: 72, elevation: -42, pad: a < 1.3 ? 1.2 : 1.22, apply: false, refresh: true }); }
    return view;
  }

  // motion arrow under the robot (annotation)
  const arrowMat = new THREE.MeshBasicMaterial({ color: '#ff2bd6', side: THREE.DoubleSide, transparent: true, opacity: 0.85, toneMapped: false });
  const shape = new THREE.Shape();
  shape.moveTo(-0.11, -0.022); shape.lineTo(0.05, -0.022); shape.lineTo(0.05, -0.05); shape.lineTo(0.12, 0); shape.lineTo(0.05, 0.05); shape.lineTo(0.05, 0.022); shape.lineTo(-0.11, 0.022);
  const arrowGeo = new THREE.ShapeGeometry(shape);
  const arrow = new THREE.Mesh(arrowGeo, arrowMat);
  arrow.rotation.x = Math.PI / 2; // flat on the floor
  const holder = new THREE.Group();
  holder.position.set(...mm(228.6, -3, -210.2));
  holder.add(arrow);
  const ringGeo = new THREE.TorusGeometry(0.16, 0.006, 6, 64, Math.PI * 1.6);
  const ring = new THREE.Mesh(ringGeo, arrowMat);
  ring.rotation.x = Math.PI / 2;
  holder.add(ring);
  stage.scene.add(holder);

  const ov = labelLayer(stage);
  const lw = ov.label('Mecanum wheels, one line', mm(228.6, 0, -59.2), { color: '#ff2bd6' });
  const lo = ov.label('32 mm omni wheel', mm(97.1, 0, 6.4), { side: 'l', minW: 480 });
  const H = hud(ov.layer, [['what', 'Wheels'], ['move', 'Robot'], ['rpm', 'Wheel speed, no load', true], ['v', 'Top speed, no load', true]], true);
  H.put('rpm', `${RPM} RPM`); H.put('v', '2.2 m/s (7.2 ft/s)');

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, MODES.length - 1);
    stage.setShift(...ctx.shift());
    stage.setView(frameNow());
    const m = MODES[step];
    // wheel turn so far: earlier steps in full, this one up to here (eased in so a new direction starts gently)
    const x = reduced ? 0 : smooth(0, 1, stepP) * 0.5 + stepP * 0.5;
    for (let i = 0; i < 4; i++) {
      let a = 0;
      for (let j = 0; j < step; j++) a += reduced ? 0 : MODES[j].w[i];
      a = (a + m.w[i] * x) * TURNS * 2 * Math.PI;
      // + means the robot moves toward +x (drive), +z (strafe) or turns counterclockwise from above (turn)
      rig.piv[`wheel${i}`].setAngle(-a);
      rig.piv[`mpul${i}`].setAngle(-a * 4);
    }
    arrow.visible = m.arrow !== null; ring.visible = m.arrow === null;
    if (m.arrow !== null) arrow.rotation.z = m.arrow;
    ring.rotation.z = -x * 1.2;
    stage.invalidate();
    lw.a = 1; lo.a = step === 0 ? 1 : 0.7;
    H.put('what', m.what); H.put('move', m.move);
    H.put('mini', `${m.what}: ${m.move.toLowerCase()}`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); holder.removeFromParent(); arrowGeo.dispose(); ringGeo.dispose(); arrowMat.dispose(); stage.dispose(); } };
}

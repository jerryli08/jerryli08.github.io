// The drivetrain from underneath: four goBILDA 104 mm mecanum wheels on one line down the middle,
// each on its own 5203 motor through a 30T to 120T belt. The wheel axles run along the robot's
// length, so plain driving moves the robot sideways, toward the two intakes.
// Wheel directions come from the rollers in the CAD: at the floor, the rollers of the
// 3625-0001-0104 wheels point along (-1, 0, 1) and those of the 3625-0100-0104 wheels along
// (1, 0, 1), so one of each on an axle makes a pair that can strafe.
import { createStage } from '/assets/js/lib/stage.js';
import { playToggle, readout, segmented } from '/assets/js/lib/ui.js';
import * as THREE from 'three';
import { loadRobot, rigRobot, fade, mm, AX } from './rig.js';
import { createLabels } from './labels.js';

const WHEEL_R = 52, RPM = 1620 / 4; // 5203-2402-0003 (1,620 RPM) through 30T:120T
const SLOW = 20;
// wheel order: 0 front 0001, 1 front 0100, 2 back 0001, 3 back 0100; front pair 151 mm ahead of centre
const MODES = {
  drive: { label: 'Drive', w: [1, 1, 1, 1], arrow: [1, 0], text: 'All four wheels the same way: the robot moves toward one of the two intake sides' },
  strafe: { label: 'Strafe', w: [-1, 1, -1, 1], arrow: [0, 1], text: 'The two wheels on each axle opposite: the robot slides along its length' },
  turn: { label: 'Turn', w: [1, 1, -1, -1], arrow: null, text: 'Front pair against back pair: the robot turns about its middle' },
};

export async function mount(el, ctx) {
  const stage = createStage(el, { fov: 30, shadow: false });
  const { P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: false, drive: true });
  // only the chassis: everything above the drive pods is hidden, and the floor plates, to see the wheels
  fade([P.bottom, P.ramps, P.shell, P.walls, P.top, P.turret, P.ring, P.sidewheels, P.armL, P.armR, P.cplr, P.belt4, P.belt5, P.Dpul, P.Epul, P.Fpul, P.linkA, P.linkP], 0);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.46));
  box.position.set(0.2286, 0.05, -0.21);
  box.updateMatrixWorld();
  const view = { azimuth: 72, elevation: -42, pad: el.clientWidth < el.clientHeight * 1.3 ? 1.2 : 1.04 };
  stage.frame(box, view);

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
  // turning: a ring of arrow heads
  const ringGeo = new THREE.TorusGeometry(0.16, 0.006, 6, 64, Math.PI * 1.6);
  const ring = new THREE.Mesh(ringGeo, arrowMat);
  ring.rotation.x = Math.PI / 2;
  holder.add(ring);
  stage.scene.add(holder);

  const labels = createLabels(el);
  labels.set([
    { key: 'w', text: 'Mecanum wheels, one line', p: mm(228.6, 0, -59.2), side: 'r', color: '#ff2bd6' },
    { key: 'o', text: '32 mm omni wheel', p: mm(97.1, 0, 6.4), side: 'l' },
  ]);
  const relabel = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', relabel);
  const ro = new ResizeObserver(() => requestAnimationFrame(relabel));
  ro.observe(el);

  const R = readout(ctx.panel, { rows: [
    { key: 'what', label: 'Wheels', value: '' },
    { key: 'rpm', label: 'Wheel speed, no load', value: `${RPM} RPM` },
    { key: 'v', label: 'Drive speed, no load', value: '2.2 m/s (7.2 ft/s)' },
  ] });

  let mode = 'drive', a = 0, stop = null;
  function showMode() {
    const m = MODES[mode];
    R.set({ what: m.text });
    arrow.visible = !!m.arrow; ring.visible = !m.arrow;
    if (m.arrow) arrow.rotation.z = Math.atan2(m.arrow[1], m.arrow[0]);
  }
  function pose() {
    const m = MODES[mode];
    for (let i = 0; i < 4; i++) {
      // + means the robot moves toward +x (drive), +z (strafe) or turns counterclockwise from above (turn)
      rig.piv[`wheel${i}`].setAngle(-m.w[i] * a);
      rig.piv[`mpul${i}`].setAngle(-m.w[i] * a * 4);
    }
    ring.rotation.z = -a * 0.15;
  }
  segmented(ctx.panel, { label: 'Move', value: 'drive', options: Object.entries(MODES).map(([value, m]) => ({ value, label: m.label })),
    onChange: (v) => { mode = v; showMode(); if (!tog.playing) tog.set(true); } });
  const tog = playToggle(ctx.panel, { playing: false, onChange: (on) => {
    if (on && !stop) stop = stage.onFrame((dt) => { a += ((RPM * 2 * Math.PI) / 60 / SLOW) * dt; pose(); });
    else if (!on && stop) { stop(); stop = null; }
  } });
  showMode(); pose();
  requestAnimationFrame(relabel);
  return {
    dispose() {
      stop?.(); ro.disconnect(); labels.dispose(); stage.controls?.removeEventListener('change', relabel);
      holder.removeFromParent(); arrowGeo.dispose(); ringGeo.dispose(); arrowMat.dispose();
      stage.dispose();
    },
  };
}

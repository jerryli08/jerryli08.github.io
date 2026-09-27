// Intake pivot demo: stowed for the start of a match, deployed to play. The slider turns the arm
// about the real pivot axis (rig.js) from its stowed angle (132 degrees up, every part behind the
// inner face of the bumper wood) to the deployed pose the CAD is modelled in. The top hopper panel
// folds about its own live joint on the way (rig.foldFor). Readouts: the two belt centre distances,
// measured live between the pulley centres to show they never change, and how far the front of
// the arm is from the inner face of the bumper wood (FRONT, measured on the CAD's triangles).
// A section plane removes everything outboard of the roller belts on this side.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout } from '/assets/js/lib/ui.js';
import * as THREE from 'three';
import { loadRobot, G, AX, FLOOR, STOW, WOOD_Z, foldFor, DEG } from './rig.js';
import { createLabels } from './labels.js';

// mm from the inner face of the front bumper wood to the frontmost point of the arm (with the top
// panel folded as rig.foldFor says), for every whole degree of stow swing, 0 to 132; negative is inside
const FRONT = [301.0, 300.3, 299.5, 298.6, 297.6, 296.4, 295.3, 294.1, 292.8, 291.4, 289.9, 288.2, 286.5, 284.7, 282.7, 280.7, 278.5, 276.3, 273.9, 274.2, 274.9, 275.4, 275.9, 276.2, 276.5, 276.6, 276.7, 276.6, 276.4, 276.2, 275.8, 275.4, 275.0, 274.4, 273.7, 273.0, 272.1, 271.1, 270.1, 268.9, 267.7, 266.3, 264.9, 263.3, 261.8, 260.1, 258.4, 256.5, 254.6, 252.6, 250.4, 248.2, 245.9, 243.5, 241.0, 238.5, 235.9, 233.2, 230.5, 227.6, 224.7, 221.7, 218.6, 215.5, 212.2, 208.9, 205.5, 202.0, 198.5, 194.9, 191.3, 187.6, 183.8, 179.9, 177.0, 175.4, 173.8, 172.1, 170.4, 168.5, 166.7, 164.7, 162.7, 160.7, 158.6, 156.4, 154.1, 151.8, 149.4, 147.0, 144.5, 142.0, 139.4, 136.7, 134.0, 131.2, 128.4, 125.6, 122.6, 119.7, 116.7, 113.6, 110.5, 107.3, 104.1, 100.8, 97.5, 94.1, 90.8, 87.4, 83.9, 80.4, 76.9, 73.3, 69.7, 66.0, 62.4, 58.6, 54.9, 51.1, 47.3, 43.5, 39.6, 35.8, 31.9, 27.9, 24.0, 20.0, 16.0, 12.0, 8.0, 3.9, -0.1];
const MAX = Math.round(-STOW / DEG); // 132
const fmtSwing = (v) => (v >= MAX ? `${MAX}°, stowed` : v <= 0 ? '0°, deployed' : `${Math.round(v)}° up`);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: true });
  const rig = await loadRobot(stage);
  const cut = stage.sectionPlane([1, 0, 0], 0.002); // keeps x >= -0.002: the belt side, outer plates removed
  rig.fixClear();
  stage.highlight([...rig.parts(G.motorBelt), ...rig.parts(G.rollerBelt)], '#ff6b35', { intensity: 0.6 });
  stage.highlight(rig.parts(G.topPanel), '#8fc3ff', { intensity: 0.5 });
  rig.fixClear();

  // side elevation from the roller motor side, framed on the arm's whole swing
  const V = (y, z) => new THREE.Vector3(-0.01, y, z);
  const target = V(0.3, -0.17);
  function frameSide() {
    const aspect = el.clientWidth / Math.max(1, el.clientHeight);
    const tv = Math.tan((stage.camera.fov * DEG) / 2);
    const dist = Math.max(0.84 / (2 * tv), 1.2 / (2 * tv * aspect));
    const dir = new THREE.Vector3(-Math.cos(5 * DEG), Math.sin(5 * DEG), 0.1).normalize();
    stage.setView({ pos: target.clone().addScaledVector(dir, dist), target });
  }
  frameSide();

  // annotations: centre lines between the pulley centres, and the inner face of the bumper wood
  const mat = new THREE.LineBasicMaterial({ color: '#ffd2bd', depthTest: false, transparent: true, opacity: 0.9 });
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geo, mat); line.renderOrder = 10; stage.scene.add(line);
  const woodMat = new THREE.LineDashedMaterial({ color: '#8fc3ff', dashSize: 0.015, gapSize: 0.01, depthTest: false, transparent: true });
  const wood = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(FLOOR, WOOD_Z), V(0.7, WOOD_Z)]), woodMat);
  wood.computeLineDistances(); wood.renderOrder = 10; stage.scene.add(wood);
  const labels = createLabels(el);

  const motor = V(AX.motor[0], AX.motor[1]), pivot = V(AX.pivot[0], AX.pivot[1]), roller0 = V(AX.roller[0], AX.roller[1]);
  const top0 = V(0.46, 0.343), hinge = V(AX.hinge[0], AX.hinge[1]);
  const info = readout(null, { rows: [
    { key: 'a', label: 'Arm', format: fmtSwing },
    { key: 'd1', label: 'Belt 1 centres (motor to pivot)', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'd2', label: 'Belt 2 centres (pivot to roller)', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'f', label: 'Front of the arm past the bumper wood', format: (v) => (v <= 0 ? 'Inside' : `${v.toFixed(0)} mm`) },
    { key: 'p', label: 'Top panel folded in', format: (v) => `${v.toFixed(0)}°` },
  ] });
  const X = new THREE.Vector3(1, 0, 0);
  const rollerNow = new THREE.Vector3(), topNow = new THREE.Vector3();
  function set(deg) {
    const a = -deg * DEG, f = foldFor(a);
    rig.setArm(a, f);
    rollerNow.copy(roller0).sub(pivot).applyAxisAngle(X, a).add(pivot);
    topNow.copy(top0).sub(hinge).applyAxisAngle(X, -f).add(hinge).sub(pivot).applyAxisAngle(X, a).add(pivot);
    const p = geo.attributes.position;
    p.setXYZ(0, motor.x, motor.y, motor.z); p.setXYZ(1, pivot.x, pivot.y, pivot.z); p.setXYZ(2, rollerNow.x, rollerNow.y, rollerNow.z);
    p.needsUpdate = true; geo.computeBoundingSphere();
    const i = Math.min(MAX, Math.max(0, deg)), lo = Math.floor(i), hi = Math.min(MAX, lo + 1);
    const front = FRONT[lo] + (FRONT[hi] - FRONT[lo]) * (i - lo);
    info.set({ a: deg, d1: motor.distanceTo(pivot) * 1000, d2: pivot.distanceTo(rollerNow) * 1000, f: front, p: f / DEG });
    labels.set([
      { text: 'Motor pulley, 12T', p: motor.toArray(), side: 'l' },
      { text: 'Pivot axis, two 24T pulleys', p: pivot.toArray(), side: 'l' },
      { text: 'Roller pulley, 24T', p: rollerNow.toArray(), side: 'l' },
      { text: 'Top panel', p: topNow.toArray(), side: 'l' },
      { text: 'Inner face of the bumper wood', p: V(0.66, WOOD_Z).toArray(), side: 'l' },
    ]);
    labels.update(stage.camera);
    stage.invalidate();
  }
  const s = slider(ctx.panel, { label: 'Stow the intake', min: 0, max: MAX, step: 1, value: 0, format: fmtSwing, onInput: set });

  let stop = null;
  playToggle(ctx.panel, {
    playing: false,
    labels: ['Spin the roller', 'Stop'],
    onChange(on) {
      stop?.(); stop = null;
      if (on) stop = stage.onFrame((dt) => rig.setRoller(rig.state.roller + dt * 5)); // pulleys follow at their ratios (rig.js)
    },
  });
  ctx.panel.append(info.el);
  set(0);

  // keep the labels on their points while the reader orbits, and the side view framed on resize
  const onCam = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', onCam);
  const ro = new ResizeObserver(() => { frameSide(); set(s.value); });
  ro.observe(el);
  return {
    dispose() { ro.disconnect(); stop?.(); stage.controls?.removeEventListener('change', onCam); labels.dispose(); cut.remove(); mat.dispose(); woodMat.dispose(); stage.dispose(); },
  };
}

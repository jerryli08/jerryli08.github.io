// "Six joints", scroll-driven: the SO-101 on Jerry's CAD, joint by joint. The arm is one fused
// solid in the STEP export; it was split into its seven printed links (prep-robot.mjs) and each
// joint turns about the axis of its servo horn in the CAD (rig.js, arm-rig.json). Orange lines are
// the joint axes (annotations). u = step + progress, 0..5:
//   0 the CAD pose, folded       1 shoulder pan, then shoulder lift     2 elbow, then wrist flex
//   3 wrist roll, then the gripper opening and closing     4 into the carry pose
// Angles are right-handed about each joint's axis; all zeros is the pose in the CAD.
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, JOINTS, POSES, DEG, clamp, lerp, smooth } from './rig.js';

const seg = (f, a, b) => smooth((f - a) / (b - a));
const REACH = POSES.reach; // 0, 76, -78, 2, 90, 40
// joints each step moves (for the labels and the readout)
const ACTIVE = [[0, 1, 2, 3, 4, 5], [0, 1], [2, 3], [4, 5], [1, 2, 3]];
function poseAt(s, f) {
  const a = [0, 0, 0, 0, 0, 0];
  if (s === 1) {
    a[0] = 35 * Math.sin(Math.PI * seg(f, 0.04, 0.46));
    a[1] = REACH[1] * seg(f, 0.5, 0.92);
  }
  if (s >= 2) a[1] = REACH[1];
  if (s === 2) {
    a[2] = REACH[2] * seg(f, 0.04, 0.5);
    const w = seg(f, 0.54, 0.94);
    a[3] = REACH[3] * w + 34 * Math.sin(Math.PI * w);
  }
  if (s >= 3) { a[2] = REACH[2]; a[3] = REACH[3]; }
  if (s === 3) {
    a[4] = REACH[4] * seg(f, 0.04, 0.42);
    a[5] = f < 0.5 ? REACH[5] * seg(f, 0.46, 0.62) : lerp(REACH[5], 75, seg(f, 0.66, 0.9));
  }
  if (s >= 4) { a[4] = REACH[4]; a[5] = 75; }
  if (s === 4) {
    const k = seg(f, 0.08, 0.8);
    for (const i of [1, 2, 3]) a[i] = lerp(i === 1 ? REACH[1] : i === 2 ? REACH[2] : REACH[3], POSES.carry[i], k);
  }
  return a;
}

export async function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const R = await loadRobot(stage);

  // joint axes (annotations): a short line along each axis, carried by the joint's own pivot
  const axes = R.pivots.map((g) => {
    const a = g.axis.clone().multiplyScalar(0.05);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone().negate(), a]), new THREE.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true, opacity: 0.9 }));
    line.renderOrder = 5;
    g.add(line);
    return line;
  });
  const ov = labelLayer(stage);
  const labels = JOINTS.map((j, i) => ov.label(j.name, [0, 0, 0], { color: '#ff6b35', side: i === 2 ? 'l' : undefined }));
  const tip = new THREE.Vector3();

  // readout: the six joint angles
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `<table class="num"><thead><tr><th></th><th>Angle</th></tr></thead><tbody>${JOINTS.map((j, i) => `<tr data-r="${i}"><td>${j.name}</td><td data-k="${i}"></td></tr>`).join('')}</tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  hud.querySelector('table').style.marginTop = '0';
  ov.layer.append(hud);
  const cells = JOINTS.map((_, i) => hud.querySelector(`[data-k="${i}"]`)), rows = JOINTS.map((_, i) => hud.querySelector(`[data-r="${i}"]`));
  const mini = hud.querySelector('[data-k="mini"]');
  const shown = {};
  const put = (n, k, s) => { if (shown[k] !== s) { n.textContent = s; shown[k] = s; } };
  const deg = (v) => `${Math.round(v) === 0 ? 0 : Math.round(v)}°`;

  // one view framed once around every pose the arm takes here, so nothing moves out of the picture
  const box = new THREE.Box3();
  for (const pose of [POSES.rest, REACH, POSES.carry, [35, 40, 0, 0, 0, 0]]) {
    R.arm.pose(pose); stage.root.updateMatrixWorld(true);
    for (const m of R.groups.arm) box.expandByObject(m);
  }
  R.arm.pose(POSES.rest);
  const zone = new THREE.Mesh(new THREE.BoxGeometry(...box.getSize(new THREE.Vector3()).toArray()));
  zone.position.copy(box.getCenter(new THREE.Vector3()));
  let view = null, aspect = 0;
  const sp = new THREE.Spherical(), cam = new THREE.Vector3();
  function viewNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (view && a === aspect) return view;
    aspect = a;
    const v = stage.frame(zone, { azimuth: 28, elevation: 16, pad: a < 1 ? 1.1 : 1.2, apply: false });
    view = { t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) };
    return view;
  }

  // the last step never scrolls all the way through on a desktop (its card leaves the screen at about
  // 0.6 of it), so it plays out over the first 55 % and then holds
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, 4), f = clamp(s === 4 ? stepP / 0.55 : stepP, 0, 1), u = s + f;
    const shift = ctx.shift(), phone = el.clientWidth < 640;
    stage.setShift(shift[0], phone ? -0.12 : shift[1]); // on a phone, clear of the readout across the top
    const pose = poseAt(s, f);
    R.arm.pose(pose);
    const act = ACTIVE[s];
    stage.root.updateMatrixWorld(true);
    JOINTS.forEach((_, i) => {
      const on = act.includes(i);
      const op = on ? 0.95 : 0.22;
      if (axes[i].material.opacity !== op) { axes[i].material.opacity = op; stage.invalidate(); }
      axes[i].localToWorld(labels[i].p.copy(R.pivots[i].axis).multiplyScalar(0.055));
      labels[i].a = s === 0 ? (phone && ![0, 1, 5].includes(i) ? 0 : 1) : on ? 1 : 0;
      put(cells[i], i, deg(pose[i]));
      const cls = on && s > 0;
      if (shown[`r${i}`] !== cls) { rows[i].style.color = cls ? 'var(--text)' : ''; rows[i].style.opacity = s > 0 && !on ? '0.55' : ''; shown[`r${i}`] = cls; }
    });
    put(mini, 'mini', act.length === 6 ? 'All six joints at 0°: the pose in the CAD' : act.map((i) => `${JOINTS[i].name} ${deg(pose[i])}`).join(', '));
    const v = viewNow();
    sp.set(v.s.radius, v.s.phi, v.s.theta + (reduced ? 0 : (u / 5 - 0.5) * 0.4));
    stage.setView({ pos: cam.setFromSpherical(sp).add(v.t), target: v.t });
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

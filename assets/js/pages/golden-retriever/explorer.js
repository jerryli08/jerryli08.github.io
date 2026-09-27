// "Every joint in the CAD": Jerry's Golden Retriever CAD, orbitable, with each mechanism driven
// about its real axis. Overview labels the subsystems; Arm moves the six SO-101 joints (orange
// lines show each joint axis, taken from its servo horn in the CAD); Lift runs the carriage up
// the MGN9 rails while the winch pulley turns 112 mm of line per turn; Drive spins the wheels and
// scrolls a floor grid under the robot with differential-drive kinematics on the CAD's 397 mm track.
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented, button } from '/assets/js/lib/ui.js';
import { loadRobot, JOINTS, POSES, DEG, PULLEY_R, PLATE_Y, LIFT_MIN, LIFT_MAX, TRACK_HALF, WHEEL_R, style, labelLayer, SHARED_CSS, lerpPose, smooth } from './rig.js';

const CSS = `
.gr-x-group { display: contents; }
.gr-x-group[hidden] { display: none; }
.gr-x-presets { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.gr-x-grid { flex: 1 1 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 4px 28px; }
.gr-x-note { flex: 1 1 100%; margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--muted); }
`;

// floor for the drive view: grid lines in world coordinates while the robot stays put, faded at the edge
function driveFloor() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uPos: { value: new THREE.Vector2() }, uPsi: { value: 0 }, uColor: { value: new THREE.Color('#e9e2d8') } },
    vertexShader: 'varying vec2 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec2 uPos; uniform float uPsi; uniform vec3 uColor; varying vec2 vP;
      float grid(vec2 p, float s, float w) { vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; vec2 f = fwidth(p) * w; vec2 l = 1.0 - smoothstep(vec2(0.0), f, g); return max(l.x, l.y); }
      void main() {
        float c = cos(uPsi), s = sin(uPsi);
        vec2 w = uPos + vec2(vP.x * c + vP.y * s, -vP.x * s + vP.y * c);
        float a = max(grid(w, 0.1, 1.0) * 0.35, grid(w, 0.5, 1.6) * 0.8);
        float r = length(vP); a *= 1.0 - smoothstep(0.55, 1.25, r);
        gl_FragColor = vec4(uColor, a * 0.55);
      }`,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 72), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0015; m.renderOrder = 1;
  return m;
}

export async function mount(el, ctx) {
  style('gr-shared-css', SHARED_CSS);
  style('gr-x-css', CSS);
  const stage = createStage(el, {});
  const R = await loadRobot(stage);
  const floor = driveFloor();
  floor.visible = false;
  stage.scene.add(floor);
  const labels = labelLayer(stage, el);
  stage.controls.addEventListener('change', () => labels.update());
  const ro = new ResizeObserver(() => labels.update());
  ro.observe(el);

  // joint axes (annotations): a short line along each axis, carried by the joint's own pivot
  const axisMat = new THREE.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true, opacity: 0.95 });
  const axes = R.pivots.map((g) => {
    const a = g.axis.clone().multiplyScalar(0.045);
    const geo = new THREE.BufferGeometry().setFromPoints([a.clone().negate(), a]);
    const line = new THREE.Line(geo, axisMat);
    line.renderOrder = 5;
    g.add(line);
    return line;
  });
  const tip = (i) => (v) => axes[i].localToWorld(v.copy(R.pivots[i].axis).multiplyScalar(0.05));
  const jointLabels = JOINTS.map((j, i) => labels.add(j.name, tip(i), 'gr-accent'));

  // subsystem labels for the overview (model frame points, measured on the CAD)
  let liftDy = 0;
  const at = (x, y, z) => (v) => R.model.localToWorld(v.set(x, y, z));
  const sysLabels = [
    labels.add('SO-101 arm, 6 joints', at(0.42, 0.66 + 0.0, 0)),
    labels.add('Carriage on two 600 mm MGN9 rails', (v) => R.model.localToWorld(v.set(0.19, 0.42 + liftDy, -0.13))),
    labels.add('Winch: servo and 112 mm pulley', at(0.19, 1.03, 0.18)),
    labels.add('1,008 mm corner post, the mast', at(0.165, 0.9, 0.145)),
    labels.add('Axon MAX servo driving a 72 mm wheel', at(0.2, 0.08, 0.18)),
    labels.add('Free wheel on an 8 mm REX shaft', at(-0.2, 0.08, -0.144)),
    labels.add('Top deck, 0.73 m', at(-0.17, 0.74, 0.17)),
  ];

  // ---------------------------------------------------------------- panel
  const groups = {};
  const mk = (k) => { const d = document.createElement('div'); d.className = 'gr-x-group'; d.hidden = true; groups[k] = d; return d; };
  segmented(ctx.panel, {
    label: 'Mechanism',
    options: [{ value: 'all', label: 'Overview' }, { value: 'arm', label: 'Arm' }, { value: 'lift', label: 'Lift' }, { value: 'drive', label: 'Drive' }],
    value: 'all', onChange: (v) => show(v),
  });
  for (const k of ['all', 'arm', 'lift', 'drive']) ctx.panel.appendChild(mk(k));

  // overview
  const pAll = document.createElement('p');
  pAll.className = 'gr-x-note';
  pAll.textContent = 'Drag to turn the robot. Pick Arm, Lift or Drive to move that mechanism.';
  groups.all.appendChild(pAll);

  // arm
  const presets = document.createElement('div'); presets.className = 'gr-x-presets';
  const grid = document.createElement('div'); grid.className = 'gr-x-grid';
  groups.arm.append(presets, grid);
  const sl = JOINTS.map((j, i) => slider(grid, {
    label: j.name, min: j.min, max: j.max, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0),
    onInput: (v) => { R.arm.set(i, v); labels.update(); },
  }));
  let poseAnim = null;
  const goPose = (to) => {
    poseAnim?.(); poseAnim = null;
    const from = [...R.arm.angles];
    if (ctx.reducedMotion) { to.forEach((v, i) => sl[i].set(v)); return; }
    let t = 0;
    poseAnim = stage.onFrame((dt) => {
      t = Math.min(1, t + dt / 0.9);
      lerpPose(from, to, smooth(t)).forEach((v, i) => sl[i].set(v));
      labels.update();
      if (t >= 1) { poseAnim(); poseAnim = null; }
    });
  };
  for (const [label, pose] of [['CAD pose (folded)', POSES.rest], ['Reach', [0, 76, -78, 2, 90, 40]], ['Carry', [0, 40, -95, 55, 90, 75]]]) {
    button(presets, { label, onClick: () => goPose(pose) });
  }

  // lift
  const liftRead = readout(null, { rows: [
    { key: 'h', label: 'Arm plate height', unit: 'm', format: (v) => v.toFixed(2) },
    { key: 'dy', label: 'Carriage travel', unit: 'mm', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}` },
    { key: 'turns', label: 'Pulley turns', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}` },
    { key: 'line', label: 'Line below the pulley', unit: 'mm', format: (v) => v.toFixed(0) },
  ] });
  const setLift = (h) => {
    liftDy = h - PLATE_Y;
    R.lift.set(liftDy);
    liftRead.set({ h: PLATE_Y + R.lift.dy, dy: R.lift.dy * 1000, turns: R.lift.dy / (2 * Math.PI * PULLEY_R), line: (0.568 - R.lift.dy) * 1000 });
    labels.update();
  };
  slider(groups.lift, { label: 'Arm height', min: +(PLATE_Y + LIFT_MIN).toFixed(3), max: +(PLATE_Y + LIFT_MAX).toFixed(3), step: 0.005, value: PLATE_Y, unit: ' m', format: (v) => v.toFixed(2), onInput: setLift });
  groups.lift.appendChild(liftRead.el);
  setLift(PLATE_Y);

  // drive
  const V = 0.3; // m/s at full slider, for illustration only; the real top speed is not known
  let va = 0.6, vo = 0.6; // arm side (+X) and other side (-X), fraction of full
  const pose = { x: 0, z: 0, psi: 0 };
  const driveRead = readout(null, { rows: [
    { key: 'motion', label: 'Motion' },
    { key: 'r', label: 'Turning radius (397 mm track)' },
    { key: 'turn', label: 'Wheel travel per turn', unit: 'mm', format: (v) => v.toFixed(0) },
  ] });
  const describe = () => {
    const eps = 0.02;
    let motion, r;
    if (Math.abs(va) < eps && Math.abs(vo) < eps) { motion = 'Stopped'; r = 'n/a'; }
    else if (Math.abs(va - vo) < eps) { motion = va > 0 ? 'Straight ahead' : 'Straight back'; r = 'Straight'; }
    else if (Math.abs(va + vo) < eps) { motion = 'Spins in place'; r = '0 m'; }
    else {
      const R0 = TRACK_HALF * Math.abs((va + vo) / (vo - va));
      motion = (vo - va) * (va + vo) > 0 ? 'Curves toward the arm side' : 'Curves away from the arm side';
      r = `${R0.toFixed(2)} m`;
    }
    driveRead.set({ motion, r, turn: Math.PI * WHEEL_R * 2 * 1000 });
  };
  [
    slider(groups.drive, { label: 'Arm-side wheels', min: -1, max: 1, step: 0.05, value: va, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { va = v; describe(); } }),
    slider(groups.drive, { label: 'Other-side wheels', min: -1, max: 1, step: 0.05, value: vo, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { vo = v; describe(); } }),
  ];
  let driving = null;
  const play = playToggle(groups.drive, {
    playing: false, labels: ['Drive', 'Stop'],
    onChange(on) {
      driving?.(); driving = null;
      if (!on || ctx.reducedMotion) { if (on) play.set(false, { silent: true }); return; }
      driving = stage.onFrame((dt) => {
        const a = va * V, o = vo * V;
        const v = (a + o) / 2, w = (o - a) / (2 * TRACK_HALF); // -X side ahead of the +X side turns the robot toward +X
        pose.psi += w * dt;
        pose.x += Math.sin(pose.psi) * v * dt; pose.z += Math.cos(pose.psi) * v * dt;
        R.wheels.roll(o * dt, a * dt);
        floor.material.uniforms.uPos.value.set(pose.x % 1, pose.z % 1);
        floor.material.uniforms.uPsi.value = pose.psi;
      });
    },
  });
  groups.drive.appendChild(driveRead.el);
  const dnote = document.createElement('p');
  dnote.className = 'gr-x-note';
  dnote.textContent = 'The robot stays centred and the floor grid moves under it. Speeds are relative to an illustrative 0.3 m/s full scale, not the robot’s real top speed.';
  groups.drive.appendChild(dnote);
  describe();

  // ---------------------------------------------------------------- views
  const armParts = R.groups.arm;
  const views = {
    all: () => stage.frame(R.model, { azimuth: 52, elevation: 16, pad: 1.08, apply: false }),
    arm: () => stage.frame(armParts, { azimuth: 38, elevation: 22, pad: 1.5, apply: false, refresh: true }),
    lift: () => stage.frame(R.model, { azimuth: 78, elevation: 10, pad: 1.05, apply: false }),
    drive: () => stage.frame(R.model, { azimuth: 140, elevation: 30, pad: 1.25, apply: false }),
  };
  let unlight = null;
  function show(k) {
    for (const [g, d] of Object.entries(groups)) d.hidden = g !== k;
    for (const l of sysLabels) labels.show(l, k === 'all');
    jointLabels.forEach((l) => labels.show(l, k === 'arm'));
    for (const a of axes) a.visible = k === 'arm';
    floor.visible = k === 'drive';
    if (k !== 'drive' && play.playing) play.set(false);
    unlight?.(); unlight = null;
    if (k === 'lift') unlight = stage.highlight([...R.groups.carriage, ...R.groups.winch], '#ff6b35', { intensity: 0.35 });
    if (k === 'drive') unlight = stage.highlight(R.groups.drive, '#ff6b35', { intensity: 0.3 });
    stage.tweenCamera(views[k](), ctx.reducedMotion ? 0 : 0.9).then(() => labels.update());
    stage.invalidate();
    labels.update();
  }
  stage.frame(R.model, { azimuth: 52, elevation: 16, pad: 1.08 });
  show('all');
  return {
    dispose() { poseAnim?.(); driving?.(); ro.disconnect(); stage.dispose(); },
  };
}

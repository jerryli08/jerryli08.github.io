// "The arm, joint by joint": the SO-101 from Jerry's CAD, each link turned about its servo's axis.
// Sliders drive the six joints; "Joint axes" draws the axes the rig uses; "Workspace" draws the box
// our text mode clamps targets into (agent/src/demo/hardware/so101.py: 0.05 to 0.33 m forward,
// 0.20 m to either side, 0.02 to 0.35 m up, in the URDF frame) over a cloud of points the tool
// point can reach with this model's joint limits. The box's corners are green when the IK gets
// within 2 cm of them (the robot's IK_TOLERANCE_M) and red when it cannot.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, segmented, button, readout } from '/assets/js/lib/ui.js';
import { THREE, loadArm, style, h, SHARED_CSS, JOINTS, ROLL, SEEDS, labelLayer, carry, fk, toArm, toRepo, ikBest, lerp, smooth, fitBox } from './rig.js';

const CSS = `
.lq-x-grid { flex: 1 1 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 4px 28px; }
.lq-x-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.lq-x-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--text-2); }
.lq-x-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
`;
const BOX = { x: [0.05, 0.33], y: [-0.2, 0.2], z: [0.02, 0.35] };

export async function mount(el, ctx) {
  style('lq-shared-css', SHARED_CSS);
  style('lq-x-css', CSS);
  const stage = createStage(el, {});
  const arm = await loadArm(stage);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 72), new THREE.MeshStandardMaterial({ color: '#3b332c', roughness: 0.9 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -0.0004; disc.receiveShadow = true;
  stage.root.add(disc);
  stage.fitGround();
  const labels = labelLayer(stage, el);
  stage.controls.addEventListener('change', () => labels.update());
  const ro = new ResizeObserver(() => labels.update());
  ro.observe(el);

  // joint axes (annotations), carried by each joint's own pivot
  const axisMat = new THREE.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true, opacity: 0.95 });
  const axes = arm.pivots.map((g) => {
    const a = g.axis.clone().multiplyScalar(0.05);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone().negate(), a]), axisMat);
    line.renderOrder = 5; line.visible = false;
    g.add(line);
    return line;
  });
  // tool point marker (annotation): the point the IK moves, the URDF's gripper frame
  const tcpDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 16, 12), new THREE.MeshBasicMaterial({ color: '#3ee06b', depthTest: false }));
  tcpDot.renderOrder = 6;
  arm.grip.add(tcpDot);
  const V = new THREE.Vector3();
  const jointLabels = JOINTS.map((j, i) => labels.add(j.name, (v) => v.set(...carry(arm.angles, j.origin, i)), 'lq-small'));
  const tcpLabel = labels.add('Tool point', (v) => arm.grip.getWorldPosition(v));

  // workspace: the text mode's box, plus where the tool point can reach
  const ws = new THREE.Group(); ws.visible = false; stage.scene.add(ws);
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push([BOX.x[i & 1 ? 1 : 0], BOX.y[i & 2 ? 1 : 0], BOX.z[i & 4 ? 1 : 0]]);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const pts = [];
  for (const [a, b] of E) pts.push(new THREE.Vector3(...toArm(corners[a])), new THREE.Vector3(...toArm(corners[b])));
  ws.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e9e2d8', transparent: true, opacity: 0.7 })));
  let reachable = 0;
  for (const c of corners) {
    const r = ikBest(toArm(c), SEEDS);
    const ok = r.miss <= 0.02;
    reachable += ok;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 12), new THREE.MeshBasicMaterial({ color: ok ? '#3ee06b' : '#ff4b3e' }));
    s.position.set(...toArm(c));
    ws.add(s);
  }
  // reach cloud: forward kinematics over the four IK joints, within this model's limits
  const N = ctx.isTouch ? 9000 : 18000, cloud = new Float32Array(N * 3);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let k = 0;
  for (let n = 0; n < N * 3 && k < N; n++) {
    const q = JOINTS.slice(0, 4).map((j) => lerp(j.min, j.max, rnd()));
    const p = fk([...q, ROLL]);
    if (p[1] < 0.005) continue;
    cloud.set(p, k * 3); k++;
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.BufferAttribute(cloud.subarray(0, k * 3), 3));
  ws.add(new THREE.Points(cg, new THREE.PointsMaterial({ color: '#ff8a5c', size: 0.0028, transparent: true, opacity: 0.35, depthWrite: false })));

  // ---------------------------------------------------------------- panel
  const bar = h('div', 'lq-x-bar');
  ctx.panel.appendChild(bar);
  const grid = h('div', 'lq-x-grid');
  const sl = JOINTS.map((j, i) => slider(grid, {
    label: j.name, min: j.min, max: j.max, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0),
    onInput: (v) => { arm.set(i, v); show(); },
  }));
  let anim = null;
  const go = (to) => {
    anim?.(); anim = null;
    const from = arm.angles.slice();
    if (ctx.reducedMotion) { to.forEach((v, i) => sl[i].set(v)); return; }
    let t = 0;
    anim = stage.onFrame((dt) => {
      t = Math.min(1, t + dt / 0.9);
      from.forEach((f, i) => sl[i].set(lerp(f, to[i], smooth(t))));
      if (t >= 1) { anim(); anim = null; }
    });
  };
  const reachDown = ikBest(toArm([0.25, 0, 0.05]), SEEDS).q;
  button(bar, { label: 'Folded (CAD pose)', onClick: () => go([0, 0, 0, 0, 0, 0]) });
  button(bar, { label: 'Straight out', onClick: () => go([0, 90, -90, 0, 0, 0]) });
  button(bar, { label: 'Reach down', onClick: () => go([...reachDown.slice(0, 4), ROLL, 30]) });
  const view = segmented(bar, {
    options: [{ value: 'joints', label: 'Joint axes' }, { value: 'ws', label: 'Workspace' }, { value: 'none', label: 'Plain' }],
    value: 'joints', onChange: (v) => setView(v),
  });
  ctx.panel.appendChild(grid);
  const rd = readout(ctx.panel, { title: 'Tool point, our repo’s frame', rows: [
    { key: 'x', label: 'Forward', unit: ' m', format: (v) => v.toFixed(3) },
    { key: 'y', label: 'Left', unit: ' m', format: (v) => v.toFixed(3) },
    { key: 'z', label: 'Up', unit: ' m', format: (v) => v.toFixed(3) },
  ] });
  const legend = h('div', 'lq-x-legend');
  legend.innerHTML = `<span><i style="background:#3ee06b"></i>Corner the IK reaches (${reachable} of 8)</span><span><i style="background:#ff4b3e"></i>Corner it misses by more than 2 cm</span><span><i style="background:#ff8a5c"></i>Where the tool point can go</span>`;
  legend.hidden = true;
  ctx.panel.appendChild(legend);
  const note = h('p', 'lq-note', 'Screws and the servo driver board are hidden. Joint limits are set to keep this model out of itself; the real arm’s calibration sets its own.');
  ctx.panel.appendChild(note);

  function show() {
    const p = toRepo(fk(arm.angles));
    rd.set({ x: p[0], y: p[1], z: p[2] });
    labels.update();
  }
  function setView(v) {
    for (const a of axes) a.visible = v === 'joints';
    jointLabels.forEach((l) => labels.show(l, v === 'joints'));
    ws.visible = v === 'ws';
    legend.hidden = v !== 'ws';
    labels.show(tcpLabel, v !== 'none');
    tcpDot.visible = v !== 'none';
    stage.invalidate();
    labels.update();
    if (v === 'ws') { stage.frame(wsBox, { azimuth: 125, elevation: 26, pad: 1.02, duration: ctx.reducedMotion ? 0 : 0.8 }); setTimeout(() => labels.update(), 900); }
  }
  const start = [0, 90, -90, 0, 0, 0];
  start.forEach((v, i) => sl[i].set(v));
  const box = fitBox(stage, [-0.09, 0, -0.08], [0.09, 0.34, 0.41]);
  const wsBox = fitBox(stage, [-0.2, 0, -0.08], [0.2, 0.36, 0.41]);
  stage.frame(box, { azimuth: 125, elevation: 18, pad: 1.0 });
  setView('joints');
  show();
  return { dispose() { anim?.(); ro.disconnect(); stage.dispose(); } };
}

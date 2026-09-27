// "The arm, joint by joint", scroll-driven: the SO-101 from Jerry's CAD, each link turned about its
// servo's axis (kin.js). Orange lines are the joint axes (annotations). Steps:
//   0 the CAD pose, folded      1 shoulder pan, then shoulder lift      2 elbow, then wrist flex
//   3 wrist roll and the gripper      4 our code's zero pose and its axes (+x forward, +y left, +z up)
//   5 the box our text mode clamps targets into (agent/src/demo/hardware/so101.py: 0.05 to 0.33 m
//     forward, 0.20 m to either side, 0.02 to 0.35 m up), over a cloud of points the tool point can
//     reach within this model's joint limits; corners green where the IK gets within 2 cm (the
//     robot's tolerance), red where it cannot
// Every picture is a pure function of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { THREE, loadArm, fitBox, cachedView, placeView, h, writer, JOINTS, ROLL, SEEDS, carry, fk, toArm, toRepo, ikBest, lerp, smooth, clamp } from './rig.js';

const BOX = { x: [0.05, 0.33], y: [-0.2, 0.2], z: [0.02, 0.35] };
const ZERO = [0, 90, -90, 0, 0, 0]; // our code's (the URDF's) zero pose on this model: upper arm up, forearm level
const seg = (f, a, b) => smooth((f - a) / (b - a));
// joints each step is about
const ACTIVE = [[0, 1, 2, 3, 4, 5], [0, 1], [2, 3], [4, 5], [], []];

export async function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const arm = await loadArm(stage);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 72), new THREE.MeshStandardMaterial({ color: '#3b332c', roughness: 0.9 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -0.0004; disc.receiveShadow = true;
  stage.root.add(disc);
  stage.fitGround();
  const REACH = [...ikBest(toArm([0.25, 0, 0.05]), SEEDS).q.slice(0, 4), ROLL, 30];

  function poseAt(s, f) {
    const a = [0, 0, 0, 0, 0, 0];
    if (s === 1) { a[0] = 35 * Math.sin(Math.PI * seg(f, 0.04, 0.46)); a[1] = 90 * seg(f, 0.5, 0.92); }
    if (s >= 2) a[1] = 90;
    if (s === 2) { a[2] = -90 * seg(f, 0.04, 0.5); const w = seg(f, 0.54, 0.94); a[3] = 45 * Math.sin(Math.PI * w); }
    if (s >= 3) a[2] = -90;
    if (s === 3) { a[4] = 90 * Math.sin(Math.PI * seg(f, 0.04, 0.46)); a[5] = 95 * Math.sin(Math.PI * seg(f, 0.5, 0.94)); }
    if (s === 5) { const k = seg(f, 0.04, 0.5); for (let i = 0; i < 6; i++) a[i] = lerp(ZERO[i], REACH[i], k); }
    return a;
  }

  // joint axes (annotations), carried by each joint's own pivot
  const axes = arm.pivots.map((g) => {
    const a = g.axis.clone().multiplyScalar(0.05);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone().negate(), a]), new THREE.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true, opacity: 0.95 }));
    line.renderOrder = 5;
    g.add(line);
    return line;
  });
  const tcpDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 16, 12), new THREE.MeshBasicMaterial({ color: '#3ee06b', depthTest: false, transparent: true }));
  tcpDot.renderOrder = 6;
  arm.grip.add(tcpDot);

  // our code's frame (URDF base_link), drawn at its origin: +x forward, +y left, +z up
  const O = toArm([0, 0, 0]);
  const frameG = new THREE.Group();
  const dirs = [[toArm([0.14, 0, 0]), '#ff5a4f'], [toArm([0, 0.14, 0]), '#3ee06b'], [toArm([0, 0, 0.14]), '#6cc4ff']];
  for (const [tip, color] of dirs) {
    const d = new THREE.Vector3(...tip).sub(new THREE.Vector3(...O));
    const arrow = new THREE.ArrowHelper(d.clone().normalize(), new THREE.Vector3(...O), d.length(), color, 0.018, 0.011);
    arrow.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; } o.renderOrder = 7; });
    frameG.add(arrow);
  }
  stage.scene.add(frameG);

  // workspace: the text mode's box, and where the tool point can reach
  const ws = new THREE.Group();
  stage.scene.add(ws);
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push([BOX.x[i & 1 ? 1 : 0], BOX.y[i & 2 ? 1 : 0], BOX.z[i & 4 ? 1 : 0]]);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const pts = [];
  for (const [a, b] of E) pts.push(new THREE.Vector3(...toArm(corners[a])), new THREE.Vector3(...toArm(corners[b])));
  const wsMats = [];
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e9e2d8', transparent: true, opacity: 0.8 }));
  wsMats.push([lines.material, 0.8]);
  ws.add(lines);
  let reachable = 0;
  for (const c of corners) {
    const ok = ikBest(toArm(c), SEEDS).miss <= 0.02;
    reachable += ok;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 12), new THREE.MeshBasicMaterial({ color: ok ? '#3ee06b' : '#ff4b3e', transparent: true }));
    s.position.set(...toArm(c));
    wsMats.push([s.material, 1]);
    ws.add(s);
  }
  const N = ctx.isTouch ? 9000 : 18000, cloud = new Float32Array(N * 3);
  let seed = 7, k = 0;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < N * 3 && k < N; n++) {
    const q = JOINTS.slice(0, 4).map((j) => lerp(j.min, j.max, rnd()));
    const p = fk([...q, ROLL]);
    if (p[1] < 0.005) continue;
    cloud.set(p, k * 3); k++;
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.BufferAttribute(cloud.subarray(0, k * 3), 3));
  const pm = new THREE.PointsMaterial({ color: '#ff8a5c', size: 0.0028, transparent: true, opacity: 0.35, depthWrite: false });
  wsMats.push([pm, 0.35]);
  ws.add(new THREE.Points(cg, pm));

  // labels
  const ov = labelLayer(stage);
  const jl = JOINTS.map((j, i) => ov.label(j.name, [0, 0, 0], { color: '#ff6b35', side: [1, 4, 5].includes(i) ? 'l' : undefined }));
  const tl = ov.label('Tool point', [0, 0, 0], { color: '#3ee06b' });
  const fl = [ov.label('+x forward', dirs[0][0], { color: '#ff5a4f' }), ov.label('+y left', dirs[1][0], { color: '#3ee06b', side: 'l' }), ov.label('+z up', dirs[2][0], { color: '#6cc4ff' })];
  const cl = ov.label(`${reachable} of 8 corners within 2 cm`, toArm([BOX.x[0], BOX.y[1], BOX.z[1]]), { color: '#3ee06b', side: 'l', minW: 480 });
  const rl = ov.label('Far corners out of reach', toArm([BOX.x[1], BOX.y[0], BOX.z[0]]), { color: '#ff4b3e', minW: 480 });

  // readout
  const hud = h('div', 'rx-hud');
  hud.innerHTML = `<table class="num" style="margin-top:0"><thead><tr><th></th><th>Angle</th></tr></thead><tbody>${JOINTS.map((j, i) => `<tr data-r="${i}"><td>${j.name}</td><td data-k="${i}"></td></tr>`).join('')}</tbody></table>
    <div class="rx-hud-row" style="margin-top:9px"><span>Tool point <small>our code's frame</small></span><b class="num" data-k="t"></b></div>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  ov.layer.append(hud);
  const cells = JOINTS.map((_, i) => hud.querySelector(`[data-k="${i}"]`)), rows = JOINTS.map((_, i) => hud.querySelector(`[data-r="${i}"]`));
  const tcell = hud.querySelector('[data-k="t"]'), mini = hud.querySelector('[data-k="mini"]');
  const put = writer();
  const deg = (v) => `${Math.round(v) === 0 ? 0 : Math.round(v)}°`;
  const cm = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(3)}`;

  // three views, each framed once at rest: the folded arm, the arm through its moves, the workspace
  const foldView = cachedView(stage, el, fitBox(stage, [-0.06, 0, -0.09], [0.06, 0.22, 0.24]), { azimuth: 125, elevation: 18, pad: (a) => (a < 1 ? 1.05 : 1.2) });
  const armView = cachedView(stage, el, fitBox(stage, [-0.1, 0, -0.08], [0.24, 0.36, 0.42]), { azimuth: 125, elevation: 18, pad: (a) => (a < 1 ? 1.02 : 1.08) });
  const wsView = cachedView(stage, el, fitBox(stage, [-0.22, 0, -0.08], [0.22, 0.36, 0.33]), { azimuth: 135, elevation: 28, pad: (a) => (a < 1 ? 1.02 : 1.4) });

  let last = '';
  const opa = new Map();
  const setOpacity = (m, v) => { if (opa.get(m) !== v) { m.opacity = v; opa.set(m, v); stage.invalidate(); } };
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, 5), f = reduced ? 1 : clamp(stepP / 0.85, 0, 1);
    const key = `${s}|${f.toFixed(4)}|${el.clientWidth}x${el.clientHeight}`;
    if (key === last) return;
    last = key;
    const pose = poseAt(s, f);
    arm.pose(pose);
    const wsK = s === 5 ? (reduced ? 1 : seg(f, 0, 0.45)) : 0;
    const frK = s === 4 ? (reduced ? 1 : seg(f, 0, 0.4)) : 0;
    const axK = 1 - wsK;
    axes.forEach((a, i) => setOpacity(a.material, s === 0 ? 0.95 : ACTIVE[s].includes(i) ? 0.95 * axK : 0.22 * axK));
    for (const [m, o] of wsMats) setOpacity(m, o * wsK);
    ws.visible = wsK > 0.001;
    frameG.visible = frK > 0.001;
    frameG.traverse((o) => { if (o.material) setOpacity(o.material, frK); });
    setOpacity(tcpDot.material, s >= 4 ? 1 : 0.9);
    const phone = el.clientWidth < 640;
    const [fx, fy] = ctx.shift();
    stage.setShift(fx + (fx ? 0.06 * wsK : 0), phone ? -0.1 : fy);
    const drift = reduced ? 0 : ((s + f) / 6 - 0.5) * 0.35;
    if (s === 0) { const v = foldView(); placeView(stage, v, v, 0, drift); }
    else if (s === 1) placeView(stage, foldView(), armView(), reduced ? 1 : seg(f, 0, 0.45), drift);
    else placeView(stage, armView(), wsView(), wsK, drift);
    stage.root.updateMatrixWorld(true);
    JOINTS.forEach((j, i) => {
      jl[i].p.set(...carry(pose, j.origin, i));
      jl[i].a = s === 0 ? (phone && ![0, 1, 5].includes(i) ? 0 : 1) : ACTIVE[s].includes(i) ? 1 : 0;
      put(cells[i], deg(pose[i]));
      const on = ACTIVE[s].includes(i) && s > 0 && s < 4;
      const c = on ? 'on' : '';
      if (rows[i].dataset.c !== c) { rows[i].dataset.c = c; rows[i].style.color = on ? 'var(--text)' : ''; rows[i].style.opacity = s > 0 && s < 4 && !on ? '0.55' : ''; }
    });
    tl.p.set(...fk(pose));
    tl.a = s >= 4 ? 1 : 0;
    fl.forEach((l) => { l.a = frK; });
    cl.a = wsK; rl.a = wsK;
    const tp = toRepo(fk(pose));
    put(tcell, `${tp.map(cm).join(', ')} m`);
    put(mini, s >= 4 ? `Tool point ${tp.map((v) => v.toFixed(3)).join(', ')} m` : ACTIVE[s].length === 6 ? 'All six joints at 0°: the pose in the CAD' : ACTIVE[s].map((i) => `${JOINTS[i].name} ${deg(pose[i])}`).join(', '));
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

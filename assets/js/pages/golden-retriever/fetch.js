// "Text it, and it goes and gets it", scroll-driven: one errand on Jerry's CAD. A text asks for the
// pill bottle, one of three items on the shelf; the robot drives there, finds it with the side
// camera, raises the arm on the winch lift, grasps it and brings it back. The thread on the stage
// shows the texts, and the robot's replies are its real lines from the repo (robot/concierge.py).
// u = step + progress through it, 0..6:
//   0 ask      1 drive to the shelf     2 find it, creeping along the shelf
//   3 lift     4 grasp                  5 bring it back and hand it over
// Everything is a pure function of the scroll: the drives are tabulated tracks (room.js), the arm
// plays fixed keyframes, and the camera blends between views framed once on static things (the
// room, the shelf, the parking spot), never on the moving robot.
//
// A simulation built for the page, not a recording: the room and the items are simple props, the
// path comes from A* on a map of the room (the real robot built its grid from the depth camera as
// it drove), and the arm plays keyframes where the real grasp came from the learned policy.
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, POSES, PULLEY_R, WHEEL_R, SIDE_CAM, sideCameraWedge, clamp, lerp, smooth, lerpPose, style } from './rig.js';
import { buildRoom, computeTargets, ITEMS, START, USER, SHELF, plan, paintPlan, buildTrack } from './room.js';

const K = 'pill';
const ITEM = ITEMS[K].name;
const withGrip = (pose, g) => [...pose.slice(0, 5), g];
const seg = (f, a, b) => smooth((f - a) / (b - a)); // 0..1 over [a, b] of the progress through a step

// the thread: what you send and what the robot answers, placed on the scroll (u)
// ("Did you get it?" is one of the status questions in the robot's router prompt, robot/brain.py.)
const THREAD = [
  { at: 0.12, out: true, text: 'Bring my pill bottle' },
  { at: 0.46, text: `Okay. Going to get the ${ITEM} now.` },
  { at: 1.42, out: true, text: 'Did you get it?' },
  { at: 1.66, text: `Still working on the ${ITEM}. Looking for the ${ITEM}.` },
  { at: 5.9, text: `Here's the ${ITEM}.` },
];
const TYPING = [[0.28, 0.46], [1.52, 1.66], [5.8, 5.9]];

const CSS = `
.gr-thread { position: absolute; right: 14px; bottom: 14px; width: min(var(--rx-inset-w), 40%); display: flex; flex-direction: column; gap: 6px;
  padding: 12px; border-radius: 16px; background: rgba(10, 8, 7, 0.8); border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: var(--rx-ov-text); line-height: 1.35; color: var(--text); }
.gr-thread-head { display: flex; align-items: center; gap: 9px; padding-bottom: 8px; margin-bottom: 2px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.gr-thread-head span { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #f2c833; color: #2a2006; font-weight: 800; font-size: 13px; }
.gr-thread-head b { display: block; font-size: var(--rx-ov-text); line-height: 1.2; }
.gr-thread-head small { display: block; font-size: var(--rx-ov-small); color: var(--muted); }
.gr-thread .gr-msg { max-width: 88%; padding: 6px 11px; border-radius: 16px; overflow-wrap: anywhere; }
.gr-thread .gr-out { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 5px; }
.gr-thread .gr-in { align-self: flex-start; background: #3a3a3c; color: #f2f2f7; border-bottom-left-radius: 5px; }
.gr-thread .gr-dots { display: inline-flex; gap: 4px; padding: 10px 12px; }
.gr-thread .gr-dots i { width: 6px; height: 6px; border-radius: 50%; background: #9a9aa0; }
.gr-thread-empty { font-size: var(--rx-ov-small); color: var(--muted); text-align: center; }
@media (max-width: 640px) {
  .gr-thread { right: 8px; bottom: auto; top: 8px; width: min(280px, 76%); padding: 8px; gap: 5px; }
  .gr-thread-head, .gr-thread-empty { display: none; }
  .gr-thread .gr-old { display: none; }
}
`;

export async function mount(el, ctx) {
  style('gr-thread-css', CSS);
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const room = buildRoom(THREE);
  stage.root.add(room.group);
  const robot = new THREE.Group();
  robot.name = 'robot';
  stage.root.add(robot);
  const R = await loadRobot(stage, { add: false });
  robot.add(R.model);
  stage.fitGround();
  stage.ground.visible = false; // the room's floor takes the shadows
  const { T } = computeTargets(R, THREE);
  const t = T[K], item = room.items[K];

  // ------------------------------------------------------------ the three drives
  const park = { x: t.park.x, z: t.park.z, psi: Math.PI / 2 };
  const pre = { x: park.x - 0.5, z: park.z }; // the creep along the shelf starts here
  const out = plan(START, pre);
  const go = buildTrack(START, out.points.slice(1), Math.PI / 2);
  const creep = Math.hypot(park.x - go.end.x, park.z - go.end.z);
  const atPark = { ...park, dl: go.end.dl + creep, dr: go.end.dr + creep };
  const back = plan(park, START);
  const ret = buildTrack(park, back.points.slice(1), START.psi);
  const pathOut = [...out.points];

  // arm keyframes for the grasp step (progress through the step)
  const G = [
    [0.02, POSES.rest], [0.2, withGrip(POSES.pre, t.open)], [0.38, withGrip(POSES.reach, t.open)],
    [0.52, withGrip(POSES.reach, t.close)], [0.7, withGrip(POSES.lift, t.close)], [0.92, withGrip(POSES.carry, t.close)],
  ];
  const armAt = (f) => {
    if (f <= G[0][0]) return G[0][1];
    for (let i = 1; i < G.length; i++) if (f <= G[i][0]) return lerpPose(G[i - 1][1], G[i][1], smooth((f - G[i - 1][0]) / (G[i][0] - G[i - 1][0])));
    return G[G.length - 1][1];
  };
  const CLOSE_F = 0.52;

  // the whole state at step s, progress f
  function stateAt(s, f) {
    const st = { pose: { ...START, dl: 0, dr: 0 }, lift: 0, arm: POSES.rest, item: 'home', seat: 0 };
    if (s === 1) st.pose = go.at(go.dur * seg(f, 0.06, 0.92));
    if (s === 2) {
      const e = seg(f, 0.04, 0.72);
      st.pose = { x: lerp(go.end.x, park.x, e), z: lerp(go.end.z, park.z, e), psi: park.psi, dl: go.end.dl + creep * e, dr: go.end.dr + creep * e };
    }
    if (s >= 3) st.pose = { ...atPark };
    if (s === 3) st.lift = t.dy * seg(f, 0.08, 0.85);
    if (s === 4) { st.lift = t.dy; st.arm = armAt(f); if (f >= CLOSE_F) st.item = 'held'; }
    if (s === 5) {
      const q = ret.at(ret.dur * seg(f, 0.03, 0.62));
      st.pose = { ...q, dl: atPark.dl + q.dl, dr: atPark.dr + q.dr };
      st.lift = t.dy * (1 - seg(f, 0.03, 0.22));
      const g0 = withGrip(POSES.carry, t.close), g1 = withGrip(POSES.pre, t.close), g2 = withGrip(POSES.pre, t.open);
      st.arm = f < 0.66 ? g0 : f < 0.78 ? lerpPose(g0, g1, seg(f, 0.66, 0.78)) : f < 0.84 ? lerpPose(g1, g2, seg(f, 0.78, 0.84)) : g2;
      st.item = f < 0.84 ? 'held' : 'seat';
      st.seat = seg(f, 0.84, 0.95);
    }
    return st;
  }
  const P = { x: START.x, z: START.z, psi: START.psi };
  function place(p) {
    P.x = p.x; P.z = p.z; P.psi = p.psi;
    if (robot.position.x !== p.x || robot.position.z !== p.z || robot.rotation.y !== p.psi) {
      robot.position.set(p.x, 0, p.z); robot.rotation.y = p.psi; stage.invalidate();
    }
    R.wheels.set(p.dl / WHEEL_R, p.dr / WHEEL_R);
  }

  // the item's pose in the gripper at the moment the jaws close, so "held" is a pure function too
  place(atPark);
  R.lift.set(t.dy);
  R.arm.pose(withGrip(POSES.reach, t.close));
  stage.root.updateMatrixWorld(true);
  const itemInGrip = new THREE.Matrix4().copy(R.pivots[4].matrixWorld).invert().multiply(item.matrixWorld);
  // the grasp view frames the arm and the item as they are at the grasp (static from then on)
  const graspBox = new THREE.Box3();
  for (const pose of [withGrip(POSES.pre, t.open), withGrip(POSES.reach, t.open), withGrip(POSES.carry, t.close)]) {
    R.arm.pose(pose); stage.root.updateMatrixWorld(true);
    for (const m of R.groups.arm) graspBox.expandByObject(m);
  }
  graspBox.expandByObject(item);
  const itemHome = item.matrix.clone();
  const seatM = new THREE.Matrix4().compose(new THREE.Vector3(USER.x + 0.05, 0.45, USER.z + 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, 0)), new THREE.Vector3(1, 1, 1));
  const roomInv = new THREE.Matrix4(), held = new THREE.Matrix4(), from = new THREE.Matrix4();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), sc = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  item.matrixAutoUpdate = false;
  function heldMatrix(out) {
    stage.root.updateMatrixWorld(true);
    roomInv.copy(room.group.matrixWorld).invert();
    return out.multiplyMatrices(R.pivots[4].matrixWorld, itemInGrip).premultiply(roomInv);
  }
  function setItem(st) {
    if (st.item === 'home') item.matrix.copy(itemHome);
    else if (st.item === 'held') item.matrix.copy(heldMatrix(held));
    else {
      // settling on the seat, from where the jaws opened
      R.arm.pose(withGrip(POSES.pre, t.close));
      heldMatrix(from);
      R.arm.pose(st.arm);
      from.decompose(va, qa, sc); seatM.decompose(vb, qb, sc);
      va.lerp(vb, st.seat); va.y += Math.sin(Math.PI * st.seat) * 0.06; qa.slerp(qb, st.seat);
      item.matrix.compose(va, qa, one);
    }
    item.matrixWorldNeedsUpdate = true;
    stage.invalidate();
  }

  // ------------------------------------------------------------ annotations (not parts)
  const wedge = sideCameraWedge(THREE, robot);
  wedge.visible = false;
  const bracket = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.05, 0.1, 0.05)), new THREE.LineBasicMaterial({ color: '#ff6b35' }));
  bracket.position.copy(item.userData.home).add(new THREE.Vector3(0, 0.05, 0));
  bracket.visible = false;
  room.group.add(bracket);
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ff6b35', transparent: true, depthWrite: false });
  const dotGeo = new THREE.SphereGeometry(0.006, 12, 8);
  const dots = Array.from({ length: 9 }, (_, i) => {
    const d = new THREE.Mesh(dotGeo, dotMat.clone());
    d.material.opacity = 1 - (i / 9) * 0.8;
    d.renderOrder = 3; d.visible = false;
    stage.scene.add(d);
    return d;
  });

  // ------------------------------------------------------------ labels and the thread
  const ov = labelLayer(stage);
  const setText = (l, s) => { if (l.text !== s) { l.el.lastChild.textContent = s; l.text = s; } };
  const mid = pathOut[Math.floor(pathOut.length / 2)];
  const L = {
    you: ov.label('You', [USER.x, 0.98, USER.z], { color: '#fff1e2' }),
    path: ov.label('Planned path', [mid.x, 0.02, mid.z]),
    blocked: ov.label('Blocked: obstacle plus the robot\'s half-width', [-0.1, 0.02, -0.26], { color: '#e64a3a', minW: 560 }),
    free: ov.label('Free cells ahead', [0, 0.01, 0], { color: '#46c86e' }),
    cam: ov.label('Side camera: low, angled up', [0, 0, 0], { color: '#fff1e2' }),
    found: ov.label(`HSV colour match: ${ITEM}`, item.userData.home.clone().add(new THREE.Vector3(0, 0.13, 0)).toArray(), { side: 'l' }),
    lift: ov.label('Lift', [0, 0, 0], { color: '#fff1e2', side: el.clientWidth < 640 ? 'l' : undefined }),
    claw: ov.label('Claw camera', [0, 0, 0], { color: '#fff1e2', side: 'l' }),
    chunk: ov.label('Next chunk of motion (sketch)', [0, 0, 0]),
  };
  const thread = document.createElement('div');
  thread.className = 'gr-thread';
  thread.setAttribute('aria-hidden', 'true'); // the step text quotes every line
  thread.innerHTML = `<div class="gr-thread-head"><span>G</span><div><b>Golden Retriever</b><small>iMessage</small></div></div>
    <div class="gr-thread-empty">Text me what you need</div>`;
  const msgs = THREAD.map((m) => {
    const d = document.createElement('div');
    d.className = `gr-msg ${m.out ? 'gr-out' : 'gr-in'}`;
    d.textContent = m.text;
    d.style.display = 'none';
    thread.append(d);
    return d;
  });
  const typing = document.createElement('div');
  typing.className = 'gr-msg gr-in gr-dots';
  typing.innerHTML = '<i></i><i></i><i></i>';
  typing.style.display = 'none';
  thread.append(typing);
  const empty = thread.querySelector('.gr-thread-empty');
  ov.layer.append(thread);
  const shownMsg = [];
  let lastThread = '';
  function drawThread(u) {
    const on = THREAD.map((m) => u >= m.at);
    const n = on.filter(Boolean).length;
    const dots = TYPING.some(([a, b]) => u >= a && u < b);
    const key = `${n}|${dots}`;
    if (key === lastThread) return;
    lastThread = key;
    msgs.forEach((d, i) => {
      const want = on[i] ? '' : 'none';
      if (shownMsg[i] !== want) { d.style.display = want; shownMsg[i] = want; }
      d.classList.toggle('gr-old', on[i] && i < n - (dots ? 1 : 2));
    });
    typing.style.display = dots ? '' : 'none';
    empty.style.display = n ? 'none' : '';
  }

  // ------------------------------------------------------------ camera: views framed once, at rest
  const vbox = (a, b) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b[0] - a[0], b[1] - a[1], b[2] - a[2])); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return m; };
  const shelfZone = vbox([go.end.x - 0.35, 0, SHELF.back], [park.x + 0.4, SHELF.top, park.z + 0.3]);
  const parkZone = vbox([park.x - 0.32, 0, SHELF.front - 0.05], [park.x + 0.32, 1.05, park.z + 0.3]);
  const graspZone = new THREE.Mesh(new THREE.BoxGeometry(...graspBox.getSize(new THREE.Vector3()).toArray()));
  graspZone.position.copy(graspBox.getCenter(new THREE.Vector3()));
  const sph = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    const w = el.clientWidth, h = el.clientHeight, a = w / Math.max(1, h);
    if (views && a === aspect) return views;
    aspect = a;
    const tall = a < 1.1;
    const f = (obj, o) => sph(stage.frame(obj, { ...o, apply: false }));
    const roomV = f(room.group, { azimuth: 24, elevation: tall ? 52 : 31, pad: tall ? 0.92 : 1.0 });
    const planV = f(room.group, { azimuth: 18, elevation: tall ? 62 : 46, pad: tall ? 0.92 : 1.0 });
    views = [
      roomV,
      planV,
      f(shelfZone, { azimuth: 38, elevation: 20, pad: tall ? 1.0 : 1.05 }),
      f(parkZone, { azimuth: 62, elevation: 12, pad: 1.1 }),
      f(graspZone, { azimuth: 46, elevation: 16, pad: tall ? 1.35 : 1.5 }),
      planV,
    ];
    return views;
  }
  const sp = new THREE.Spherical(), cam = new THREE.Vector3();
  function blend(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: cam.setFromSpherical(sp).add(target), target });
  }

  // ------------------------------------------------------------ the scroll
  let planKey = '', pathShown = null;
  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 0.07, 0);
  // the last step never scrolls all the way through on a desktop (its card leaves the screen at about
  // 0.6 of it), so it plays out over the first 55 % and then holds
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, 5), f = clamp(s === 5 ? stepP / 0.55 : stepP, 0, 1), u = s + f;
    stage.setShift(...ctx.shift());
    const st = stateAt(s, f);
    place(st.pose);
    R.lift.set(st.lift);
    R.arm.pose(st.arm);
    setItem(st);

    // the plan: grown obstacles and the cells ahead while it drives, the path on the way there and back
    const driving = s === 1 || (s === 5 && f < 0.62);
    const cone = driving ? { x: +P.x.toFixed(2), z: +P.z.toFixed(2), psi: +P.psi.toFixed(2) } : null;
    const key = driving ? `${cone.x},${cone.z},${cone.psi}` : '';
    if (key !== planKey) { planKey = key; paintPlan(room, driving ? { obstacles: 0.7, cone } : {}); stage.invalidate(); }
    const path = s === 1 ? 'out' : s === 5 && f < 0.62 ? 'back' : null;
    if (path !== pathShown) {
      pathShown = path;
      if (path) room.setPath(path === 'out' ? pathOut : back.points);
      room.path.visible = !!path;
      stage.invalidate();
    }
    const wedgeOn = s === 2;
    if (wedge.visible !== wedgeOn) { wedge.visible = wedgeOn; stage.invalidate(); }
    const found = s === 2 && f > 0.5;
    if (bracket.visible !== found) { bracket.visible = found; stage.invalidate(); }

    // the chunk of motion ahead of the gripper (a sketch of the idea, not recorded policy output)
    const chunk = s === 4 && f > 0.06 && f < 0.94;
    for (const d of dots) d.visible = chunk;
    if (chunk) {
      for (let i = 0; i < dots.length; i++) {
        R.arm.pose(armAt(Math.min(1, f + (i + 1) * 0.022)));
        stage.root.updateMatrixWorld(true);
        R.grip.getWorldPosition(dots[i].position);
      }
      R.arm.pose(st.arm);
      stage.root.updateMatrixWorld(true);
    }

    // labels
    L.you.a = s === 0 ? seg(f, 0.05, 0.2) : s === 5 ? seg(f, 0.8, 0.9) : 0;
    L.path.a = s === 1 ? 1 - seg(f, 0.4, 0.55) : 0;
    L.blocked.a = s === 1 ? 1 - seg(f, 0.7, 0.85) : 0;
    const fx = Math.sin(P.psi), fz = Math.cos(P.psi);
    L.free.p.set(P.x + fx * 0.75, 0.01, P.z + fz * 0.75);
    L.free.a = s === 1 ? seg(f, 0.1, 0.2) * (1 - seg(f, 0.85, 0.92)) : 0;
    robot.updateMatrixWorld(true);
    L.cam.p.copy(robot.localToWorld(tmp.copy(SIDE_CAM.label)));
    L.cam.a = s === 2 ? seg(f, 0, 0.12) : 0;
    L.found.a = s === 2 ? seg(f, 0.5, 0.6) : 0;
    L.lift.p.copy(robot.localToWorld(tmp.set(0.2, 0.44 + R.lift.dy, 0.2)));
    L.lift.a = s === 3 ? seg(f, 0.02, 0.1) : 0;
    if (s === 3) {
      const cm = Math.round(R.lift.dy * 100), turns = R.lift.dy / (2 * Math.PI * PULLEY_R);
      setText(L.lift, `Lift ${cm < 0 ? '-' : '+'}${Math.abs(cm)} cm, ${Math.abs(turns).toFixed(1)} pulley turns`);
    }
    R.grip.getWorldPosition(L.claw.p).add(up);
    L.claw.a = s === 4 ? 1 - seg(f, 0.4, 0.5) : 0;
    if (chunk) L.chunk.p.copy(dots[dots.length - 1].position);
    L.chunk.a = chunk ? seg(f, 0.1, 0.18) * (1 - seg(f, 0.85, 0.92)) : 0;
    drawThread(u);

    // camera
    const v = viewsNow();
    const k = s === 0 || reduced ? 1 : seg(f, 0, 0.45);
    blend(v[Math.max(0, s - 1)], v[s], k, reduced ? 0 : (f - 0.5) * 0.06);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

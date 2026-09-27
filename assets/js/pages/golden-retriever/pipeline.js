// "How it works": the fetch pipeline as a scroll-driven story on Jerry's CAD. Every frame is a
// pure function of the scroll position (step + progress through it), so scrolling back replays
// it backwards. Stages: ask, drive on a floor grid, find with the side webcam, grasp, bring back.
// The labels, the floor cells, the camera wedge and the dots ahead of the gripper are annotations
// drawn over the scene; the robot and its joints are the rigged CAD (rig.js).
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { loadRobot, POSES, DEG, PULLEY_R, SIDE_CAM, sideCameraWedge, smooth, clamp, lerp, lerpPose, style, labelLayer, SHARED_CSS } from './rig.js';
import { buildRoom, computeTargets, START, USER, plan, paintPlan, buildTrack } from './room.js';

const K = 'pill';
const withGrip = (pose, g) => [...pose.slice(0, 5), g];
const seg = (s, a, b) => smooth((s - a) / (b - a)); // 0..1 over [a, b] of the local step progress

export async function mount(el, ctx) {
  style('gr-shared-css', SHARED_CSS);
  const stage = createStage(el, { controls: false });
  const room = buildRoom(THREE);
  stage.root.add(room.group);
  const robot = new THREE.Group();
  stage.root.add(robot);
  const R = await loadRobot(stage, { add: false });
  robot.add(R.model);
  stage.fitGround();
  const { T } = computeTargets(R, THREE);
  const t = T[K], item = room.items[K];

  // the two drives, as functions of time
  const pre = { x: t.park.x - 0.5, z: t.park.z };
  const out = plan(START, pre);
  const go = buildTrack(START, [...out.points.slice(1), t.park], Math.PI / 2);
  const back = plan(go.end, START);
  const ret = buildTrack(go.end, back.points.slice(1), START.psi);
  const pathOut = [...out.points, t.park];

  // arm keyframes for the grasp step (local progress 0..1)
  const G = [
    [0, POSES.rest], [0.18, withGrip(POSES.pre, t.open)], [0.36, withGrip(POSES.reach, t.open)],
    [0.5, withGrip(POSES.reach, t.close)], [0.68, withGrip(POSES.lift, t.close)], [0.9, withGrip(POSES.carry, t.close)],
  ];
  const armAt = (u) => {
    if (u <= G[0][0]) return G[0][1];
    for (let i = 1; i < G.length; i++) if (u <= G[i][0]) return lerpPose(G[i - 1][1], G[i][1], smooth((u - G[i - 1][0]) / (G[i][0] - G[i - 1][0])));
    return G[G.length - 1][1];
  };
  const CLOSE_U = 0.5;

  // pose the robot at a whole state; returns nothing, the scene reflects it
  const P = { x: START.x, z: START.z, psi: START.psi };
  function place(p) {
    P.x = p.x; P.z = p.z; P.psi = p.psi;
    robot.position.set(p.x, 0, p.z); robot.rotation.y = p.psi;
    R.wheels.set((p.dlTot || 0) / 0.036, (p.drTot || 0) / 0.036);
  }
  // the item's transform in the gripper at the moment the jaws close, so "held" is a pure function too
  place({ ...go.end, dlTot: 0, drTot: 0 });
  R.lift.set(t.dy);
  R.arm.pose(withGrip(POSES.reach, t.close));
  stage.root.updateMatrixWorld(true);
  const itemInGrip = new THREE.Matrix4().copy(R.pivots[4].matrixWorld).invert().multiply(item.matrixWorld);
  const itemHome = item.matrix.clone();
  const seat = new THREE.Matrix4().compose(new THREE.Vector3(USER.x + 0.05, 0.45, USER.z + 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, 0)), new THREE.Vector3(1, 1, 1));
  const roomInv = new THREE.Matrix4();
  function setItem(mode, k = 0, from) {
    item.matrixAutoUpdate = false;
    if (mode === 'home') item.matrix.copy(itemHome);
    else {
      stage.root.updateMatrixWorld(true);
      const held = new THREE.Matrix4().multiplyMatrices(R.pivots[4].matrixWorld, itemInGrip);
      roomInv.copy(room.group.matrixWorld).invert();
      held.premultiply(roomInv);
      if (mode === 'held') item.matrix.copy(held);
      else { // settling on the seat
        const a = new THREE.Vector3(), qa = new THREE.Quaternion(), b = new THREE.Vector3(), qb = new THREE.Quaternion(), sc = new THREE.Vector3();
        (from || held).decompose(a, qa, sc); seat.decompose(b, qb, sc);
        a.lerp(b, k); a.y += Math.sin(Math.PI * k) * 0.06; qa.slerp(qb, k);
        item.matrix.compose(a, qa, new THREE.Vector3(1, 1, 1));
      }
    }
    item.matrixWorldNeedsUpdate = true;
  }

  // annotations: side camera wedge, "found" bracket, ACT chunk dots
  const wedge = sideCameraWedge(THREE, robot);
  const bracket = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.05, 0.1, 0.05)), new THREE.LineBasicMaterial({ color: '#ff6b35' }));
  bracket.position.copy(item.userData.home).add(new THREE.Vector3(0, 0.05, 0));
  room.group.add(bracket);
  const dots = [];
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ff6b35', transparent: true, depthWrite: false });
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), dotMat.clone()); d.renderOrder = 3; stage.scene.add(d); dots.push(d); }

  // labels
  const labels = labelLayer(stage, el);
  const lYou = labels.add('You: "bring my pill bottle"', new THREE.Vector3(USER.x, 0.98, USER.z));
  const lBot = labels.add('"Okay. Going to get the pill bottle now."', (v) => robot.localToWorld(v.set(0, 1.08, 0)), 'gr-accent');
  const mid = pathOut[Math.floor(pathOut.length / 2)];
  const lPath = labels.add('Planned path', new THREE.Vector3(mid.x, 0.02, mid.z), 'gr-accent');
  const lFree = labels.add('Free cells', (v) => { const f = Math.sin(P.psi), g = Math.cos(P.psi); return v.set(P.x + f * 0.75, 0.01, P.z + g * 0.75); });
  const lBlocked = labels.add('Blocked: obstacle plus robot half-width', new THREE.Vector3(-0.1, 0.02, -0.26));
  const lCam = labels.add('Side camera: low, angled up', (v) => robot.localToWorld(v.copy(SIDE_CAM.label)));
  const up = new THREE.Vector3(0, 0.07, 0);
  const lClaw = labels.add('Claw camera',(v) => R.grip.getWorldPosition(v).add(up));
  const lFound = labels.add('HSV colour match: pill bottle', (v) => v.copy(item.userData.home).add(new THREE.Vector3(0, 0.13, 0)), 'gr-accent');
  const lLift = labels.add('Lift', (v) => robot.localToWorld(v.set(0.2, 0.44 + R.lift.dy, 0.2)));
  const lChunk = labels.add('Next chunk of motion (sketch)', (v) => (dots[8].visible ? v.copy(dots[8].position) : null), 'gr-accent');
  const lDone = labels.add('"Here\'s the pill bottle."', (v) => robot.localToWorld(v.set(0, 1.08, 0)), 'gr-accent');

  // camera views per stage, blended across the first part of each step
  const dirOf = (az, el0) => new THREE.Vector3(Math.sin(az * DEG) * Math.cos(el0 * DEG), Math.sin(el0 * DEG), Math.cos(az * DEG) * Math.cos(el0 * DEG));
  const gp = new THREE.Vector3();
  function view(k) {
    const tg = new THREE.Vector3();
    let d, dist;
    if (k === 0) { tg.set((P.x + USER.x) / 2, 0.55, P.z); d = dirOf(28, 20); dist = 2.4; }
    else if (k === 1 || k === 4) { tg.set(P.x, 0.4, P.z); d = dirOf(24, 40); dist = 3.4; }
    else if (k === 2) { tg.set(P.x - 0.05, 0.55, (P.z + item.userData.home.z) / 2); d = dirOf(62, 22); dist = 2.1; }
    else { R.grip.getWorldPosition(gp); tg.copy(gp).lerp(new THREE.Vector3(P.x, 0.6, P.z), 0.3); d = dirOf(58, 14); dist = 1.25; }
    return { pos: tg.clone().addScaledVector(d, dist), target: tg };
  }

  function setProgress(p, step, stepP) {
    const s = clamp(step, 0, 4), u = clamp(stepP, 0, 1);
    const portrait = el.clientHeight > el.clientWidth;
    stage.setShift(portrait ? 0 : 0.15, portrait ? 0.2 : 0);
    // ---------------------------------------------------------- state
    let lift = 0, arm = POSES.rest, itemMode = 'home', seatK = 0, pose = { ...START, dlTot: 0, drTot: 0 };
    if (s === 1) { const q = go.at(go.dur * seg(u, 0.05, 0.95)); pose = { ...q, dlTot: q.dl, drTot: q.dr }; }
    if (s >= 2) pose = { ...go.end, dlTot: go.end.dl, drTot: go.end.dr };
    if (s === 2) lift = t.dy * seg(u, 0.6, 0.95);
    if (s === 3) { lift = t.dy; arm = armAt(u); if (u >= CLOSE_U) itemMode = 'held'; }
    if (s === 4) {
      const q = ret.at(ret.dur * seg(u, 0.02, 0.62));
      pose = { ...q, dlTot: go.end.dl + q.dl, drTot: go.end.dr + q.dr };
      lift = t.dy * (1 - seg(u, 0.02, 0.2));
      const g0 = withGrip(POSES.carry, t.close), g1 = withGrip(POSES.pre, t.close), g2 = withGrip(POSES.pre, t.open);
      arm = u < 0.66 ? g0 : u < 0.78 ? lerpPose(g0, g1, seg(u, 0.66, 0.78)) : u < 0.84 ? lerpPose(g1, g2, seg(u, 0.78, 0.84)) : g2;
      itemMode = u < 0.84 ? 'held' : 'seat';
      seatK = seg(u, 0.84, 0.95);
    }
    place(pose);
    R.lift.set(lift);
    if (s === 4 && itemMode === 'seat') { // the hand-off starts from where the jaws opened
      R.arm.pose(withGrip(POSES.pre, t.close));
      stage.root.updateMatrixWorld(true);
      const from = new THREE.Matrix4().multiplyMatrices(R.pivots[4].matrixWorld, itemInGrip).premultiply(roomInv.copy(room.group.matrixWorld).invert());
      R.arm.pose(arm);
      setItem('seat', seatK, from);
    } else {
      R.arm.pose(arm);
      setItem(itemMode);
    }
    // ---------------------------------------------------------- annotations
    const showPlan = s === 1 || (s === 4 && u < 0.62);
    if (showPlan) {
      room.setPath(s === 1 ? pathOut : back.points);
      room.path.visible = true;
      paintPlan(room, { obstacles: 0.7, cone: { x: P.x, z: P.z, psi: P.psi } });
    } else { room.path.visible = false; paintPlan(room, {}); }
    wedge.visible = s === 2;
    bracket.visible = s === 2 && u > 0.3;
    const chunk = s === 3 && u > 0.08 && u < 0.92;
    for (let i = 0; i < dots.length; i++) dots[i].visible = chunk;
    if (chunk) {
      const now = [...R.arm.angles];
      for (let i = 0; i < dots.length; i++) {
        R.arm.pose(armAt(Math.min(1, u + (i + 1) * 0.022)));
        stage.root.updateMatrixWorld(true);
        R.grip.getWorldPosition(dots[i].position);
        dots[i].material.opacity = 1 - i / dots.length * 0.8;
      }
      R.arm.pose(now);
    }
    labels.show(lYou, s === 0 && u > 0.1 || (s === 4 && u > 0.84));
    lYou.text = s === 4 ? 'You' : 'You: "bring my pill bottle"';
    labels.show(lBot, s === 0 && u > 0.45);
    labels.show(lPath, s === 1 && u < 0.5);
    labels.show(lFree, s === 1 && u > 0.1 && u < 0.9);
    labels.show(lBlocked, s === 1 && u < 0.8);
    labels.show(lCam, s === 2);
    labels.show(lFound, s === 2 && u > 0.3);
    labels.show(lLift, s === 2 && u > 0.6);
    if (s === 2) { const cm = Math.round(R.lift.dy * 100), turns = R.lift.dy / (2 * Math.PI * PULLEY_R); lLift.text = `Lift ${cm >= 0 ? '+' : ''}${cm} cm · ${turns.toFixed(1)} pulley turns`; }
    labels.show(lChunk, chunk);
    labels.show(lClaw, s === 3 && u < 0.45);
    labels.show(lDone, s === 4 && u > 0.86);
    // ---------------------------------------------------------- camera
    const cur = view(s);
    let v = cur;
    const blend = s > 0 ? seg(u, 0, 0.2) : 1;
    if (blend < 1) {
      // the previous stage's view, taken at the state we are in now, eased into this one
      const prev = view(s - 1);
      v = { pos: prev.pos.lerp(cur.pos, blend), target: prev.target.lerp(cur.target, blend) };
    }
    stage.setView(v);
    labels.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose: () => stage.dispose() };
}

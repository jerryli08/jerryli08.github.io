// "Text the robot": the fetch loop on Jerry's real CAD. Text it for the pill bottle, the water
// bottle or the book; it plans a path on a 5 cm floor grid (A*), drives there turning in place
// and driving straight, parks with its arm side to the shelf, raises the arm on the lift, grasps
// the item and brings it back. The replies are the robot's own lines from the hackathon.
//
// This is a simulation built for the page, not a recording: the arm plays fixed keyframes here
// (on the real robot an ACT policy produced the grasp), and the room is a set of simple props.
// The robot, its wheels, winch, carriage and arm joints move about the axes in the CAD (rig.js).
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, button } from '/assets/js/lib/ui.js';
import { loadRobot, POSES, DEG, TRACK_HALF, PULLEY_R, SIDE_CAM, sideCameraWedge, smooth, lerp, lerpPose, style, labelLayer, SHARED_CSS } from './rig.js';
import { buildRoom, computeTargets, ITEMS, START, USER, plan, paintPlan } from './room.js';

const PHASES = ['Text', 'Plan', 'Drive', 'Find', 'Lift', 'Grasp', 'Return'];
const NOTES = [
  'Your text names the item. On the real robot, Claude picked the item out of the text. The robot confirms right away.',
  'This simulation plans with A* on a 5 cm grid of the room. Red cells: obstacles grown by the robot’s half-width, so the path keeps it clear.',
  'Turn in place, drive straight, repeat. Cells ahead light up green when free and red when blocked, like the grid the real robot built from its depth camera.',
  'The low side camera looks up at the shelf, the same way the arm reaches, so the item is found where the arm can get it.',
  'The winch winds in 112 mm of line per pulley turn and the carriage carries the arm up the rails.',
  'Here the arm plays fixed keyframes. On the real robot an ACT policy made the grasp, seeing only the claw camera.',
  'Back to you, lift lowered, item held clear of the frame.',
];
const CANCEL = Symbol('cancel');
const V = () => new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const CSS = `
.gr-sim { --chat-w: 292px; }
.gr-sim.gr-wide .rx-hint { left: auto; right: 12px; }
.gr-chat { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 14px; border-radius: 18px; color: var(--text);
  background: rgba(14, 12, 11, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14px; }
.gr-wide .gr-chat { position: absolute; z-index: 5; left: 12px; top: 12px; bottom: 12px; width: var(--chat-w);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.rx-panel .gr-chat { flex: 1 1 100%; }
.gr-chat-head { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
.gr-avatar { flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: #f2c833; color: #2a2006; font-weight: 800; font-size: 15px; }
.gr-chat-head b { display: block; font-size: 14.5px; line-height: 1.2; }
.gr-chat-head small { display: block; margin-top: 2px; font-size: 12px; line-height: 1.3; color: var(--muted); }
.gr-log { flex: 1 1 auto; min-height: 72px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 2px 2px 4px; overscroll-behavior: contain; }
.rx-panel .gr-log { max-height: 200px; }
.gr-msg { max-width: 86%; padding: 7px 12px; border-radius: 17px; line-height: 1.35; overflow-wrap: anywhere; }
.gr-out { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 5px; }
.gr-in { align-self: flex-start; background: #3a3a3c; color: #f2f2f7; border-bottom-left-radius: 5px; }
.gr-sys { align-self: center; max-width: 100%; font-size: 12px; line-height: 1.4; color: var(--muted); text-align: center; }
.gr-typing { display: inline-flex; gap: 4px; padding: 11px 12px; }
.gr-typing i { width: 6px; height: 6px; border-radius: 50%; background: #9a9aa0; animation: gr-dot 1s infinite ease-in-out; }
.gr-typing i:nth-child(2) { animation-delay: .15s; } .gr-typing i:nth-child(3) { animation-delay: .3s; }
@keyframes gr-dot { 0%, 60%, 100% { opacity: .35; transform: none; } 30% { opacity: 1; transform: translateY(-2px); } }
@media (prefers-reduced-motion: reduce) { .gr-typing i { animation: none; } }
.gr-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.gr-chip { padding: 6px 11px; border-radius: 999px; border: 1px solid var(--line-strong); font-size: 12.5px; font-weight: 600; color: var(--text-2); transition: border-color .2s, color .2s; }
.gr-chip:hover { border-color: var(--accent); color: var(--text); }
.gr-form { display: flex; gap: 6px; }
.gr-form input { flex: 1; min-width: 0; padding: 8px 13px; border-radius: 999px; border: 1px solid var(--line-strong); background: rgba(255, 255, 255, 0.05); color: var(--text); font: inherit; font-size: 14px; }
.gr-form input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.gr-form button { flex: none; padding: 8px 14px; border-radius: 999px; background: #0a84ff; color: #fff; font-weight: 650; font-size: 13.5px; }
@media (pointer: coarse) { .gr-form input { font-size: 16px; } }
.gr-hud { position: absolute; z-index: 4; top: 12px; right: 12px; left: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
.gr-wide .gr-hud { left: calc(var(--chat-w) + 28px); }
.gr-steps { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; margin: 0; padding: 0; list-style: none; }
.gr-steps li { padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 650; letter-spacing: .02em; color: rgba(243, 238, 232, .55);
  background: rgba(12, 10, 9, .62); border: 1px solid rgba(255, 255, 255, .1); }
.gr-steps li.on { color: #1a0b04; background: var(--accent); border-color: var(--accent); }
.gr-steps li.done { color: var(--text-2); }
.gr-note { max-width: 440px; margin: 0; padding: 7px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; color: var(--text-2);
  background: rgba(12, 10, 9, .72); border: 1px solid rgba(255, 255, 255, .1); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.gr-note:empty { display: none; }
@media (max-width: 640px) {
  .gr-steps li { display: none; } .gr-steps li.on { display: block; }
  .gr-note { font-size: 12px; max-width: 100%; }
}
`;

function parse(text) {
  const t = text.toLowerCase();
  if (/\b(pill|pills|meds|medicine|medication)\b/.test(t)) return 'pill';
  if (/\b(water|drink|thirsty)\b/.test(t) || /\bbottle\b/.test(t)) return 'water';
  if (/\b(book|read|novel)\b/.test(t)) return 'book';
  return null;
}
const STOP = new Set(['hey', 'hi', 'yo', 'please', 'pls', 'can', 'could', 'would', 'will', 'you', 'go', 'get', 'bring', 'fetch', 'grab', 'find', 'me', 'my', 'the', 'a', 'an', 'some', 'robot', 'retriever', 'golden', 'i', 'want', 'need', 'to', 'over', 'here', 'now', 'thanks', 'thank', 'and', 'for']);
function noun(text) {
  const w = text.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').split(/\s+/).filter(Boolean);
  let a = 0, b = w.length;
  while (a < b && STOP.has(w[a])) a++;
  while (b > a && STOP.has(w[b - 1])) b--;
  const n = w.slice(a, Math.min(b, a + 3)).join(' ');
  return n.length > 1 && n.length < 28 ? n : null;
}

export async function mount(el, ctx) {
  style('gr-shared-css', SHARED_CSS);
  style('gr-sim-css', CSS);
  el.classList.add('gr-sim');
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { hint: ctx.isTouch ? 'Swipe sideways to turn' : 'Drag to look around' });
  const { camera } = stage;
  const target = stage.controls.target;

  const room = buildRoom(THREE);
  stage.root.add(room.group);
  const robot = new THREE.Group();
  robot.name = 'robot';
  stage.root.add(robot);
  const R = await loadRobot(stage, { add: false });
  robot.add(R.model);
  stage.fitGround();

  // parking spots and lift heights for each item, from the rig's forward kinematics
  const { T, reach } = computeTargets(R, THREE);
  const withGrip = (pose, g) => [...pose.slice(0, 5), g];

  // ---------------------------------------------------------------- robot pose
  const P = { x: START.x, z: START.z, psi: START.psi };
  const applyPose = () => { robot.position.set(P.x, 0, P.z); robot.rotation.y = P.psi; stage.invalidate(); };
  applyPose();

  // side camera view (annotation): a translucent wedge from low on the robot's arm side, tilted up
  // at the shelf (Jerry: the detection camera sits at the bottom, angled up). The webcam is not in
  // the CAD, so its exact spot is approximate; the wedge only shows which way it looks.
  const cone = sideCameraWedge(THREE, robot);
  cone.visible = false;
  // "found" bracket around an item (annotation)
  const bracket = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#ff6b35' }));
  bracket.visible = false;
  room.group.add(bracket);
  const itemSize = { pill: [0.05, 0.1, 0.05], water: [0.08, 0.22, 0.08], book: [0.045, 0.24, 0.17] };
  const showFound = (k) => {
    if (!k) { bracket.visible = false; stage.invalidate(); return; }
    const s = itemSize[k], h = room.items[k].userData.home;
    bracket.scale.set(...s);
    bracket.position.set(h.x, h.y + s[1] / 2, k === 'book' ? h.z - 0.025 : h.z);
    bracket.visible = true; stage.invalidate();
  };

  // ---------------------------------------------------------------- labels and HUD
  const labels = labelLayer(stage, el);
  labels.add('You', new THREE.Vector3(USER.x, 0.98, USER.z));
  let pathMid = null;
  const lPath = labels.add('Planned path', () => pathMid, 'gr-accent');
  const lBlocked = labels.add('Blocked cells', new THREE.Vector3(-0.1, 0.02, -0.25));
  const lCam = labels.add('Side camera', (v) => (cone.visible ? robot.localToWorld(v.copy(SIDE_CAM.label)) : null));
  let clawOn = false;
  const tmpUp = new THREE.Vector3(0, 0.07, 0);
  const lClaw = labels.add('Claw camera',(v) => (clawOn ? R.grip.getWorldPosition(v).add(tmpUp) : null), 'gr-accent');
  let foundKey = null;
  const lFound = labels.add('Found', (v) => { if (!foundKey) return null; const h = room.items[foundKey].userData.home; return v.set(h.x, h.y + itemSize[foundKey][1] + 0.02, h.z); }, 'gr-accent');
  const lLift = labels.add('Lift', (v) => robot.localToWorld(v.set(0.2, 0.44 + R.lift.dy, 0.2)));
  for (const l of [lPath, lBlocked, lCam, lFound, lLift, lClaw]) labels.show(l, false);

  const hud = document.createElement('div');
  hud.className = 'gr-hud';
  hud.innerHTML = `<ol class="gr-steps" aria-label="Fetch steps">${PHASES.map((p, i) => `<li>${i + 1} ${p}</li>`).join('')}</ol><p class="gr-note" aria-live="polite"></p>`;
  el.appendChild(hud);
  const stepEls = [...hud.querySelectorAll('li')], noteEl = hud.querySelector('.gr-note');
  function setPhase(i) {
    stepEls.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', i >= 0 && k < i); });
    noteEl.textContent = i >= 0 ? NOTES[i] : '';
  }

  // ---------------------------------------------------------------- chat
  const chat = document.createElement('div');
  chat.className = 'gr-chat';
  chat.innerHTML = `<div class="gr-chat-head"><span class="gr-avatar" aria-hidden="true">G</span><div><b>Text me what you need</b><small>Ask for something and I'll fetch it and bring it over.</small></div></div>
    <div class="gr-log" role="log" aria-live="polite" aria-label="Messages"></div>
    <div class="gr-chips"></div>
    <form class="gr-form"><input type="text" name="m" maxlength="80" autocomplete="off" placeholder="Text the robot" aria-label="Message to the robot"><button type="submit">Send</button></form>`;
  const log = chat.querySelector('.gr-log'), chips = chat.querySelector('.gr-chips'), form = chat.querySelector('form'), input = form.querySelector('input');
  for (const c of ['Bring my pill bottle', 'Bring my water bottle', 'Bring my book', 'Bring my phone']) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gr-chip'; b.textContent = c;
    b.addEventListener('click', () => send(c));
    chips.appendChild(b);
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
  const bubble = (cls, text) => {
    const d = document.createElement('div');
    d.className = `gr-msg ${cls}`; d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  };
  const sys = (text) => { const d = document.createElement('div'); d.className = 'gr-sys'; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; };
  sys('Pick a message below or type your own.');
  async function say(text, tok) {
    const d = document.createElement('div');
    d.className = 'gr-msg gr-in gr-typing'; d.setAttribute('aria-label', 'Typing');
    d.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    await sleep(400);
    d.remove();
    if (tok != null && tok !== token) throw CANCEL;
    bubble('gr-in', text);
  }

  // wide canvases carry the chat over their left side; narrow ones put it under the canvas
  let wide = null;
  function layout() {
    const w = el.clientWidth >= 760;
    if (w === wide) return;
    wide = w;
    el.classList.toggle('gr-wide', w);
    if (w) el.appendChild(chat); else ctx.panel.prepend(chat);
    stage.setShift(w ? 0.13 : 0, 0);
    labels.update();
  }
  const ro = new ResizeObserver(() => { layout(); labels.update(); });
  ro.observe(el);

  // ---------------------------------------------------------------- controls
  let speed = 1, follow = true;
  segmented(ctx.panel, { label: 'Speed', options: [{ value: 1, label: '1x' }, { value: 2, label: '2x' }, { value: 4, label: '4x' }], value: 1, onChange: (v) => { speed = v; } });
  segmented(ctx.panel, { label: 'Camera', options: [{ value: 'follow', label: 'Follow' }, { value: 'free', label: 'Free' }], value: 'follow', onChange: (v) => { follow = v === 'follow'; if (follow) kick(); } });
  button(ctx.panel, { label: 'Reset', onClick: reset });

  // ---------------------------------------------------------------- animation core
  let token = 0;
  const active = new Set();
  let stopLoop = null, wantDist = null, zoomGrip = false;
  const focus = V(), tmp = V();
  function loop(dt) {
    for (const tw of [...active]) tw(dt);
    const moved = followCam(dt);
    labels.update();
    if (!active.size && !moved) { stopLoop?.(); stopLoop = null; }
  }
  function kick() { if (!reduced && !stopLoop) stopLoop = stage.onFrame(loop); else if (reduced) { followCam(1, true); labels.update(); } }
  function followCam(dt, snap) {
    if (!follow) { wantDist = null; return false; }
    if (zoomGrip) R.grip.getWorldPosition(focus); else focus.set(P.x, 0.45, P.z);
    const k = snap || reduced ? 1 : 1 - Math.exp(-dt * 2.4);
    tmp.copy(target);
    target.lerp(focus, k);
    camera.position.add(tmp.subVectors(target, tmp));
    if (wantDist != null) {
      const off = tmp.subVectors(camera.position, target), d = off.length();
      const nd = lerp(d, wantDist, snap || reduced ? 1 : 1 - Math.exp(-dt * 1.4));
      camera.position.copy(target).add(off.setLength(nd));
      if (Math.abs(nd - wantDist) < 0.005) wantDist = null;
    }
    camera.lookAt(target);
    stage.invalidate();
    return wantDist != null || target.distanceTo(focus) > 0.004;
  }
  function tween(dur, fn, tok) {
    if (tok !== token) return Promise.reject(CANCEL);
    if (reduced) { fn(1); followCam(1, true); labels.update(); return Promise.resolve(); }
    return new Promise((res, rej) => {
      let t = 0;
      const tw = (dt) => {
        if (tok !== token) { active.delete(tw); rej(CANCEL); return; }
        t = Math.min(1, t + (dt * speed) / Math.max(dur, 1e-3));
        fn(t);
        if (t >= 1) { active.delete(tw); res(); }
      };
      active.add(tw);
      kick();
    });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function wait(s, tok) {
    if (reduced) { await sleep(Math.min(900, s * 1000)); if (tok !== token) throw CANCEL; return; }
    await tween(s, () => {}, tok);
  }
  async function phase(i, tok, dist, grip) {
    if (tok !== token) throw CANCEL;
    setPhase(i);
    if (dist) wantDist = dist;
    zoomGrip = !!grip;
    kick();
    if (reduced) await sleep(700);
  }

  // ---------------------------------------------------------------- motion
  async function turnTo(psi1, tok) {
    const psi0 = P.psi, d = wrap(psi1 - psi0);
    if (Math.abs(d) < 0.01) return;
    let last = 0;
    await tween(Math.abs(d) / (110 * DEG) + 0.3, (t) => {
      const e = smooth(t), de = (e - last) * d; last = e;
      P.psi = psi0 + d * e;
      R.wheels.roll(de * TRACK_HALF, -de * TRACK_HALF); // turning left: left wheels forward, right wheels back
      applyPose(); cone0();
    }, tok);
  }
  async function lineTo(x1, z1, tok, v = 0.32) {
    const x0 = P.x, z0 = P.z, d = Math.hypot(x1 - x0, z1 - z0);
    if (d < 0.005) return;
    let last = 0;
    await tween(d / v + 0.35, (t) => {
      const e = smooth(t), dd = (e - last) * d; last = e;
      P.x = lerp(x0, x1, e); P.z = lerp(z0, z1, e);
      R.wheels.roll(dd, dd);
      applyPose(); cone0();
    }, tok);
  }
  async function drivePath(pts, tok) {
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - P.x, dz = pts[i].z - P.z;
      if (Math.hypot(dx, dz) < 0.02) continue;
      await turnTo(Math.atan2(dx, dz), tok);
      await lineTo(pts[i].x, pts[i].z, tok);
    }
  }
  async function liftTo(dy, tok) {
    const d0 = R.lift.dy;
    if (Math.abs(dy - d0) < 0.002) return;
    await tween(Math.abs(dy - d0) / 0.08 + 0.3, (t) => {
      R.lift.set(lerp(d0, dy, smooth(t)));
      const cm = Math.round(R.lift.dy * 100), turns = R.lift.dy / (2 * Math.PI * PULLEY_R);
      lLift.text = `Lift ${cm >= 0 ? '+' : ''}${cm} cm · ${turns >= 0 ? '+' : ''}${turns.toFixed(1)} pulley turns`;
    }, tok);
  }
  async function armTo(pose, dur, tok) {
    const a0 = [...R.arm.angles];
    await tween(dur, (t) => R.arm.pose(lerpPose(a0, pose, smooth(t))), tok);
  }
  let conePaint = false;
  function cone0() { if (conePaint) paintPlan(room, { obstacles: 0.55, cone: { x: P.x, z: P.z, psi: P.psi } }); }
  function showPlan(points) {
    if (!points) { room.path.visible = false; paintPlan(room, {}); conePaint = false; pathMid = null; labels.show(lPath, false); labels.show(lBlocked, false); stage.invalidate(); return; }
    room.setPath(points);
    room.path.visible = true;
    paintPlan(room, { obstacles: 1 });
    const m = points[Math.floor(points.length / 2)];
    pathMid = new THREE.Vector3(m.x, 0.02, m.z);
    labels.show(lPath, true); labels.show(lBlocked, true);
    stage.invalidate();
  }

  // ---------------------------------------------------------------- the fetch loop
  async function fetchItem(k, tok) {
    const it = ITEMS[k], obj = room.items[k], t = T[k];
    await say(`Okay. Going to get the ${it.name} now.`, tok);
    await phase(1, tok, 3.1);
    const pre = { x: t.park.x - 0.5, z: t.park.z };
    const route = plan(P, pre);
    showPlan([...route.points, t.park]);
    await wait(1.1, tok);
    await phase(2, tok);
    conePaint = true;
    await drivePath(route.points, tok);
    await turnTo(Math.PI / 2, tok);
    await lineTo(t.park.x, t.park.z, tok, 0.22);
    showPlan(null);
    await phase(3, tok, 1.9);
    cone.visible = true; labels.show(lCam, true); stage.invalidate();
    await wait(0.7, tok);
    foundKey = k; showFound(k); lFound.text = `Found: ${it.name}`; labels.show(lFound, true);
    await wait(0.8, tok);
    await phase(4, tok);
    labels.show(lLift, true);
    await liftTo(t.dy, tok);
    await wait(0.3, tok);
    labels.show(lLift, false);
    cone.visible = false; labels.show(lCam, false);
    await phase(5, tok, 1.35, true);
    clawOn = true; labels.show(lClaw, true);
    await armTo(withGrip(POSES.pre, t.open), 0.9, tok);
    await armTo(withGrip(POSES.reach, t.open), 0.7, tok);
    await armTo(withGrip(POSES.reach, t.close), 0.5, tok);
    R.pivots[4].attach(obj);
    showFound(null); foundKey = null; labels.show(lFound, false);
    clawOn = false; labels.show(lClaw, false);
    await armTo(withGrip(POSES.lift, t.close), 0.6, tok);
    await armTo(withGrip(POSES.carry, t.close), 0.8, tok);
    await phase(6, tok, 3.1);
    const back = plan(P, START);
    showPlan(back.points);
    conePaint = true;
    await Promise.all([liftTo(0, tok), (async () => { await wait(0.5, tok); await drivePath(back.points, tok); })()]);
    await turnTo(START.psi, tok);
    showPlan(null);
    // hand it over: reach toward the chair, open, and the item settles on the seat
    wantDist = 2.2; kick();
    await armTo(withGrip(POSES.pre, t.close), 0.9, tok);
    await armTo(withGrip(POSES.pre, t.open), 0.4, tok);
    room.group.attach(obj);
    const p0 = obj.position.clone(), q0 = obj.quaternion.clone(), p1 = new THREE.Vector3(USER.x + 0.05, 0.45, USER.z + (k === 'book' ? 0 : 0.05));
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(k === 'book' ? -Math.PI / 2 : 0, 0.4, 0));
    await tween(0.55, (s) => { const e = smooth(s); obj.position.lerpVectors(p0, p1, e); obj.position.y += Math.sin(Math.PI * e) * 0.06; obj.quaternion.slerpQuaternions(q0, q1, e); stage.invalidate(); }, tok);
    await say(`Here's the ${it.name}.`, tok);
    await armTo(POSES.rest, 0.9, tok);
    setPhase(-1);
    await wait(1.2, tok);
    await putBack(k, tok);
  }
  async function putBack(k, tok) {
    const obj = room.items[k];
    await tween(0.3, (s) => { obj.scale.setScalar(1 - smooth(s)); stage.invalidate(); }, tok);
    home(k);
    obj.scale.setScalar(0.001);
    await tween(0.35, (s) => { obj.scale.setScalar(Math.max(0.001, smooth(s))); stage.invalidate(); }, tok);
  }
  function home(k) {
    const obj = room.items[k];
    room.group.add(obj);
    obj.position.copy(obj.userData.home); obj.quaternion.identity(); obj.scale.setScalar(1);
    stage.invalidate();
  }
  async function search(n, tok) {
    await say(`Okay. Going to get the ${n} now.`, tok);
    await phase(1, tok, 3.1);
    const z = T.water.park.z, x0 = T.water.park.x - 0.5, x1 = T.book.park.x + 0.5;
    const route = plan(P, { x: x0, z });
    showPlan([...route.points, { x: x1, z }]);
    await wait(1.1, tok);
    await phase(2, tok);
    conePaint = true;
    await drivePath(route.points, tok);
    await turnTo(Math.PI / 2, tok);
    showPlan(null);
    await phase(3, tok, 2.4);
    cone.visible = true; labels.show(lCam, true); lCam.text = `Side camera: no ${n}`;
    await lineTo(x1, z, tok, 0.14);
    await wait(0.4, tok);
    cone.visible = false; labels.show(lCam, false); lCam.text = 'Side camera';
    await say(`I couldn't find the ${n}. Is it somewhere else?`, tok);
    await phase(6, tok, 3.1);
    const back = plan(P, START);
    showPlan(back.points);
    conePaint = true;
    await drivePath(back.points, tok);
    await turnTo(START.psi, tok);
    showPlan(null);
    setPhase(-1);
  }

  let busy = null;
  async function send(text) {
    text = String(text || '').trim();
    if (!text) return;
    bubble('gr-out', text);
    if (busy) { const n = ITEMS[busy]?.name || busy; say(`Still working on the ${n}. Looking for the ${n}.`).catch(() => {}); return; }
    const k = parse(text);
    const n = k ? null : noun(text);
    if (!k && !n) { sys('Try asking for the pill bottle, the water bottle or the book.'); return; }
    const tok = ++token;
    busy = k || n;
    setPhase(0);
    try { if (k) await fetchItem(k, tok); else await search(n, tok); }
    catch (e) { if (e !== CANCEL) console.error('[fetch-sim]', e); }
    finally { if (tok === token) { busy = null; setPhase(-1); zoomGrip = false; } }
  }

  function reset() {
    token++;
    active.clear();
    busy = null;
    P.x = START.x; P.z = START.z; P.psi = START.psi; applyPose();
    R.arm.pose(POSES.rest); R.lift.set(0);
    for (const k of Object.keys(room.items)) home(k);
    cone.visible = false; showFound(null); foundKey = null; showPlan(null); clawOn = false;
    for (const l of [lCam, lFound, lLift, lClaw]) labels.show(l, false);
    setPhase(-1); zoomGrip = false;
    log.replaceChildren(); sys('Reset. Pick a message below or type your own.');
    overview(0.8);
  }

  // ---------------------------------------------------------------- start: the whole room, from behind the robot
  function overview(dur = 0) {
    // a tall phone canvas fits the room's width, so look down more steeply to use its height
    const portrait = el.clientHeight > el.clientWidth * 1.1;
    const v = stage.frame(room.group, { azimuth: 24, elevation: portrait ? 50 : 31, pad: portrait ? 0.9 : 1.02, apply: false, track: false });
    wantDist = null;
    if (dur && !reduced) stage.tweenCamera(v, dur).then(() => labels.update()); else stage.setView(v);
    labels.update();
  }
  layout();
  overview();
  showPlan(null);
  stage.controls.addEventListener('change', () => labels.update());
  el.grDebug = { R, P, T, room, stage, applyPose, labels, reach, POSES, withGrip }; // for checking poses from a test script
  return {
    dispose() { token++; active.clear(); stopLoop?.(); ro.disconnect(); chat.remove(); stage.dispose(); },
  };
}

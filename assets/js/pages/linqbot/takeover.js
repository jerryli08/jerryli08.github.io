// "When autonomy fails, a human takes over", scroll-driven: the loop LinqBot was meant to close,
// animated on Jerry's CAD of the SO-101. It is the plan, not a recording: at the hackathon each
// control mode ran on its own, and our repo lists failure escalation to AR hand-tracking recovery
// and a control-mode arbiter as to-do. The mode names come from our repo's product plan
// (docs/future-product-plan/04-control-modes.md: Autonomous, Escalating, Human Control, Resuming);
// 03-human-recovery.md: "When autonomy fails, notify a remote operator, put robot video on AR
// glasses, and hand arm/gripper control to the existing hand-tracking teleop pipeline", with
// request_human_assistance(reason="grasp failed"). The plan text, the replies and the alert are
// illustrative; the status lines in the lens are the ones our glasses overlay draws
// (robot/src/overlay/status_display.py).
//
// Jerry (Sept 28): show the display on a 3D model of AR glasses, not two squares: the camera zooms
// into the lenses, which are clear at first, then flag you, then turn opaque into the top-down
// camera view of the arm. The glasses are a model of the Xreal One Pro with the Eye (glasses.js,
// not CAD); the top-down view is our CAD scene rendered from a camera above the arm into the lens.
//
// One scroll step per beat. The picture is a pure function of (step, stepP): the arm and can follow
// a 24-second timeline, the camera blends between views framed once at rest (cached per stage size
// and picture shift), and each step starts from exactly where the one before ended.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { smoother } from '/assets/js/lib/ease.js';
import { THREE, loadArm, props, fitBox, style, h, ROLL, SEEDS, CAN, fk, toArm, ik, ikBest, gripAngleFor, lerp, smooth, clamp } from './rig.js';
import { makeGlasses } from './glasses.js';

const MODES = ['Planning', 'Autonomous', 'Escalating', 'Human control', 'Resuming', 'Autonomous'];
// per step: its mode, and how the arm's timeline runs over the step ([t0, t1] from stepP a to b)
const STEPS = [
  { mode: 0, t: [0, 2, 0, 0.85] },      // planning
  { mode: 1, t: [2, 7, 0, 0.85] },      // the miss
  { mode: 2, t: [7, 7, 0, 1] },         // to the glasses
  { mode: 2, t: [7, 7, 0, 1] },         // clear lenses
  { mode: 2, t: [7, 9.5, 0, 1] },       // the alert (the arm waits)
  { mode: 3, t: [9.5, 9.5, 0, 1] },     // the lenses go dark: the robot's camera
  { mode: 3, t: [9.5, 18, 0.04, 0.92] },// by hand
  { mode: 4, t: [18, 20, 0, 0.3] },     // resuming
  { mode: 5, t: [20, 24, 0.45, 1] },    // autonomous again
];
const PLAN = ['move_cartesian forward 0.20 m', 'move_cartesian down 0.10 m', 'set_gripper closed', 'move_cartesian up 0.15 m', 'move_cartesian right 0.20 m', 'set_gripper open'];
const FLOOR = new THREE.Color('#17130f'); // round the table, in the robot camera's view

const CSS = `
.lq-tv { --chat-w: 300px; }
.lq-tv-modes { position: absolute; z-index: 6; top: 12px; left: 12px; right: 12px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin: 0; padding: 0; list-style: none; pointer-events: none; }
.lq-tv-modes { left: calc(var(--rx-cover, 0px) + 12px); }
.lq-tv-modes li { padding: 3px 10px; border-radius: 999px; font-size: var(--rx-ov-small); font-weight: 650; color: rgba(243, 238, 232, .55); background: rgba(12, 10, 9, .66); border: 1px solid rgba(255, 255, 255, .1); }
.lq-tv-modes li.on { color: #1a0b04; background: var(--accent); border-color: var(--accent); }
.lq-tv-modes li.human.on { background: #3ee06b; border-color: #3ee06b; color: #06220f; }
.lq-tv-modes li.esc.on { background: #ff4b3e; border-color: #ff4b3e; color: #fff; }
.lq-tv-chat { display: none; flex-direction: column; gap: 6px; padding: 10px; border-radius: 16px; background: rgba(14, 12, 11, .9); border: 1px solid rgba(255, 255, 255, .12); font-size: 14px; line-height: 1.4; pointer-events: none; }
.lq-wide .lq-tv-chat { display: flex; position: absolute; z-index: 5; left: calc(var(--rx-cover, 0px) + 12px); top: 54px; width: var(--chat-w); max-height: calc(100% - 112px); overflow: hidden; }
.lq-tv-chat .b { max-width: 94%; padding: 6px 10px; border-radius: 14px; white-space: pre-wrap; }
.lq-tv-chat .u { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 4px; }
.lq-tv-chat .r { align-self: flex-start; background: #3a3a3c; color: #f2f2f7; border-bottom-left-radius: 4px; }
.lq-tv-chat .r.bad { background: #4a1f1c; color: #ffd6d2; }
.lq-tv-chat .r.good { background: #173a22; color: #d3f5dc; }
.lq-tv-chat small { display: block; font-size: 13px; color: rgba(255, 255, 255, .6); margin-bottom: 2px; }
.lq-tv-chat ol { margin: 0; padding-left: 18px; }
.lq-tv-chat li { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; color: rgba(242, 242, 247, .7); }
.lq-tv-chat li.now { color: #fff; font-weight: 700; }
.lq-tv-chat li.hand { color: #7ee2a0; }
.lq-tv-chat li.fail { color: #ff8a80; }
/* what the glasses show, laid over the right lens (placed from the lens outline each frame) */
.lq-tv-lens { position: absolute; z-index: 5; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.lq-tv-lens > * { position: absolute; opacity: 0; }
.lq-tv-alert { left: 50%; top: 50%; width: min(86%, 430px); display: flex; gap: 12px; align-items: flex-start; padding: 12px 16px 13px 12px; border-radius: 18px; background: rgba(34, 34, 37, .93);
  border: 1px solid rgba(255, 255, 255, .16); color: #f2f2f7; font-size: var(--rx-ov-text); line-height: 1.35; box-shadow: 0 18px 40px -18px #000; }
.lq-tv-alert i { flex: none; width: 36px; height: 36px; border-radius: 10px; background: #ff4b3e; color: #fff; font: 800 22px/36px system-ui, sans-serif; font-style: normal; text-align: center; }
.lq-tv-alert.ok i { background: #34c759; }
.lq-tv-alert small { display: block; font-size: var(--rx-ov-small); color: rgba(255, 255, 255, .62); }
.lq-tv-alert b { display: block; font-size: calc(var(--rx-ov-text) * 1.12); color: #fff; }
.lq-tv-hud { left: 7%; top: 9%; margin: 0; padding: 8px 12px; border-radius: 10px; background: rgba(0, 0, 0, .58); list-style: none;
  font: 600 var(--rx-ov-text)/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #e8e8e8; white-space: nowrap; }
.lq-tv-hud .bad { color: #ff5a4f; } .lq-tv-hud .ok { color: #3ee06b; } .lq-tv-hud .warn { color: #ffe14d; } .lq-tv-hud .dim { color: #a5a5a5; }
.lq-tv-feed { right: 12%; bottom: 10%; padding: 4px 12px; border-radius: 999px; background: rgba(0, 0, 0, .6); font-size: var(--rx-ov-small); font-weight: 600; color: #f3eee8; white-space: nowrap; }
.lq-tv-feed::before { content: ''; display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 50%; background: #ff4b3e; vertical-align: 1px; }
.lq-tv-label { position: absolute; z-index: 6; left: 12px; bottom: 12px; max-width: calc(100% - 24px); margin: 0; padding: 5px 11px; border-radius: 10px; font-size: var(--rx-ov-small); line-height: 1.4; color: var(--text-2); background: rgba(12, 10, 9, .75); border: 1px solid rgba(255, 255, 255, .12); pointer-events: none; }
.lq-tv-label { left: calc(var(--rx-cover, 0px) + 12px); max-width: calc(100% - var(--rx-cover, 0px) - 24px); }
.lq-wide .lq-tv-label.arm { left: calc(var(--rx-cover, 0px) + var(--chat-w) + 24px); max-width: calc(100% - var(--rx-cover, 0px) - var(--chat-w) - 36px); }
@media (max-width: 640px) {
  .lq-tv-modes li { display: none; } .lq-tv-modes li.on { display: block; }
  .lq-tv-hud { left: 4%; top: 8%; padding: 5px 8px; } .lq-tv-hud .x { display: none; } .lq-tv-feed { display: none; } .lq-tv-alert { padding: 9px 12px 10px 10px; gap: 9px; } .lq-tv-alert i { width: 28px; height: 28px; font-size: 17px; line-height: 28px; }
}
`;

export async function mount(el, ctx) {
  style('lq-tv-css', CSS);
  el.classList.add('lq-tv');
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const arm = await loadArm(stage);
  const { can } = props(stage);
  stage.fitGround();

  // ---------------------------------------------------------------- the scripted scene (URDF frame, metres)
  const EXP = [0.2, 0], OFF = -0.045; // where the plan expects the can / how far to the arm's right it really is
  const REST = [0, 25, -100, 80, ROLL, 30]; // raised and clear of the can
  const K = {
    A1: [EXP[0], EXP[1], 0.17], A2: [EXP[0], EXP[1], 0.07],
    H1: [0.294, OFF, 0.13], H2: [0.294, OFF, 0.03], H3: [0.24, -0.2, 0.15], H4: [0.24, -0.2, 0.066],
  };
  const canC = toArm([EXP[0], OFF, 0]); canC[1] = 0; // standing can, bottom centre
  const contact = gripAngleFor(CAN.r * 2 + 0.004);
  // IK along each straight segment, solved once, each sample warm-started from the last
  const qA1 = ikBest(toArm(K.A1), SEEDS).q;
  function path(a, b, q0, n = 40) {
    const out = [q0.slice(0, 4)];
    let q = q0.slice(0, 5);
    for (let i = 1; i <= n; i++) {
      const tgt = toArm(a.map((v, k) => lerp(v, b[k], i / n)));
      q = ik(tgt, q, { iters: 120 }).q;
      out.push(q.slice(0, 4));
    }
    return out;
  }
  const P1 = path(K.A1, K.A2, qA1);
  const P2 = path(K.A2, K.H1, [...P1.at(-1), ROLL]);
  const P3 = path(K.H1, K.H2, [...P2.at(-1), ROLL]);
  const P4 = path(K.H2, K.H3, [...P3.at(-1), ROLL]);
  const P5 = path(K.H3, K.H4, [...P4.at(-1), ROLL]);
  const sample = (P, u) => { const f = clamp(u, 0, 1) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), k = f - i; return P[i].map((v, j) => lerp(v, P[i + 1][j], k)); };
  const seg = (t, a, b) => smooth((t - a) / (b - a));

  function armAt(t) {
    let q4, jaw;
    if (t < 2) q4 = REST.slice(0, 4);
    else if (t < 4) q4 = REST.slice(0, 4).map((v, i) => lerp(v, qA1[i], seg(t, 2, 4)));
    else if (t < 9.5) q4 = sample(P1, seg(t, 4, 6));
    else if (t < 11.5) q4 = sample(P2, seg(t, 9.5, 11.5));
    else if (t < 15.5) q4 = sample(P3, seg(t, 11.5, 13.5));
    else if (t < 20) q4 = sample(P4, seg(t, 15.5, 18));
    else if (t < 22.6) q4 = sample(P5, seg(t, 20, 22));
    else q4 = P5.at(-1).map((v, i) => lerp(v, REST[i], seg(t, 22.6, 24)));
    if (t < 6) jaw = 30;
    else if (t < 9.5) jaw = lerp(30, 95, seg(t, 6, 7));
    else if (t < 15) jaw = lerp(95, 20, seg(t, 9.5, 10.5));
    else if (t < 22) jaw = lerp(20, contact, seg(t, 15, 15.5));
    else jaw = lerp(contact, 20, seg(t, 22, 22.6));
    if (t >= 22.6) jaw = lerp(20, REST[5], seg(t, 22.6, 24));
    return [...q4, ROLL, jaw];
  }
  // the can: standing, knocked over by the jaw, carried lying, set down upright
  const up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3(), tcp = new THREE.Vector3();
  const lying = new THREE.Vector3(canC[0], CAN.r, canC[2] + CAN.r + CAN.h / 2);
  const tcpAt = (t) => new THREE.Vector3(...fk(armAt(t)));
  const graspOff = lying.clone().sub(tcpAt(15.5));
  const setDown = tcpAt(22).add(graspOff);
  function canAt(t) {
    if (t >= 4.8 && t < 15.5) {
      const th = (Math.PI / 2) * Math.min(1, ((t - 4.8) / 0.8) ** 2);
      ax.set(0, Math.cos(th), Math.sin(th));
      return { bottom: new THREE.Vector3(canC[0], CAN.r * Math.sin(th), canC[2] + CAN.r - CAN.r * Math.cos(th)), axis: ax.clone() };
    }
    if (t < 4.8) return { bottom: new THREE.Vector3(canC[0], 0, canC[2]), axis: up.clone() };
    let c, u = 0;
    if (t < 22) { tcp.set(...fk(armAt(t))); c = tcp.clone().add(graspOff); u = t < 20 ? 0 : seg(t, 20, 22); }
    else { c = setDown.clone(); u = 1; }
    ax.set(0, Math.sin((u * Math.PI) / 2), Math.cos((u * Math.PI) / 2)).normalize();
    if (u >= 1) c.y = CAN.h / 2;
    return { bottom: c.clone().addScaledVector(ax, -CAN.h / 2), axis: ax.clone() };
  }

  // ---------------------------------------------------------------- the operator's glasses (a model, not CAD)
  // Across the table at the arm's front right, about 1.2 m away at seated eye height, looking at the
  // arm. Added to the scene, not to the models, so the ground, the contact shadow and the key
  // light's shadow stay fitted to the arm.
  const G = makeGlasses();
  const W = new THREE.Vector3(-0.07, 0.12, 0.13); // what the operator looks at
  G.group.position.copy(W).addScaledVector(new THREE.Vector3(-0.395, 0.242, 0.886).normalize(), 1.2);
  G.group.lookAt(W);
  G.group.updateMatrixWorld(true);
  G.group.visible = false;
  stage.scene.add(G.group);
  const q = G.group.quaternion;
  const locDir = (x, y, z) => new THREE.Vector3(x, y, z).normalize().applyQuaternion(q);
  const fwd = locDir(0, 0, 1), back = fwd.clone().negate();
  const lensC = G.right.center.clone().applyMatrix4(G.group.matrixWorld);
  const lensPts = G.right.outline.map((p) => p.clone().applyMatrix4(G.group.matrixWorld));
  const invQ = q.clone().invert();
  const obbPts = [];
  for (let i = 0; i < 8; i++) obbPts.push(new THREE.Vector3(i & 1 ? G.obb.max.x : G.obb.min.x, i & 2 ? G.obb.max.y : G.obb.min.y, i & 4 ? G.obb.max.z : G.obb.min.z).applyMatrix4(G.group.matrixWorld));
  const obbC = G.obb.getCenter(new THREE.Vector3()).applyMatrix4(G.group.matrixWorld);
  // a product light for the glasses: the scene's key light hits them from behind, so while they are
  // seen from outside (steps 3 and 4) this one lights their front; it is off everywhere else
  const pLight = new THREE.DirectionalLight('#fff4ea', 0);
  pLight.position.copy(G.group.position).add(locDir(0.45, 0.8, 0.6));
  pLight.target.position.copy(G.group.position);
  stage.scene.add(pLight, pLight.target);

  // the robot's camera: straight down on the work area, the arm's base at the bottom of the picture
  // as in our top-down footage; its picture is what the lenses show once they go dark
  const aspect = G.right.size.x / G.right.size.y;
  const RW = ctx.isTouch ? 640 : 1024;
  const rt = new THREE.WebGLRenderTarget(RW, Math.round(RW / aspect), { type: THREE.HalfFloatType, samples: 4 });
  // high and narrow, so the arm's raised links are not blown up by perspective; the arm's left (image
  // left) stays empty table, where the status panel sits
  const topCam = new THREE.PerspectiveCamera(24, aspect, 0.05, 5);
  topCam.position.set(0.05, 1.5, 0.12);
  topCam.up.set(0, 0, 1);
  topCam.lookAt(0.05, 0, 0.12);
  topCam.updateMatrixWorld(true);
  G.setDisplayMap(rt.texture);
  const clr = new THREE.Color();
  let feedKey = '';
  function renderFeed(key) {
    if (key === feedKey) return;
    feedKey = key;
    const r = stage.renderer, prev = r.getRenderTarget(), pc = r.getClearColor(clr).clone(), pa = r.getClearAlpha();
    const gv = G.group.visible, li = pLight.intensity;
    G.group.visible = false; pLight.intensity = 0;
    r.setRenderTarget(rt);
    r.setClearColor(FLOOR, 1);
    r.clear();
    r.shadowMap.needsUpdate = true;
    r.render(stage.scene, topCam);
    r.setRenderTarget(prev);
    r.setClearColor(pc, pa);
    G.group.visible = gv; pLight.intensity = li;
  }

  // ---------------------------------------------------------------- overlays
  const modes = h('ol', 'lq-tv-modes');
  const modeEls = MODES.map((n, i) => { const li = h('li', i === 2 ? 'esc' : i === 3 ? 'human' : '', n); modes.appendChild(li); return li; });
  const chat = h('div', 'lq-tv-chat');
  const bU = h('div', 'b u', 'Pick up the can and move it to the right.');
  const bPlan = h('div', 'b r');
  bPlan.innerHTML = '<small>Plan (illustrative)</small>';
  const ol = h('ol');
  const planLis = PLAN.map((p) => { const li = h('li', null, p); ol.appendChild(li); return li; });
  bPlan.appendChild(ol);
  const bFail = h('div', 'b r bad');
  bFail.innerHTML = '<small>Reply (illustrative)</small>Robot sequence stopped at step 3 of 6; 2 actions were completed:\n1. [OK] …\n2. [OK] …\n3. [FAILED] grasp missed';
  const bDone = h('div', 'b r good');
  bDone.innerHTML = '<small>Reply (illustrative)</small>Done. Steps 3 to 5 by hand, step 6 by the robot.';
  chat.append(bU, bPlan, bFail, bDone);

  const lens = h('div', 'lq-tv-lens');
  const alert = h('div', 'lq-tv-alert');
  alert.innerHTML = '<i>!</i><div><small>LinqBot · Escalating</small><b>Help: the grasp failed</b><span>Step 3 of 6 stopped. Take over?</span></div>';
  const back2 = h('div', 'lq-tv-alert ok');
  back2.innerHTML = '<i>✓</i><div><small>LinqBot · Resuming</small><b>Control returned</b><span>The robot carries on from step 6.</span></div>';
  const hud = h('ul', 'lq-tv-hud');
  const hudLines = [h('li'), h('li'), h('li'), h('li')];
  hud.append(...hudLines);
  const feed = h('div', 'lq-tv-feed', 'Robot camera, from above');
  lens.append(hud, feed, alert, back2);

  const labA = h('p', 'lq-tv-label arm', 'The plan, animated, not a recording. Our repo lists this handoff loop as the next thing to build.');
  const labG = h('p', 'lq-tv-label', 'The glasses: a model of the Xreal One Pro with the Eye camera, drawn for this page (not CAD).');
  el.append(modes, lens, labA, labG, chat);
  const ov = labelLayer(stage);
  const eyeLab = ov.label('Eye camera', G.eye, { color: '#ff6b35', side: 'l' });
  const dispLab = ov.label('A display in each lens', G.left.center.clone().add(new THREE.Vector3(0, -0.009, 0)).applyMatrix4(G.group.matrixWorld).toArray(), { color: '#7fb4ff' });

  let wide = false, last = '', fxFree = 0;
  const views = new Map();
  function layout() {
    // the step cards cover the left of a desktop stage (--rx-cover); the chat goes right of them
    // and the arm takes what is left, or the chat is dropped when that is too narrow
    const Wd = el.clientWidth, cover = Math.round(ctx.shift()[0] * 2 * Wd);
    wide = Wd >= 760 && Wd - cover - 324 >= 440;
    el.classList.toggle('lq-wide', wide);
    const left = cover + (wide ? 300 + 24 : 0); // --chat-w + margins
    fxFree = left > 0 ? Math.min(0.4, left / (2 * Wd)) : 0;
    views.clear();
    // on a narrow stage the lens label points left, over the glasses, so it stays on screen
    const narrow = Wd < 640;
    dispLab.pill.style.left = narrow ? '' : '10px'; dispLab.pill.style.right = narrow ? '10px' : '';
  }
  const ro = new ResizeObserver(() => { layout(); last = ''; });
  ro.observe(el);
  layout();

  // ---------------------------------------------------------------- views, each framed once at rest
  const armBox = fitBox(stage, [-0.25, 0, -0.06], [0.08, 0.36, 0.36]);
  const V = (pos, target) => ({ pos: pos.clone(), target: target.clone() });
  const shifts = () => {
    const phone = el.clientWidth < 640;
    const arm = [fxFree, fxFree > 0 ? 0 : phone ? -0.02 : 0.04];
    return { arm, armEnd: phone ? [0, 0.05] : arm, g: [ctx.shift()[0], 0], phone };
  };
  function framed(key, sh, fn) {
    const k = `${key}|${el.clientWidth}x${el.clientHeight}|${sh[0].toFixed(4)},${sh[1].toFixed(4)}`;
    if (!views.has(k)) { stage.setShift(sh[0], sh[1]); const v = fn(); views.set(k, V(v.pos, v.target)); }
    return views.get(k);
  }
  // like stage.frame, but fitting the given points (the glasses' own box, turned with them) rather than their world box
  function fitPoints(pts, center, dir, pad, sh) {
    const cam = stage.camera, D = Math.PI / 180;
    const fx = 1 - 2 * Math.min(0.4, Math.abs(sh[0])), fy = 1 - 2 * Math.min(0.4, Math.abs(sh[1]));
    const tv = (Math.tan((cam.fov * D) / 2) * fy) / pad, th = (Math.tan((cam.fov * D) / 2) * cam.aspect * fx) / pad;
    const f = dir.clone().negate(), right = new THREE.Vector3().crossVectors(f, up).normalize(), u = new THREE.Vector3().crossVectors(right, f);
    let dist = 0;
    for (const p of pts) {
      const d = p.clone().sub(center), z = d.dot(dir);
      dist = Math.max(dist, z + Math.abs(d.dot(right)) / th, z + Math.abs(d.dot(u)) / tv);
    }
    return { pos: center.clone().addScaledVector(dir, dist), target: center.clone() };
  }
  function allViews() {
    const sh = shifts();
    const arm0 = framed('arm', sh.arm, () => stage.frame(armBox, { azimuth: 228, elevation: 26, pad: 1.04, apply: false }));
    const armEnd = framed('armEnd', sh.armEnd, () => stage.frame(armBox, { azimuth: -75, elevation: 26, pad: sh.phone ? 1.14 : 1.04, apply: false }));
    // the glasses from the front, turned toward the wearer's right, then from behind, then through the right lens
    const g1 = framed('g1', sh.g, () => fitPoints(obbPts, obbC, locDir(-0.42, 0.2, 0.88), 1.08, sh.g));
    const gb = framed('gb', sh.g, () => fitPoints(obbPts, obbC, locDir(-0.32, 0.34, -0.88), 1.25, sh.g));
    const ln = framed('lens', sh.g, () => {
      const v = stage.frame(G.right.tint, { dir: back, pad: 1.12, apply: false, refresh: true });
      return { pos: v.pos, target: v.target.clone().addScaledVector(fwd, 0.8) };
    });
    return { sh, arm0, armEnd, g1, gb, ln };
  }

  // camera paths
  const bez = (a, b, c, d, t) => {
    const u = 1 - t;
    return a.clone().multiplyScalar(u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  };
  const sph = new THREE.Spherical(), tmp = new THREE.Vector3();
  const toLocalSph = (p) => sph.clone().setFromVector3(tmp.copy(p).sub(obbC).applyQuaternion(invQ));
  function orbitPos(a, b, k) { // round the glasses on the wearer's right side, in the glasses' own frame
    const s0 = toLocalSph(a), s1 = toLocalSph(b);
    let dT = s1.theta - s0.theta;
    if (dT > 0) dT -= 2 * Math.PI; // from the front (theta ~ -35 deg) through -90 deg (the right side) to the back
    const s = new THREE.Spherical(lerp(s0.radius, s1.radius, k), lerp(s0.phi, s1.phi, k), s0.theta + dT * k);
    return new THREE.Vector3().setFromSpherical(s).applyQuaternion(q).add(obbC);
  }
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  // (step, stepP) -> camera view, picture shift, and whether the glasses are in the scene
  function cameraAt(s, sp, v) {
    if (s <= 1) {
      // on the arm; a slow drift that ends exactly on the framed view at the end of step 2
      const t = s === 0 ? 2 * clamp(sp / 0.85, 0, 1) : 2 + 5 * clamp(sp / 0.85, 0, 1);
      const d = ((t - 7) / 7) * 0.08;
      const off = v.arm0.pos.clone().sub(v.arm0.target).applyAxisAngle(up, d);
      return { pos: off.add(v.arm0.target), target: v.arm0.target, sh: v.sh.arm, glasses: false };
    }
    if (s === 2) { // rise off the arm and fly to the glasses
      const k = smoother(0, 0.8, sp);
      const p1 = v.arm0.pos.clone().add(new THREE.Vector3(0, 0.3, 0)).lerp(v.g1.pos, 0.25);
      const p2 = v.g1.pos.clone().add(v.g1.pos.clone().sub(v.g1.target).multiplyScalar(1.4)).add(new THREE.Vector3(0, 0.12, 0));
      return { pos: bez(v.arm0.pos, p1, p2, v.g1.pos, k), target: v.arm0.target.clone().lerp(v.g1.target, smoother(0.1, 0.85, k)), sh: mix2(v.sh.arm, v.sh.g, k), glasses: true };
    }
    if (s === 3) { // round the right side to behind the glasses, then in to the right lens
      const u = smoother(0, 0.85, sp);
      const ko = smoother(0, 0.62, u), kp = smoother(0.42, 1, u);
      const pos = orbitPos(v.g1.pos, v.gb.pos, ko).lerp(v.ln.pos, kp);
      const target = v.g1.target.clone().lerp(v.ln.target, kp);
      return { pos, target, sh: v.sh.g, glasses: true };
    }
    if (s <= 7) return { pos: v.ln.pos, target: v.ln.target, sh: v.sh.g, glasses: true };
    // step 9: straight out through the lens, then round to the arm (a line, then a curve with the same speed where they meet)
    const k = smoother(0, 0.62, sp), sA = 0.2857; // 0.18 / sA = 3 x 0.15 / (1 - sA)
    const q0 = v.ln.pos, dir = v.ln.target.clone().sub(v.ln.pos).normalize(), q1 = q0.clone().addScaledVector(dir, 0.18);
    const pos = k < sA ? q0.clone().lerp(q1, k / sA)
      : bez(q1, q1.clone().addScaledVector(dir, 0.15), v.armEnd.pos.clone().add(v.armEnd.pos.clone().sub(v.armEnd.target).multiplyScalar(0.3)), v.armEnd.pos, (k - sA) / (1 - sA));
    return { pos, target: v.ln.target.clone().lerp(v.armEnd.target, smoother(0.12, 0.85, k)), sh: mix2(v.sh.g, v.sh.armEnd, smoother(0.2, 1, k)), glasses: k < 0.4 };
  }

  // ---------------------------------------------------------------- draw a state
  const shown = new Map();
  const put = (key, v, fn) => { if (shown.get(key) !== v) { shown.set(key, v); fn(v); } };
  const op = (node, key, a) => put(key, a.toFixed(3), (v) => { node.style.opacity = v; });
  const fade = (x, a, b, c, d) => clamp(Math.min((x - a) / (b - a), (d - x) / (d - c)), 0, 1);
  let poseKey = '';
  function poseAt(t) {
    const k = t.toFixed(4);
    if (k === poseKey) return false;
    poseKey = k;
    arm.pose(armAt(t));
    const c = canAt(t);
    can.place(c.bottom.toArray(), c.axis.toArray());
    return true;
  }
  function placeLens() {
    const cam = stage.camera, Wd = el.clientWidth, Hd = el.clientHeight;
    cam.updateMatrixWorld();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of lensPts) {
      tmp.copy(p).project(cam);
      const x = ((tmp.x + 1) / 2) * Wd, y = ((1 - tmp.y) / 2) * Hd;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    // the lens opening is inset by the frame's bevel; keep the overlay inside it
    const ix = (x1 - x0) * 0.025, iy = (y1 - y0) * 0.03;
    put('lens', `${Math.round(x0 + ix)},${Math.round(y0 + iy)},${Math.round(x1 - x0 - 2 * ix)},${Math.round(y1 - y0 - 2 * iy)}`, (v) => {
      const [l, t, w, hh] = v.split(',');
      Object.assign(lens.style, { left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${hh}px` });
    });
  }
  function hudFor(t, fist) {
    const L = !fist
      ? [['Robot: Connected', 'ok'], ['Clutch: INACTIVE', 'dim'], ['Hand: DETECTED', 'ok'], [`Gesture: ${t >= 15 ? 'None' : 'Open_Palm'}`, '']]
      : [['Robot: Connected', 'ok'], ['Clutch: ACTIVE', 'warn'], ['Hand: DETECTED', 'ok'], ['Gesture: Closed_Fist', '']];
    // on a phone only the clutch line shows (the lens is small there)
    L.forEach(([text, c2], i) => { const cls = `${c2}${i !== 1 ? ' x' : ''}`; put(`h${i}`, `${text}|${cls}`, () => { hudLines[i].textContent = text; hudLines[i].className = cls; }); });
  }

  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, STEPS.length - 1);
    const sp = reduced ? 1 : clamp(stepP, 0, 1);
    const key = `${s}|${sp.toFixed(4)}|${el.clientWidth}x${el.clientHeight}`;
    if (key === last) return;
    last = key;
    const { mode, t: [t0, t1, a, b] } = STEPS[s];
    const t = t0 + (t1 - t0) * clamp((sp - a) / (b - a), 0, 1);

    // the arm and the can
    const moved = poseAt(t);

    // the camera
    const v = allViews();
    const c = cameraAt(s, sp, v);
    stage.setShift(c.sh[0], c.sh[1]);
    stage.setView({ pos: c.pos, target: c.target });
    put('gv', c.glasses, (on) => { G.group.visible = on; stage.invalidate(); });

    // the lenses: clear, then the alert, then dark with the robot's camera, then clear again
    let tint = 0.24, disp = 0;
    if (s === 5) { tint = lerp(0.24, 0.9, smoother(0, 0.4, sp)); disp = smoother(0.15, 0.6, sp); }
    else if (s === 6) { tint = 0.9; disp = 1; }
    else if (s === 7) { const k = smoother(0.55, 0.9, sp); tint = lerp(0.9, 0.24, k); disp = 1 - k; }
    G.setLens({ tint, display: disp });
    // the glass's highlight: clear from outside, faint once the camera looks out through it
    const inside = s === 3 ? smoother(0.45, 0.95, sp) : s >= 4 && s <= 7 ? 1 : s === 8 ? 1 - smoother(0, 0.2, sp) : 0;
    G.setShine(0.3 - 0.24 * inside);
    if (disp > 0) renderFeed(t.toFixed(4));
    if (moved || disp > 0) stage.invalidate();

    // overlays in the lens
    placeLens();
    const aAlert = s === 4 ? smoother(0.05, 0.3, sp) : s === 5 ? 1 - smoother(0, 0.22, sp) : 0;
    const aHud = s === 5 ? smoother(0.45, 0.65, sp) : s === 6 ? 1 : s === 7 ? 1 - smoother(0.55, 0.75, sp) : 0;
    const aBack = s === 7 ? fade(sp, 0.12, 0.28, 0.6, 0.76) : 0;
    op(alert, 'aA', aAlert); op(back2, 'aB', aBack); op(hud, 'aH', aHud); op(feed, 'aF', aHud);
    put('aAt', (1 - aAlert) * 10, (y) => { alert.style.transform = `translate(-50%, calc(-50% + ${y.toFixed(1)}px))`; });
    put('aBt', 'c', () => { back2.style.transform = 'translate(-50%, -50%)'; });
    if (aHud > 0) hudFor(t, s === 7 && sp >= 0.04);

    // labels on the glasses (front view, end of step 3) and the captions under the stage
    const aLab = s === 2 ? smoother(0.72, 0.9, sp) : s === 3 ? 1 - smoother(0, 0.14, sp) : 0;
    eyeLab.a = aLab; dispLab.a = aLab;
    ov.update();
    const gOn = s === 2 ? smoother(0.42, 0.62, sp) : s >= 3 && s <= 7 ? 1 : s === 8 ? 1 - smoother(0.2, 0.4, sp) : 0;
    const aOn = s <= 1 ? 1 : s === 2 ? 1 - smoother(0.15, 0.35, sp) : s === 8 ? smoother(0.45, 0.65, sp) : 0;
    op(labG, 'lG', gOn); op(labA, 'lA', aOn);
    const pl = s === 2 ? smoother(0.35, 0.85, sp) : s === 3 ? 1 - smoother(0.15, 0.6, sp) : 0;
    put('pl', pl.toFixed(3), (x) => { pLight.intensity = 2.4 * +x; stage.invalidate(); });

    // the chat (wide stages), on the arm steps only
    const aChat = s <= 1 ? 1 : s === 2 ? 1 - smoother(0, 0.3, sp) : s === 8 ? smoother(0.55, 0.85, sp) : 0;
    op(chat, 'ch', aChat);
    modeEls.forEach((li, i) => put(`m${i}`, i === mode, (on) => li.classList.toggle('on', on)));
    put('bU', t < 0.3, (x) => { bU.hidden = x; });
    put('bP', t < 1, (x) => { bPlan.hidden = x; });
    put('bF', t < 6.95, (x) => { bFail.hidden = x; });
    put('bD', t < 23, (x) => { bDone.hidden = x; });
    const now = t >= 2 && t < 4 ? 0 : t >= 4 && t < 6 ? 1 : t >= 6 && t < 7 ? 2 : t >= 20 && t < 22.6 ? 5 : -1;
    planLis.forEach((li, i) => {
      const c2 = [i === now ? 'now' : '', t >= 9.5 && i >= 2 && i <= 4 ? 'hand' : '', t >= 6.95 && t < 9.5 && i === 2 ? 'fail' : ''].filter(Boolean).join(' ');
      put(`p${i}`, c2, (x) => { li.className = x; });
    });
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ro.disconnect(); ov.dispose(); rt.dispose(); G.dispose(); stage.dispose(); },
  };
}

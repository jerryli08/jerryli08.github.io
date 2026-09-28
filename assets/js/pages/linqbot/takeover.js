// "When autonomy fails, a human takes over", scroll-driven: the loop LinqBot was meant to close,
// animated on Jerry's CAD. It is the plan, not a recording: at the hackathon each control mode ran on
// its own, and our repo lists failure escalation to AR hand-tracking recovery and a control-mode
// arbiter as to-do. The mode names come from our repo's product plan
// (docs/future-product-plan/04-control-modes.md: Autonomous, Escalating, Human Control, Resuming).
// The plan text and replies are illustrative. One scroll step per mode; the picture is a pure
// function of the position on a 24-second timeline, so scrolling back plays it backwards.
import { createStage } from '/assets/js/lib/stage.js';
import { THREE, loadArm, props, fitBox, cachedView, placeView, style, h, ROLL, SEEDS, CAN, fk, toArm, ik, ikBest, gripAngleFor, lerp, smooth, clamp } from './rig.js';
import { BONES, shape } from './handsim.js';

const MODES = [['Planning', 0, 2], ['Autonomous', 2, 7], ['Escalating', 7, 9.5], ['Human control', 9.5, 18], ['Resuming', 18, 20], ['Autonomous', 20, 24]];
const PLAN = ['move_cartesian forward 0.20 m', 'move_cartesian down 0.10 m', 'set_gripper closed', 'move_cartesian up 0.15 m', 'move_cartesian right 0.20 m', 'set_gripper open'];

const CSS = `
.lq-tv { --chat-w: 300px; }
.lq-tv-modes { position: absolute; z-index: 5; top: 12px; left: 12px; right: 12px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin: 0; padding: 0; list-style: none; pointer-events: none; }
.lq-tv-modes { left: calc(var(--rx-cover, 0px) + 12px); }
.lq-wide .lq-tv-modes { left: calc(var(--rx-cover, 0px) + var(--chat-w) + 24px); }
.lq-tv-modes li { padding: 3px 10px; border-radius: 999px; font-size: var(--rx-ov-small); font-weight: 650; color: rgba(243, 238, 232, .55); background: rgba(12, 10, 9, .66); border: 1px solid rgba(255, 255, 255, .1); }
.lq-tv-modes li.on { color: #1a0b04; background: var(--accent); border-color: var(--accent); }
.lq-tv-modes li.human.on { background: #3ee06b; border-color: #3ee06b; color: #06220f; }
.lq-tv-modes li.esc.on { background: #ff4b3e; border-color: #ff4b3e; color: #fff; }
.lq-tv-chat { display: none; flex-direction: column; gap: 6px; padding: 10px; border-radius: 16px; background: rgba(14, 12, 11, .9); border: 1px solid rgba(255, 255, 255, .12); font-size: 14px; line-height: 1.4; pointer-events: none; }
.lq-wide .lq-tv-chat { display: flex; position: absolute; z-index: 5; left: calc(var(--rx-cover, 0px) + 12px); top: 12px; width: var(--chat-w); max-height: calc(100% - 60px); overflow: hidden; }
.lq-tv-chat .b { max-width: 94%; padding: 6px 10px; border-radius: 14px; white-space: pre-wrap; }
.lq-tv-chat .u { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 4px; }
.lq-tv-chat .r { align-self: flex-start; background: #3a3a3c; color: #f2f2f7; border-bottom-left-radius: 4px; }
.lq-tv-chat .r.bad { background: #4a1f1c; color: #ffd6d2; }
.lq-tv-chat .r.good { background: #173a22; color: #d3f5dc; }
.lq-tv-chat small { display: block; font-size: 12px; color: rgba(255, 255, 255, .55); margin-bottom: 2px; }
.lq-tv-chat ol { margin: 0; padding-left: 18px; }
.lq-tv-chat li { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: rgba(242, 242, 247, .7); }
.lq-tv-chat li.now { color: #fff; font-weight: 700; }
.lq-tv-chat li.hand { color: #7ee2a0; }
.lq-tv-chat li.fail { color: #ff8a80; }
.lq-tv-glass { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 4; pointer-events: none; }
.lq-tv-hud { position: absolute; z-index: 5; margin: 0; padding: 6px 10px; border-radius: 8px; background: rgba(0, 0, 0, .6); list-style: none; font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #e8e8e8; pointer-events: none; }
.lq-tv-hud .bad { color: #ff5a4f; font-weight: 700; } .lq-tv-hud .ok { color: #3ee06b; } .lq-tv-hud .warn { color: #ffe14d; } .lq-tv-hud .dim { color: #9a9a9a; }
.lq-tv-handc { position: absolute; z-index: 5; width: 200px; height: 150px; pointer-events: none; border-radius: 8px; background: rgba(0, 0, 0, .45); }
.lq-tv-toast { position: absolute; z-index: 6; left: 50%; top: 46px; transform: translateX(-50%); display: flex; gap: 10px; align-items: center; padding: 8px 14px; border-radius: 14px;
  background: rgba(38, 38, 40, .94); border: 1px solid rgba(255, 255, 255, .14); color: #f2f2f7; font-size: 14px; box-shadow: 0 16px 30px -16px #000; white-space: nowrap; pointer-events: none; }
.lq-tv-toast b { color: #fff; }
.lq-tv-toast i { width: 22px; height: 22px; border-radius: 6px; background: #34c759; flex: none; }
.lq-tv-label { position: absolute; z-index: 5; left: 12px; bottom: 12px; max-width: calc(100% - 24px); margin: 0; padding: 5px 11px; border-radius: 10px; font-size: var(--rx-ov-small); line-height: 1.4; color: var(--text-2); background: rgba(12, 10, 9, .75); border: 1px solid rgba(255, 255, 255, .12); pointer-events: none; }
.lq-tv-label { left: calc(var(--rx-cover, 0px) + 12px); max-width: calc(100% - var(--rx-cover, 0px) - 24px); }
.lq-wide .lq-tv-label { left: calc(var(--rx-cover, 0px) + var(--chat-w) + 24px); max-width: calc(100% - var(--rx-cover, 0px) - var(--chat-w) - 36px); }
@media (max-width: 640px) {
  .lq-tv-modes li { display: none; } .lq-tv-modes li.on { display: block; }
  .lq-tv-hud { font-size: 12px; } .lq-tv-handc { width: 120px; height: 90px; } .lq-tv-toast { font-size: 12.5px; top: 40px; }
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

  // ---------------------------------------------------------------- overlays
  const modes = h('ol', 'lq-tv-modes');
  const modeEls = MODES.map(([n], i) => { const li = h('li', i === 2 ? 'esc' : i === 3 ? 'human' : '', n); modes.appendChild(li); return li; });
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

  const NS = 'http://www.w3.org/2000/svg';
  const glass = document.createElementNS(NS, 'svg');
  glass.setAttribute('class', 'lq-tv-glass');
  glass.setAttribute('aria-hidden', 'true');
  const mid = `lq-tv-m-${ctx.id}`;
  glass.innerHTML = `<defs><mask id="${mid}"><rect width="100%" height="100%" fill="#fff"/><rect class="l1" rx="40" fill="#000"/><rect class="l2" rx="40" fill="#000"/></mask></defs><rect width="100%" height="100%" fill="rgba(4,4,6,0.62)" mask="url(#${mid})"/><rect class="l1 o" rx="40" fill="none" stroke="rgba(240,240,245,0.85)" stroke-width="3"/><rect class="l2 o" rx="40" fill="none" stroke="rgba(240,240,245,0.85)" stroke-width="3"/><path class="br" fill="none" stroke="rgba(240,240,245,0.85)" stroke-width="3"/>`;
  const hud = h('ul', 'lq-tv-hud');
  const hudLines = [h('li'), h('li'), h('li')];
  hud.append(...hudLines);
  const handC = h('canvas', 'lq-tv-handc'); handC.width = 264; handC.height = 198;
  const hg = handC.getContext('2d');
  const toast = h('div', 'lq-tv-toast');
  const label = h('p', 'lq-tv-label', 'The plan, animated, not a recording. Our repo lists this handoff loop as the next thing to build.');
  el.append(modes, glass, hud, handC, toast, label, chat);

  let wide = false, last = '', fxFree = 0;
  function layout() {
    // the step cards cover the left of a desktop stage (--rx-cover); the chat goes right of them
    // and the glasses and the arm take what is left, or the chat is dropped when that is too narrow
    const W = el.clientWidth, H = el.clientHeight, cover = Math.round(ctx.shift()[0] * 2 * W);
    wide = W >= 760 && W - cover - 324 >= 440;
    el.classList.toggle('lq-wide', wide);
    const left = cover + (wide ? 300 + 24 : 0); // --chat-w + margins
    fxFree = left > 0 ? Math.min(0.4, left / (2 * W)) : 0;
    const w = Math.min((W - left) * 0.44, 460), hh = Math.min(H * 0.5, w * 0.72), gap = Math.min(40, w * 0.12);
    const cx = left + (W - left) / 2, y = H > W ? H * 0.3 : H * 0.2;
    const x1 = cx - gap / 2 - w, x2 = cx + gap / 2;
    for (const r of glass.querySelectorAll('.l1')) Object.entries({ x: x1, y, width: w, height: hh }).forEach(([k, v]) => r.setAttribute(k, v));
    for (const r of glass.querySelectorAll('.l2')) Object.entries({ x: x2, y, width: w, height: hh }).forEach(([k, v]) => r.setAttribute(k, v));
    glass.querySelector('.br').setAttribute('d', `M ${x1 + w} ${y + 26} Q ${cx} ${y + 6} ${x2} ${y + 26}`);
    Object.assign(hud.style, { left: `${x1 + 18}px`, top: `${y + 16}px` });
    Object.assign(handC.style, { left: `${x2 + w - handC.clientWidth - 14}px`, top: `${y + hh - handC.clientHeight - 12}px` });
  }
  const ro = new ResizeObserver(() => { layout(); last = ''; });
  ro.observe(el);
  layout();

  // one view, framed once around everything the arm does here
  const view = cachedView(stage, el, fitBox(stage, [-0.25, 0, -0.06], [0.08, 0.36, 0.36]), { azimuth: 228, elevation: 26, pad: 1.04 });

  // ---------------------------------------------------------------- draw a state
  const fade = (t, a, b, c, d) => clamp(Math.min((t - a) / (b - a), (d - t) / (d - c)), 0, 1);
  const shown = new Map();
  const put = (node, key, v, fn) => { if (shown.get(key) !== v) { shown.set(key, v); fn(v); } };
  function drawHand(t) {
    const W = handC.width, H = handC.height;
    hg.clearRect(0, 0, W, H);
    if (t < 9.5 || t >= 20) return;
    const f = t >= 18 ? 2 : t >= 15 ? 1 : 0;
    const p = fk(armAt(t)), p0 = fk(armAt(9.5));
    const x = 0.42 + (p0[0] - p[0]) * 1.4, y = 0.62 - (p[1] - p0[1]) * 1.6; // the hand moves with the gripper (drawn, not tracked)
    const s = 0.2;
    const pts = shape(f).map(([a, b]) => [(x + a * s * 0.75) * W, (y + b * s) * H]);
    hg.lineWidth = 3; hg.strokeStyle = t >= 18 ? '#ff4b3e' : '#3ee06b';
    hg.beginPath();
    for (const [a, b] of BONES) { hg.moveTo(...pts[a]); hg.lineTo(...pts[b]); }
    hg.stroke();
    hg.fillStyle = '#ff8000';
    for (const q of pts) { hg.beginPath(); hg.arc(q[0], q[1], 4, 0, Math.PI * 2); hg.fill(); }
  }
  function render(t, s) {
    arm.pose(armAt(t));
    const c = canAt(t);
    can.place(c.bottom.toArray(), c.axis.toArray());
    stage.invalidate();
    modeEls.forEach((li, i) => put(li, `m${i}`, i === s, (on) => li.classList.toggle('on', on)));
    put(bU, 'bU', t < 0.3, (v) => { bU.hidden = v; });
    put(bPlan, 'bP', t < 1, (v) => { bPlan.hidden = v; });
    put(bFail, 'bF', t < 7.1, (v) => { bFail.hidden = v; });
    put(bDone, 'bD', t < 23, (v) => { bDone.hidden = v; });
    const now = t >= 2 && t < 4 ? 0 : t >= 4 && t < 6 ? 1 : t >= 6 && t < 7 ? 2 : t >= 20 && t < 22.6 ? 5 : -1;
    planLis.forEach((li, i) => {
      const c2 = [i === now ? 'now' : '', t >= 9.5 && i >= 2 && i <= 4 ? 'hand' : '', t >= 7 && t < 9.5 && i === 2 ? 'fail' : ''].filter(Boolean).join(' ');
      put(li, `p${i}`, c2, (v) => { li.className = v; });
    });
    const gO = fade(t, 7.8, 8.6, 18.6, 19.6).toFixed(3);
    put(glass, 'g', gO, (v) => { glass.style.opacity = hud.style.opacity = handC.style.opacity = v; });
    const L = t < 9.5 ? [['HELP: grasp failed', 'bad'], ['Take over?', 'bad'], ['', '']]
      : t < 18 ? [['Clutch: INACTIVE', 'dim'], ['Hand: DETECTED', 'ok'], [`Gesture: ${t >= 15 ? 'None' : 'Open_Palm'}`, '']]
        : [['Clutch: ACTIVE', 'warn'], ['Hand: DETECTED', 'ok'], ['Gesture: Closed_Fist', '']];
    L.forEach(([text, c2], i) => put(hudLines[i], `h${i}`, `${text}|${c2}`, () => { hudLines[i].textContent = text; hudLines[i].className = c2; }));
    drawHand(t);
    const n1 = fade(t, 8, 8.3, 9.3, 9.6), n2 = fade(t, 18.8, 19.1, 20.1, 20.4);
    put(toast, 'to', Math.max(n1, n2).toFixed(3), (v) => { toast.style.opacity = v; });
    put(toast, 'tt', n2 > 0, (b) => { toast.innerHTML = b ? '<i></i><span><b>LinqBot</b> Control returned. Resuming step 6.</span>' : '<i></i><span><b>LinqBot</b> needs you: step 3 failed.</span>'; });
  }

  // one step per mode: each plays over the first 85 % of its step, then holds
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, MODES.length - 1);
    const [, a, b] = MODES[s];
    const t = reduced ? b - 0.01 : a + (b - a) * clamp(stepP / 0.85, 0, 1);
    const key = `${t.toFixed(3)}|${el.clientWidth}x${el.clientHeight}`;
    if (key === last) return;
    last = key;
    const phone = el.clientWidth < 640;
    stage.setShift(fxFree, fxFree > 0 ? 0 : phone ? -0.02 : 0.04); // centred between the chat (or the cards) and the right edge
    const v = view();
    placeView(stage, v, v, 0, reduced ? 0 : (t / 24 - 0.5) * 0.25);
    render(t, s);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); stage.dispose(); } };
}

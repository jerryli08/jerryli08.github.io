// "Text the arm", scroll-driven: four texts to the arm on Jerry's CAD, one per scroll step. The first
// two are word for word from the day, and the first reply is the one it got. The rest of the replies
// are worked out here with our code's rules (github.com/amzoeee/soma-hackathon, agent/src/demo/):
//   handler.py            replies built only from the tool results, word for word
//   tools/robot_tools.py  move_cartesian and set_gripper and their messages
//   hardware/so101.py     a move longer than 0.5 m is scaled down; only the axes a command moves are
//                         clamped into the box (0.05 to 0.33 m forward, 0.20 m to either side, 0.02 to
//                         0.35 m up); IK from the current angles, re-checked with forward kinematics,
//                         fails as "target unreachable" past 2 cm; moves ramp in joint space; a gripper
//                         step counts only within 1% of its end (a jaw stopped by the can reports FAILED)
// The tool calls for each text are written out in place of the language model's plan, and "applied" is worked out from the
// commanded target (on the robot it was measured from the servos). Every picture is a pure function
// of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { THREE, loadArm, props, fitBox, cachedView, placeView, style, h, ROLL, SEEDS, CAN, fk, carry, uncarry, toArm, toRepo, ik, ikBest, gripAngleFor, clamp, lerp, smooth } from './rig.js';

const BOX = { x: [0.05, 0.33], y: [-0.2, 0.2], z: [0.02, 0.35] };
const START = [0.1, -0.15, 0.04]; // low by the table, arm swung to its right (URDF frame, metres)
const CAN_AT = [0.3, -0.15]; // 0.2 m ahead of the start
// the texts, and the tool calls the planner makes of them (public frame: +x right, +y forward, +z up)
const MSGS = [
  { text: 'Move forward 0.4 meters and close claw', day: true, calls: [['move', [0, 0.4, 0]], ['grip', 'closed']] },
  { text: 'Move forward 0.2 meters and close claw', calls: [['move', [0, 0.2, 0]], ['grip', 'closed']] },
  { text: 'Move up 0.2 meters', calls: [['move', [0, 0, 0.2]]] },
  { text: 'Move left 0.2 meters and open claw', calls: [['move', [-0.2, 0, 0]], ['grip', 'open']] },
];
// the reply the first text got on the day, word for word
const DAY_REPLY = 'Robot sequence stopped at step 1 of 2; 0 actions were completed:\n1. [FAILED] Cartesian IK failed: target unreachable';

const CSS = `
.lq-sms { position: absolute; z-index: 4; left: calc(var(--rx-cover, 0px) + 14px); top: 14px; bottom: 14px; width: min(360px, 30%); display: flex; flex-direction: column; justify-content: flex-end; gap: 7px;
  padding: 12px; border-radius: 18px; overflow: hidden; background: rgba(14, 12, 11, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); font-size: var(--rx-ov-text); pointer-events: none; }
.lq-sms-head { position: absolute; left: 0; right: 0; top: 0; z-index: 1; display: flex; align-items: center; gap: 9px; padding: 10px 12px; background: rgba(20, 18, 17, 0.97); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.lq-sms-head i { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: #34c759; color: #04220d; font-style: normal; font-weight: 800; font-size: 13px; }
.lq-sms-head b { font-size: var(--rx-ov-text); } .lq-sms-head small { display: block; font-size: var(--rx-ov-small); color: var(--muted); }
.lq-msg { max-width: 92%; padding: 7px 11px; border-radius: 16px; line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; flex: none; }
.lq-out { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 5px; }
.lq-in { align-self: flex-start; background: #3a3a3c; color: #f2f2f7; border-bottom-left-radius: 5px; font-size: 14px; }
.lq-in em { display: block; margin-bottom: 3px; font-style: normal; font-size: 12px; font-weight: 650; letter-spacing: 0.03em; color: rgba(255, 255, 255, 0.55); }
.lq-in .f { color: #ff8a80; font-weight: 650; } .lq-in .k { color: #7ee2a0; font-weight: 650; }
.lq-dots { align-self: flex-start; display: flex; gap: 4px; padding: 11px 12px; border-radius: 16px; background: #3a3a3c; flex: none; }
.lq-dots b { width: 6px; height: 6px; border-radius: 50%; background: #9a9aa0; }
.lq-sms [hidden] { display: none; }
@media (max-width: 640px) {
  .lq-sms { left: 8px; right: 8px; top: 8px; bottom: auto; width: auto; max-height: 46%; padding: 8px; gap: 5px; }
  .lq-sms-head { display: none; }
  .lq-sms .lq-old { display: none; }
  .lq-in { font-size: 12.5px; }
}
`;

// Python's f"{v:+g}", as the replies print numbers
const g = (v) => { if (v === 0) return '+0'; const s = String(Number(v.toPrecision(6))); return (v > 0 ? '+' : '') + s; };
const xyz = ([x, y, z]) => `Δx=${g(x)}m, Δy=${g(y)}m, Δz=${g(z)}m`;
const py = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(Number(v.toFixed(2))));

export async function mount(el, ctx) {
  style('lq-sms-css', CSS);
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const arm = await loadArm(stage);
  const { can } = props(stage);
  stage.fitGround();
  const contact = gripAngleFor(CAN.r * 2 + 0.004);
  const gripPos = (jaw) => (1 - jaw / 95) * 100; // LeRobot units: 100 open, 0 closed

  // ---------------------------------------------------------------- run the texts once
  const canB = toArm([CAN_AT[0], CAN_AT[1], 0]); canB[1] = 0;
  let st = { q: [...ikBest(toArm(START), SEEDS).q.slice(0, 4), ROLL, 0], can: { b: canB, a: [0, 1, 0], held: null } };
  const clone = (s) => ({ q: s.q.slice(), can: { b: s.can.b.slice(), a: s.can.a.slice(), held: s.can.held } });
  const starts = [], plans = [], replies = [];
  let miss04 = null;
  for (const [mi, m] of MSGS.entries()) {
    starts.push(clone(st));
    const segs = [], results = [];
    // spread the calls over 0.12 .. 0.74 of the step
    const slots = m.calls.length === 1 ? [[0.12, 0.62]] : [[0.12, 0.46], [0.5, 0.66]];
    for (const [ci, [tool, arg]] of m.calls.entries()) {
      const [a, b] = slots[ci];
      if (tool === 'move') {
        const req = arg, mag = Math.hypot(...req);
        const cmd = mag > 0.5 ? req.map((v) => (v * 0.5) / mag) : req;
        const du = [cmd[1], -cmd[0], cmd[2]]; // public (+x right, +y forward) to URDF (+x forward, +y left)
        const cur = toRepo(fk(st.q));
        const tgt = cur.map((v, i) => (du[i] ? clamp(v + du[i], ...BOX['xyz'[i]]) : v));
        const r = ik(toArm(tgt), st.q.slice(0, 5), { iters: 200 });
        const reached = toRepo(fk([...r.q.slice(0, 4), st.q[4]]));
        const miss = Math.hypot(reached[0] - tgt[0], reached[1] - tgt[1], reached[2] - tgt[2]);
        if (miss > 0.02) {
          results.push({ ok: false, message: 'Cartesian IK failed: target unreachable' });
          if (mi === 0) miss04 = { asked: cur.map((v, i) => v + du[i]), clamped: tgt, reached, miss, from: cur };
          segs.push({ type: 'show', a, b });
          break;
        }
        const q1 = [...r.q.slice(0, 4), st.q[4], st.q[5]];
        segs.push({ type: 'move', a, b, q0: st.q.slice(), q1 });
        st = { ...clone(st), q: q1 };
        if (st.can.held) Object.assign(st.can, canHeld(q1, st.can.held));
        const au = tgt.map((v, i) => v - cur[i]);
        const ap = [-au[1], au[0], au[2]];
        const limited = ap.some((v, i) => Math.abs(v - req[i]) > 1e-4);
        results.push({ ok: true, message: limited ? `Cartesian IK requested ${xyz(req)}; applied ${xyz(ap)} (safety/workspace limited).` : `Cartesian IK applied ${xyz(ap)}.` });
      } else {
        const state = arg, before = gripPos(st.q[5]);
        const goalDeg = state === 'open' ? 0 : 95, goal = state === 'open' ? 100 : 0;
        let end = goalDeg, grab = null, release = false;
        if (state === 'closed' && !st.can.held && between(st.q, st.can)) {
          end = contact;
          const top = st.can.b.map((v, i) => v + st.can.a[i] * CAN.h);
          grab = { b: uncarry(st.q, st.can.b), t: uncarry(st.q, top) };
        }
        if (state === 'open' && st.can.held) release = true;
        segs.push({ type: 'grip', a, b, j0: st.q[5], j1: goalDeg, stop: end, grab, release });
        const q1 = st.q.slice(); q1[5] = end;
        const next = clone(st); next.q = q1;
        if (grab) next.can.held = grab;
        if (release) {
          next.can.held = null;
          // it drops to the table: upright if it hangs within 20 degrees of upright, on its side if not
          const c = next.can.b.map((v, i) => v + next.can.a[i] * CAN.h / 2);
          const tilt = Math.acos(clamp(next.can.a[1], -1, 1));
          let to;
          if (tilt < (20 * Math.PI) / 180) to = { b: [next.can.b[0], 0, next.can.b[2]], a: [0, 1, 0] };
          else {
            const hz = Math.hypot(next.can.a[0], next.can.a[2]) || 1, ax = [next.can.a[0] / hz, 0, next.can.a[2] / hz];
            to = { b: [c[0] - (ax[0] * CAN.h) / 2, CAN.r, c[2] - (ax[2] * CAN.h) / 2], a: ax };
          }
          segs.push({ type: 'fall', a: b, b: b + 0.07, from: { b: next.can.b.slice(), a: next.can.a.slice() }, to });
          next.can.b = to.b; next.can.a = to.a;
        }
        st = next;
        const measured = gripPos(end);
        const moved = Math.abs(measured - before) >= 0.5;
        const ok = Math.abs(measured - goal) < 1;
        results.push(ok ? { ok: true, message: `Gripper set to ${state}.` } : { ok: false, message: `Gripper command failed: {'ok': False, 'state': '${state}', 'before': ${py(+before.toFixed(2))}, 'goal': ${py(goal)}, 'measured': ${py(+measured.toFixed(2))}, 'moved': ${moved ? 'True' : 'False'}, 'limits': [0.0, 100.0]}` });
        if (!ok) break;
      }
    }
    plans.push(segs);
    const okN = results.filter((r) => r.ok).length, failed = results.findIndex((r) => !r.ok);
    const head = failed < 0 ? `Executed ${okN} robot ${okN === 1 ? 'action' : 'actions'}:` : `Robot sequence stopped at step ${failed + 1} of ${m.calls.length}; ${okN} action${okN === 1 ? ' was' : 's were'} completed:`;
    const text = [head, ...results.map((r, i) => `${i + 1}. [${r.ok ? 'OK' : 'FAILED'}] ${r.message}`)].join('\n');
    replies.push(m.day ? DAY_REPLY : text);
  }
  starts.push(clone(st));
  function canHeld(q, held) {
    const b = carry(q, held.b, 5), t = carry(q, held.t, 5);
    return { b, a: t.map((v, i) => (v - b[i]) / CAN.h) };
  }
  function between(q, c) {
    if (c.a[1] < Math.cos(0.3)) return false;
    const p = fk(q), hy = p[1] - c.b[1];
    return Math.hypot(p[0] - c.b[0], p[2] - c.b[2]) < 0.025 && hy > CAN.h * 0.2 && hy < CAN.h * 1.02;
  }

  // the scene at (step, progress through it)
  function sceneAt(s, f) {
    const cur = clone(starts[s]);
    for (const sg of plans[s]) {
      const u = clamp((f - sg.a) / (sg.b - sg.a), 0, 1);
      if (u <= 0) break;
      if (sg.type === 'move') {
        for (let i = 0; i < 4; i++) cur.q[i] = lerp(sg.q0[i], sg.q1[i], u);
        if (cur.can.held) Object.assign(cur.can, canHeld(cur.q, cur.can.held));
      } else if (sg.type === 'grip') {
        let jaw = lerp(sg.j0, sg.j1, u);
        if (sg.grab) { jaw = Math.min(jaw, sg.stop); if (jaw >= sg.stop - 1e-6) cur.can.held = sg.grab; }
        if (sg.release && jaw < contact - 8) cur.can.held = null;
        cur.q[5] = jaw;
      } else if (sg.type === 'fall') {
        const k = u * u;
        cur.can.b = sg.from.b.map((v, i) => lerp(v, sg.to.b[i], k));
        const a = sg.from.a.map((v, i) => lerp(v, sg.to.a[i], smooth(u))), n = Math.hypot(...a) || 1;
        cur.can.a = a.map((v) => v / n);
        cur.can.held = null;
      }
      if (u < 1) break;
    }
    return cur;
  }

  // ---------------------------------------------------------------- overlays
  // the text box our code clamps targets into, faint, and the geometry of the "0.4 meters" failure
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push([BOX.x[i & 1 ? 1 : 0], BOX.y[i & 2 ? 1 : 0], BOX.z[i & 4 ? 1 : 0]]);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const bp = [];
  for (const [a, b] of E) bp.push(new THREE.Vector3(...toArm(corners[a])), new THREE.Vector3(...toArm(corners[b])));
  const boxMat = new THREE.LineBasicMaterial({ color: '#e9e2d8', transparent: true, opacity: 0.3, depthWrite: false });
  stage.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bp), boxMat));
  const dotMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthTest: false });
  const dots = ['#ff4b3e', '#f3eee8', '#ffd23f'].map((c) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 12), dotMat(c)); d.renderOrder = 8; stage.scene.add(d); return d; });
  const lineMat = new THREE.LineDashedMaterial({ color: '#ff6b35', dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0, depthTest: false });
  let ray = null;
  const ov = labelLayer(stage);
  const L = [ov.label('Asked for: 0.4 m forward', [0, 0, 0], { color: '#ff4b3e', side: 'l', minW: 480 }), ov.label('Clamped to the box: 0.33 m', [0, 0, 0], { color: '#f3eee8', side: 'l' }), ov.label('', [0, 0, 0], { color: '#ffd23f', side: 'l', minW: 420 })];
  if (miss04) {
    const P = [miss04.asked, miss04.clamped, miss04.reached].map((p) => toArm(p));
    P.forEach((p, i) => { dots[i].position.set(...p); L[i].p.set(...p); });
    L[2].el.lastChild.textContent = `Closest it gets: ${(miss04.miss * 100).toFixed(1)} cm off`;
    const from = toArm(miss04.from);
    ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...P[0])]), lineMat);
    ray.computeLineDistances();
    ray.renderOrder = 7;
    stage.scene.add(ray);
  }

  // the conversation
  const box = h('div', 'lq-sms');
  const head = h('div', 'lq-sms-head');
  head.innerHTML = '<i aria-hidden="true">L</i><span><b>LinqBot</b><small>iMessage, through Linq</small></span>';
  box.append(head);
  const bubbles = MSGS.map((m, i) => {
    const out = h('div', 'lq-msg lq-out', m.text);
    const dotsEl = h('div', 'lq-dots');
    dotsEl.innerHTML = '<b></b><b></b><b></b>';
    const inn = h('div', 'lq-msg lq-in');
    inn.append(h('em', null, m.day ? 'Reply on the day' : 'Reply by our code’s rules, simulated'));
    for (const line of replies[i].split('\n')) {
      const d = h('div');
      const mm = line.match(/^(\d+\. )\[(OK|FAILED)\](.*)$/);
      if (mm) { d.append(mm[1], h('span', mm[2] === 'OK' ? 'k' : 'f', `[${mm[2]}]`), mm[3]); } else d.textContent = line;
      inn.append(d);
    }
    for (const n of [out, dotsEl, inn]) { n.hidden = true; box.append(n); }
    return { out, dots: dotsEl, inn };
  });
  el.append(box);
  // the width left for the arm right of the cards and the thread (px)
  const freeW = () => el.clientWidth - box.getBoundingClientRect().right + el.getBoundingClientRect().left;

  const view = cachedView(stage, el, fitBox(stage, [-0.24, 0, -0.06], [0.1, 0.32, 0.48]), { azimuth: 245, elevation: 20, pad: (a) => (a < 1 ? 1.0 : 1.32) });
  const shown = new Map();
  const set = (k, v, fn) => { if (shown.get(k) !== v) { shown.set(k, v); fn(v); } };
  let last = '';
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, MSGS.length - 1), f = reduced ? 1 : clamp(stepP, 0, 1);
    const key = `${s}|${f.toFixed(4)}|${el.clientWidth}x${el.clientHeight}`;
    if (key === last) return;
    last = key;
    const sc = sceneAt(s, reduced ? 1 : Math.min(1, f / 0.9));
    arm.pose(sc.q);
    can.place(sc.can.b, sc.can.a);
    stage.invalidate();
    // the "0.4 meters" geometry: the ask, the clamp, the closest reach
    const k0 = s === 0 ? f : 0;
    const a0 = reduced ? (s === 0 ? 1 : 0) : smooth(clamp((k0 - 0.14) / 0.12, 0, 1)) * (s === 0 ? 1 : 0);
    const a1 = reduced ? a0 : smooth(clamp((k0 - 0.3) / 0.12, 0, 1)) * a0;
    const a2 = reduced ? a0 : smooth(clamp((k0 - 0.46) / 0.12, 0, 1)) * a0;
    [a0, a1, a2].forEach((a, i) => set(`d${i}`, a.toFixed(3), () => { dots[i].material.opacity = a; L[i].a = a; }));
    set('ray', a0.toFixed(3), () => { lineMat.opacity = 0.9 * a0; });
    set('box', (0.3 + 0.5 * a1).toFixed(3), (v) => { boxMat.opacity = +v; });
    // the chat: a text goes out, the dots while the arm works, the reply
    bubbles.forEach((b, i) => {
      const sent = i < s || (i === s && (reduced || f >= 0.02));
      const done = i < s || (i === s && (reduced || f >= 0.8));
      set(`o${i}`, sent, (v) => { b.out.hidden = !v; });
      set(`w${i}`, sent && !done, (v) => { b.dots.hidden = !v; });
      set(`r${i}`, done, (v) => { b.inn.hidden = !v; });
      const old = i < s;
      set(`x${i}`, old, (v) => { b.out.classList.toggle('lq-old', v); b.inn.classList.toggle('lq-old', v); });
    });
    const phone = el.clientWidth < 640;
    // the thread sits right of the step cards (Jerry: popups big enough, never under the cards); the
    // arm is centred in what is left, and stage.frame fits it to that width by itself
    stage.setShift(phone ? 0 : Math.min(0.4, (el.clientWidth - freeW()) / (2 * el.clientWidth)), phone ? -0.2 : 0);
    const v = view();
    placeView(stage, v, v, 0, reduced ? 0 : ((s + f) / 4 - 0.5) * 0.25);
    ov.update();
  }
  const ro = new ResizeObserver(() => { last = ''; });
  ro.observe(el);
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); ov.dispose(); stage.dispose(); } };
}

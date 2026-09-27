// "Text it": the iMessage mode of LinqBot on Jerry's CAD. A phrase parser stands in for the
// language model (on the robot, one Runware Luna call planned the tool calls); everything after
// the plan follows our code in github.com/amzoeee/soma-hackathon, agent/src/demo/:
//   handler.py            replies built only from the tool results, word for word
//   tools/robot_tools.py  move_cartesian, move_wrist, set_gripper, hold_position and their messages
//   hardware/so101.py     a move longer than 0.5 m is scaled down; only the axes a command moves are
//                         clamped into the box (0.05 to 0.33 m forward, 0.20 m to either side,
//                         0.02 to 0.35 m up); IK from the current angles, re-checked with forward
//                         kinematics, fails as "target unreachable" past 2 cm; moves ramp over 2 s,
//                         the wrist and gripper over 1 s; a gripper step counts only within 1% of its end
// Two differences, both said on the page: "applied" is worked out from the commanded target here (on
// the robot it was measured from the servos), and a toggle offers a gripper check that counts a
// jaw stopped by the can as a grasp.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { THREE, loadArm, props, makeGrasp, style, h, SHARED_CSS, JOINTS, ROLL, SEEDS, CAN, fk, toArm, toRepo, ik, ikBest, clamp, lerp, fitBox } from './rig.js';

const BOX = { x: [0.05, 0.33], y: [-0.2, 0.2], z: [0.02, 0.35] };
const START = [0.1, -0.15, 0.04]; // low by the table, arm swung to its right (URDF frame, metres)
const CAN_AT = [0.3, -0.15]; // 0.2 m ahead of the start: where "Move forward 0.2 meters" ends
const CHIPS = ['Move forward 0.4 meters and close claw', 'Move forward 0.2 meters and close claw', 'Close claw and move up 0.2 meters',
  'Move right 0.2 meters and open claw', 'Move up 500 meters', 'Wrist tilt 90 degrees', 'Hold'];
const SUPPORTED = 'No robot action was executed. Supported actions: Cartesian XYZ movement, wrist pitch/roll, open or close gripper, and hold position.';

const CSS = `
.lq-sms { --chat-w: 300px; }
.lq-chat { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 12px; border-radius: 18px; color: var(--text);
  background: rgba(14, 12, 11, 0.92); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14px; }
.lq-wide .lq-chat { position: absolute; z-index: 5; left: 12px; top: 12px; bottom: 12px; width: var(--chat-w); }
.rx-panel .lq-chat { flex: 1 1 100%; }
.lq-chat-head { display: flex; align-items: center; gap: 10px; padding-bottom: 9px; border-bottom: 1px solid var(--line); }
.lq-av { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: #34c759; color: #04220d; font-weight: 800; font-size: 14px; }
.lq-chat-head b { display: block; font-size: 14.5px; line-height: 1.2; }
.lq-chat-head small { display: block; margin-top: 2px; font-size: 11.5px; line-height: 1.3; color: var(--muted); }
.lq-log { flex: 1 1 auto; min-height: 80px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 2px; overscroll-behavior: contain; }
.rx-panel .lq-log { max-height: 240px; }
.lq-msg { max-width: 90%; padding: 7px 11px; border-radius: 16px; line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; }
.lq-out { align-self: flex-end; background: #0a84ff; color: #fff; border-bottom-right-radius: 5px; }
.lq-in { align-self: flex-start; background: #3a3a3c; color: #f2f2f7; border-bottom-left-radius: 5px; font-size: 13px; }
.lq-in .f { color: #ff8a80; font-weight: 650; } .lq-in .k { color: #7ee2a0; font-weight: 650; }
.lq-sys { align-self: center; max-width: 100%; font-size: 11.5px; line-height: 1.4; color: var(--muted); text-align: center; }
.lq-typing { display: inline-flex; gap: 4px; padding: 11px 12px; }
.lq-typing i { width: 6px; height: 6px; border-radius: 50%; background: #9a9aa0; animation: lq-dot 1s infinite ease-in-out; }
.lq-typing i:nth-child(2) { animation-delay: .15s; } .lq-typing i:nth-child(3) { animation-delay: .3s; }
@keyframes lq-dot { 0%, 60%, 100% { opacity: .35; } 30% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .lq-typing i { animation: none; } }
.lq-chips { display: flex; flex-wrap: wrap; gap: 5px; max-height: 118px; overflow-y: auto; }
.lq-chip { padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line-strong); font: inherit; font-size: 12px; font-weight: 600; color: var(--text-2); background: none; cursor: pointer; text-align: left; }
.lq-chip:hover { border-color: var(--accent); color: var(--text); }
.lq-chip[disabled] { opacity: .5; cursor: default; }
.lq-form { display: flex; gap: 6px; }
.lq-form input { flex: 1; min-width: 0; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: rgba(255, 255, 255, 0.05); color: var(--text); font: inherit; font-size: 14px; }
.lq-form button { flex: none; padding: 8px 14px; border-radius: 999px; border: 0; background: #0a84ff; color: #fff; font: inherit; font-weight: 650; font-size: 13.5px; cursor: pointer; }
.lq-form button[disabled] { opacity: .5; }
@media (pointer: coarse) { .lq-form input { font-size: 16px; } }
`;

// ------------------------------------------------------------------ the stand-in planner
const UNITS = { m: 1, meter: 1, meters: 1, metre: 1, metres: 1, cm: 0.01, centimeter: 0.01, centimeters: 0.01, mm: 0.001, millimeter: 0.001, millimeters: 0.001 };
function parse(text) {
  const calls = [];
  const parts = text.toLowerCase().replace(/[!?]/g, '').split(/,\s*|\s+and\s+|\s+then\s+|\.\s+|;\s*/).map((s) => s.trim()).filter(Boolean);
  for (const s of parts) {
    const num = s.match(/(-?\d*\.?\d+)\s*(millimeters?|centimeters?|meters?|metres?|mm|cm|m)?\b/);
    const val = num ? parseFloat(num[1]) * (UNITS[num[2]] ?? 1) : null;
    if (/\b(hold|stop|freeze)\b/.test(s)) { calls.push({ tool: 'hold_position', args: { hold: true } }); continue; }
    if (/\b(open|close|closed)\b/.test(s) && /\b(claw|gripper|jaw|jaws|grip)\b|^(open|close)$/.test(s)) {
      calls.push({ tool: 'set_gripper', args: { state: /\bopen\b/.test(s) ? 'open' : 'closed' } });
      continue;
    }
    if (/\b(tilt|pitch|roll)\b/.test(s)) {
      const deg = num ? parseFloat(num[1]) : 0;
      const neg = /\b(down|left)\b/.test(s) ? -1 : 1;
      calls.push({ tool: 'move_wrist', args: /\broll\b/.test(s) ? { pitch_degrees: 0, roll_degrees: neg * deg } : { pitch_degrees: neg * deg, roll_degrees: 0 } });
      continue;
    }
    const d = { x: 0, y: 0, z: 0 };
    let any = false;
    const amt = val ?? 0.2; // the planner's rule: a direction with no distance means 0.2 m
    for (const [w, ax, sg] of [['up', 'z', 1], ['down', 'z', -1], ['left', 'x', -1], ['right', 'x', 1], ['forward', 'y', 1], ['forwards', 'y', 1], ['ahead', 'y', 1], ['back', 'y', -1], ['backward', 'y', -1], ['backwards', 'y', -1]]) {
      if (new RegExp(`\\b${w}\\b`).test(s)) { d[ax] = sg * amt; any = true; }
    }
    if (any) calls.push({ tool: 'move_cartesian', args: { delta_x_m: d.x, delta_y_m: d.y, delta_z_m: d.z } });
  }
  return calls;
}

// Python's f"{v:+g}"
const g = (v) => { if (v === 0) return '+0'; const s = String(Number(v.toPrecision(6))); return (v > 0 ? '+' : '') + s; };
const xyz = ([x, y, z]) => `Δx=${g(x)}m, Δy=${g(y)}m, Δz=${g(z)}m`;
const py = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(Number(v.toFixed(2))));

export async function mount(el, ctx) {
  style('lq-shared-css', SHARED_CSS);
  style('lq-sms-css', CSS);
  el.classList.add('lq-sms');
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { hint: false });
  const arm = await loadArm(stage);
  const { can } = props(stage);
  stage.fitGround();
  const canHome = toArm([CAN_AT[0], CAN_AT[1], 0]);
  canHome[1] = 0;
  const grasp = makeGrasp(stage, arm, can);
  const startQ = ikBest(toArm(START), SEEDS).q;
  const START_POSE = [...startQ.slice(0, 4), ROLL, 0];

  // ---------------------------------------------------------------- chat
  const chat = h('div', 'lq-chat');
  const head = h('div', 'lq-chat-head');
  head.innerHTML = '<span class="lq-av" aria-hidden="true">L</span><span><b>LinqBot</b><small>A phrase parser stands in for the language model here</small></span>';
  const log = h('div', 'lq-log');
  log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite');
  const chips = h('div', 'lq-chips');
  const form = h('form', 'lq-form');
  const input = h('input');
  Object.assign(input, { type: 'text', placeholder: 'Text the arm', autocomplete: 'off', enterKeyHint: 'send' });
  input.setAttribute('aria-label', 'Message to the arm');
  const send = h('button', null, 'Send');
  send.type = 'submit';
  form.append(input, send);
  chat.append(head, log, chips, form);
  const chipBtns = CHIPS.map((c) => { const b = h('button', 'lq-chip', c); b.type = 'button'; b.addEventListener('click', () => submit(c)); chips.appendChild(b); return b; });
  const place = () => {
    const wide = el.clientWidth >= 720;
    el.classList.toggle('lq-wide', wide);
    if (wide && chat.parentElement !== el) el.appendChild(chat);
    if (!wide && chat.parentElement !== ctx.panel) ctx.panel.prepend(chat);
    stage.setShift(wide ? 0.16 : 0, 0);
  };
  const ro = new ResizeObserver(place);
  ro.observe(el);
  place();
  const msg = (cls, text) => { const m = h('div', `lq-msg ${cls}`); m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
  const reply = (text) => {
    const m = h('div', 'lq-msg lq-in');
    for (const line of text.split('\n')) {
      const d = h('div');
      const mm = line.match(/^(\d+\. )\[(OK|FAILED)\](.*)$/);
      if (mm) { d.append(mm[1]); d.append(h('span', mm[2] === 'OK' ? 'k' : 'f', `[${mm[2]}]`)); d.append(mm[3]); }
      else d.textContent = line;
      m.appendChild(d);
    }
    log.appendChild(m); log.scrollTop = log.scrollHeight;
  };
  msg('lq-sys', 'Tap a message we sent on the day, or type your own: move up, down, left, right, forward or back by a distance, tilt or roll the wrist, open or close the claw, hold.');

  // ---------------------------------------------------------------- panel extras
  const check = segmented(ctx.panel, {
    label: 'Gripper check', options: [{ value: 'fixed', label: 'Counts a stop on the can' }, { value: 'built', label: 'As built (within 1%)' }],
    value: 'fixed', onChange: () => {},
  });
  const bReset = h('button', 'lq-btn', 'Reset');
  bReset.type = 'button';
  ctx.panel.appendChild(bReset);

  // ---------------------------------------------------------------- motion
  let busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  // the robot's ramp: joint angles interpolated in equal steps (40 over 2 s for a move, 20 over 1 s for the wrist and gripper)
  function ramp(goal, seconds) {
    const from = arm.angles.slice();
    if (reduced) { applyPose(goal); return Promise.resolve(); }
    return new Promise((resolve) => {
      let t = 0;
      const stop = stage.onFrame((dt) => {
        t = Math.min(1, t + dt / seconds);
        applyPose(from.map((f, i) => lerp(f, goal[i], t)));
        if (t >= 1) { stop(); resolve(); }
      });
    });
  }
  function applyPose(p) {
    const jaw = grasp.update(p[5], 1 / 60);
    arm.pose([...p.slice(0, 5), jaw]);
    if (reduced) for (let i = 0; i < 400 && grasp.falling; i++) grasp.update(jaw, 1 / 60); // land it at once
  }
  const gripPos = () => (1 - arm.angles[5] / 95) * 100; // LeRobot units: 100 open, 0 closed

  async function moveCartesian({ delta_x_m: dx, delta_y_m: dy, delta_z_m: dz }) {
    const req = [dx, dy, dz];
    if (req.every((v) => Math.abs(v) < 1e-9)) return { ok: false, message: 'Cartesian differential must change at least one axis.' };
    const mag = Math.hypot(...req);
    const cmd = mag > 0.5 ? req.map((v) => (v * 0.5) / mag) : req;
    const du = [cmd[1], -cmd[0], cmd[2]]; // public (+x right, +y forward) to URDF (+x forward, +y left)
    const cur = toRepo(fk(arm.angles));
    const tgt = cur.map((v, i) => (du[i] ? clamp(v + du[i], ...BOX['xyz'[i]]) : v));
    const r = ik(toArm(tgt), arm.angles.slice(0, 5), { iters: 200 });
    const reached = toRepo(fk([...r.q.slice(0, 4), arm.angles[4]]));
    const miss = Math.hypot(reached[0] - tgt[0], reached[1] - tgt[1], reached[2] - tgt[2]);
    if (miss > 0.02) return { ok: false, message: 'Cartesian IK failed: target unreachable' };
    await ramp([...r.q.slice(0, 4), arm.angles[4], arm.angles[5]], 2);
    const au = tgt.map((v, i) => v - cur[i]);
    const ap = [-au[1], au[0], au[2]];
    const limited = ap.some((v, i) => Math.abs(v - req[i]) > 1e-4);
    return { ok: true, message: limited ? `Cartesian IK requested ${xyz(req)}; applied ${xyz(ap)} (safety/workspace limited).` : `Cartesian IK applied ${xyz(ap)}.` };
  }
  async function moveWrist({ pitch_degrees: p, roll_degrees: r }) {
    for (const [n, v] of [['pitch_degrees', p], ['roll_degrees', r]]) if (v < -160 || v > 160) return { ok: false, message: `${n} must be between -160 and +160 degrees.` };
    if (Math.abs(p) < 1e-9 && Math.abs(r) < 1e-9) return { ok: false, message: 'Wrist differential must move pitch, roll, or both.' };
    const J3 = JOINTS[3], J4 = JOINTS[4];
    const goal = arm.angles.slice();
    goal[3] = clamp(goal[3] - p, J3.min, J3.max); // a positive wrist flex tips this model's gripper down
    goal[4] = clamp(goal[4] + r, J4.min, J4.max);
    const ap = -(goal[3] - arm.angles[3]), ar = goal[4] - arm.angles[4];
    await ramp(goal, 1);
    const req = `pitch=${g(p)}°, roll=${g(r)}°`, app = `pitch=${g(+ap.toFixed(1))}°, roll=${g(+ar.toFixed(1))}°`;
    return { ok: true, message: Math.abs(ap - p) > 1 || Math.abs(ar - r) > 1 ? `Wrist differential requested ${req}; applied ${app} (calibration limited).` : `Wrist differential applied ${app}.` };
  }
  async function setGripper({ state }) {
    const before = gripPos();
    const goalDeg = state === 'open' ? 0 : 95, goal = state === 'open' ? 100 : 0;
    await ramp([...arm.angles.slice(0, 5), goalDeg], 1);
    const measured = gripPos();
    const moved = Math.abs(measured - before) >= 0.5;
    const atTarget = Math.abs(measured - goal) < 1;
    const stoppedOnCan = state === 'closed' && grasp.held;
    if (atTarget || (check.value === 'fixed' && stoppedOnCan)) return { ok: true, message: `Gripper set to ${state}.` };
    return { ok: false, message: `Gripper command failed: {'ok': False, 'state': '${state}', 'before': ${py(+before.toFixed(2))}, 'goal': ${py(goal)}, 'measured': ${py(+measured.toFixed(2))}, 'moved': ${moved ? 'True' : 'False'}, 'limits': [0.0, 100.0]}` };
  }
  const TOOLS = { move_cartesian: moveCartesian, move_wrist: moveWrist, set_gripper: setGripper, hold_position: async () => ({ ok: true, message: 'Robot is holding its current pose.' }) };

  async function submit(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    input.value = '';
    for (const b of [...chipBtns, send]) b.disabled = true;
    msg('lq-out', text);
    const typing = h('div', 'lq-msg lq-in lq-typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    await wait(400);
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    const calls = parse(text);
    const results = [];
    for (const c of calls) {
      const r = await TOOLS[c.tool](c.args);
      results.push(r);
      if (!r.ok) break;
    }
    await wait(250);
    typing.remove();
    if (!results.length) reply(SUPPORTED);
    else {
      const okN = results.filter((r) => r.ok).length;
      const failed = results.findIndex((r) => !r.ok);
      const headLine = failed < 0 ? `Executed ${okN} robot ${okN === 1 ? 'action' : 'actions'}:` : `Robot sequence stopped at step ${failed + 1} of ${calls.length}; ${okN} action${okN === 1 ? ' was' : 's were'} completed:`;
      reply([headLine, ...results.map((r, i) => `${i + 1}. [${r.ok ? 'OK' : 'FAILED'}] ${r.message}`)].join('\n'));
    }
    busy = false;
    for (const b of [...chipBtns, send]) b.disabled = false;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); });

  function reset() {
    if (busy) return;
    grasp.reset(canHome);
    arm.pose(START_POSE);
    log.querySelectorAll('.lq-msg').forEach((m) => m.remove());
  }
  bReset.addEventListener('click', reset);
  grasp.reset(canHome);
  arm.pose(START_POSE);

  stage.frame(fitBox(stage, [-0.24, 0, -0.06], [0.07, 0.3, 0.33]), { azimuth: 228, elevation: 24, pad: 1.05 });
  return { dispose() { ro.disconnect(); stage.dispose(); } };
}

// "Three ways in, one arm", scroll-driven: the control paths in our repo (github.com/amzoeee/soma-hackathon),
// drawn as three lanes of boxes, no WebGL. Each scroll step walks one lane box by box, the box it has
// reached lit and its detail shown under the lanes; the last step lights where every path ends.
// Every box names a real stage of the code: agent/src/demo (text) and robot/src (hand).
// The picture is a pure function of (step, progress through it).
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function style(id, css) { if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s); }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const LANES = [
  {
    title: 'Text it', sub: 'iMessage, agent/',
    steps: [
      ['iMessage', 'A plain-language text in an iMessage chat with the robot.'],
      ['Linq webhook', 'Linq forwards each text as a signed webhook. HMAC checked, rejected if older than five minutes.'],
      ['FastAPI server', 'Our small server, reached through a LocalTunnel URL.'],
      ['One planning call', 'Runware’s GPT-5.6 Luna turns the whole message into an ordered list of tool calls, in one call.'],
      ['4 tools', 'move_cartesian, move_wrist, set_gripper, hold_position. Run in order; the first failure stops the rest.'],
      ['Clamp', 'Moves over 0.5 m are scaled down; the target is clamped into 0.05 to 0.33 m forward, 0.20 m either side, 0.02 to 0.35 m up.'],
      ['IK + FK check', 'IK from the current angles, then forward kinematics: more than 2 cm off and the step fails as “target unreachable”.'],
      ['SO-101', 'The joint angles go to the arm’s six STS3215 servos.'],
      ['Reply', 'Built from the tool results, never written by the model: [OK] or [FAILED] per step.'],
    ],
  },
  {
    title: 'Hand', sub: 'AR glasses, robot/',
    steps: [
      ['Xreal Eye camera', 'A raw TCP stream over USB-C: 193,862-byte packets, a 512 x 378 image with 4 bits of grey per pixel.'],
      ['Clean-up', 'Bilateral denoise, gamma 0.65, CLAHE, unsharp mask, 2.5x upscale.'],
      ['MediaPipe', 'One gesture recognizer in video mode: 21 hand landmarks and the fist label in one pass.'],
      ['Relative mapping', 'Hand motion moves the gripper from where it is; a fist freezes it; pinch closes the claw in proportion.'],
      ['Clamp', '0.12 to 0.30 m forward, 0.15 m either side, 0.05 to 0.30 m up.'],
      ['IK (ikpy)', 'Solved on the arm’s URDF, seeded from the servos every frame; a miss over 3 cm keeps the last answer.'],
      ['5° per step', 'No joint moves more than 5 degrees per frame; a joint lagging 3 degrees for 10 frames is flagged as stalled.'],
      ['SO-101', 'The joint angles go to the arm’s six STS3215 servos.'],
      ['HUD on the glasses', 'Clutch, hand found, gesture, fps and the gripper target, on the glasses as a second screen.'],
    ],
  },
  {
    title: 'On its own', sub: 'autonomous',
    steps: [
      ['Pick-and-place motion', 'Reach, grab, carry, let go, fold. Nothing in this path looks at the can.'],
      ['SO-101', 'The same arm, the same servos.'],
    ],
  },
];
const END = 'Every path ends at the same arm: a target for the gripper, kept inside a safe box, turned into joint angles by inverse kinematics, and sent to the SO-101’s servos.';

const CSS = `
.lq-paths { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: clamp(16px, 4vh, 40px); padding: clamp(18px, 3.4vw, 56px); overflow: hidden; }
.lq-lane { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; align-items: start; opacity: .38; transition: none; }
.lq-lane.on { opacity: 1; }
.lq-lane header b { display: block; font-size: clamp(16px, 1.4vw, 21px); font-weight: 750; }
.lq-lane header small { display: block; margin-top: 3px; font-size: 13px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.lq-flow { display: flex; flex-wrap: wrap; gap: 10px 5px; align-items: center; margin: 0; padding: 0; list-style: none; }
.lq-flow li { display: contents; }
.lq-box { padding: 9px 14px; border-radius: 11px; border: 1px solid var(--line-strong); background: rgba(255, 255, 255, .04); color: var(--text-2); font-size: clamp(14px, 1.2vw, 17px); font-weight: 600; white-space: nowrap; }
.lq-box.lit { color: var(--text); border-color: rgba(255, 107, 53, .55); background: rgba(255, 107, 53, .1); }
.lq-box.now { color: #1a0b04; border-color: var(--accent); background: var(--accent); }
.lq-box.arm { border-color: rgba(255, 107, 53, .7); }
.lq-ar { color: var(--muted); font-size: 15px; padding: 0 2px; }
.lq-ar.lit { color: var(--accent); }
.lq-detail { margin: 6px 0 0; padding: 14px 18px; border-radius: 14px; background: rgba(0, 0, 0, .34); border: 1px solid var(--line); font-size: clamp(17px, 1.4vw, 20px); line-height: 1.5; color: var(--text-2); min-height: 4.6em; }
.lq-detail b { color: var(--text); }
@media (max-width: 700px) {
  .lq-paths { justify-content: flex-start; gap: 8px; padding: 14px 14px; }
  .lq-lane { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .lq-lane:not(.on) .lq-flow { display: none; }
  .lq-lane header b { display: inline; font-size: 14.5px; } .lq-lane header small { display: inline; margin-left: 8px; }
  .lq-box { font-size: 12.5px; padding: 5px 9px; }
  .lq-detail { font-size: 14px; padding: 10px 12px; min-height: 0; }
  .lq-all .lq-box:not(.arm), .lq-all .lq-ar { display: none; }
}
`;

export function mount(el, ctx) {
  style('lq-paths-css', CSS);
  const root = h('div', 'lq-paths');
  const lanes = LANES.map((L) => {
    const lane = h('section', 'lq-lane');
    const head = h('header');
    head.append(h('b', null, L.title), h('small', null, L.sub));
    const flow = h('ol', 'lq-flow');
    const boxes = [], arrows = [];
    L.steps.forEach(([name], i) => {
      const li = h('li');
      const b = h('span', `lq-box${name === 'SO-101' ? ' arm' : ''}`, name);
      li.append(b);
      boxes.push(b);
      if (i < L.steps.length - 1) { const a = h('span', 'lq-ar', '→'); a.setAttribute('aria-hidden', 'true'); li.append(a); arrows.push(a); }
      flow.append(li);
    });
    lane.append(head, flow);
    root.append(lane);
    return { lane, boxes, arrows };
  });
  const detail = h('p', 'lq-detail');
  detail.setAttribute('aria-live', 'polite');
  root.append(detail);
  el.append(root);

  const shown = new Map();
  const cls = (node, c) => { if (shown.get(node) !== c) { node.className = c; shown.set(node, c); } };
  let lastDetail = '';
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, LANES.length);
    const f = ctx.reducedMotion ? 1 : clamp(stepP / 0.8, 0, 1);
    cls(root, `lq-paths${s === LANES.length ? ' lq-all' : ''}`);
    lanes.forEach((L, li) => {
      const onLane = s === li || s === LANES.length;
      cls(L.lane, `lq-lane${onLane ? ' on' : ''}`);
      const n = LANES[li].steps.length;
      // how far this lane has got: all of it once its step is past, box by box during it
      const k = s > li ? n - 1 : s === li ? Math.min(n - 1, Math.floor(f * n)) : -1;
      L.boxes.forEach((b, i) => {
        const arm = LANES[li].steps[i][0] === 'SO-101';
        const now = s === LANES.length ? arm : s === li && i === k;
        cls(b, `lq-box${arm ? ' arm' : ''}${now ? ' now' : i <= k ? ' lit' : ''}`);
      });
      L.arrows.forEach((a, i) => cls(a, `lq-ar${i < k ? ' lit' : ''}`));
    });
    let text;
    if (s === LANES.length) text = `<b>One arm.</b> ${END}`;
    else {
      const n = LANES[s].steps.length, k = Math.min(n - 1, Math.floor(f * n));
      const [name, t] = LANES[s].steps[k];
      text = `<b>${name}.</b> ${t}`;
    }
    if (text !== lastDetail) { detail.innerHTML = text; lastDetail = text; }
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { root.remove(); } };
}

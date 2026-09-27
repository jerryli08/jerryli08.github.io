// "Three ways in, one arm": the control paths in our repo (github.com/amzoeee/soma-hackathon),
// drawn as a flow. A plain HTML figure, no WebGL. Every box names a real stage of the code:
// agent/src/demo (text) and robot/src (hand). Tap or hover a box for its detail.
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function style(id, css) { if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s); }

const ROWS = [
  {
    k: 'text', title: 'Text it', sub: 'iMessage, agent/',
    steps: [
      ['iMessage', 'A plain-language text in an iMessage chat with the robot.'],
      ['Linq webhook', 'Linq forwards each text as a signed webhook. HMAC checked, rejected if older than five minutes.'],
      ['FastAPI server', 'Our small server, reached through a LocalTunnel URL.'],
      ['One planning call', 'Runware’s GPT-5.6 Luna turns the whole message into an ordered list of tool calls, in one call.'],
      ['4 tools', 'move_cartesian, move_wrist, set_gripper, hold_position. Run in order; the first failure stops the rest.'],
      ['Clamp', 'Moves over 0.5 m are scaled down; the target is clamped into 0.05 to 0.33 m forward, 0.20 m either side, 0.02 to 0.35 m up.'],
      ['IK + FK check', 'IK from the current angles, then forward kinematics: more than 2 cm off and the step fails as “target unreachable”.'],
      ['SO-101', null],
      ['Reply', 'Built from the tool results, never written by the model: [OK] or [FAILED] per step.'],
    ],
  },
  {
    k: 'hand', title: 'Hand', sub: 'AR glasses, robot/',
    steps: [
      ['Xreal Eye camera', 'A raw TCP stream over USB-C: 193,862-byte packets, a 512 x 378 image with 4 bits of grey per pixel.'],
      ['Clean-up', 'Bilateral denoise, gamma 0.65, CLAHE, unsharp mask, 2.5x upscale.'],
      ['MediaPipe', 'One gesture recognizer in video mode: 21 hand landmarks and the fist label in one pass.'],
      ['Relative mapping', 'Hand motion moves the gripper from where it is; a fist freezes it; pinch closes the claw in proportion.'],
      ['Clamp', '0.12 to 0.30 m forward, 0.15 m either side, 0.05 to 0.30 m up.'],
      ['IK (ikpy)', 'Solved on the arm’s URDF, seeded from the servos every frame; a miss over 3 cm keeps the last answer.'],
      ['5° per step', 'No joint moves more than 5 degrees per frame; a joint lagging 3 degrees for 10 frames is flagged as stalled.'],
      ['SO-101', null],
      ['HUD on the glasses', 'Clutch, hand found, gesture, fps and the gripper target, on the glasses as a second screen.'],
    ],
  },
  {
    k: 'auto', title: 'On its own', sub: 'autonomous',
    steps: [
      ['Pick-and-place motion', 'Reach, grab, carry, let go, fold. Nothing in this path looks at the can.'],
      ['SO-101', null],
    ],
  },
];

const CSS = `
.lq-pipe { position: relative; display: flex; flex-direction: column; gap: 14px; padding: clamp(14px, 2.4vw, 26px); height: auto; }
.lq-pipe-row { display: grid; grid-template-columns: 124px minmax(0, 1fr); gap: 14px; align-items: start; }
.lq-pipe-head b { display: block; font-size: 15px; } .lq-pipe-head small { display: block; font-size: 12px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.lq-pipe-flow { display: flex; flex-wrap: wrap; gap: 8px 4px; align-items: center; margin: 0; padding: 0; list-style: none; }
.lq-pipe-flow li { display: contents; }
.lq-pipe-flow button { padding: 6px 11px; border-radius: 10px; border: 1px solid var(--line-strong); background: rgba(255, 255, 255, .04); color: var(--text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.lq-pipe-flow button:hover, .lq-pipe-flow button[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
.lq-pipe-flow button.arm { background: var(--accent); border-color: var(--accent); color: #1a0b04; cursor: default; }
.lq-pipe-flow .ar { color: var(--muted); font-size: 13px; padding: 0 2px; }
.lq-pipe-detail { min-height: 2.8em; margin: 4px 0 0; padding: 10px 14px; border-radius: 12px; background: rgba(0, 0, 0, .3); border: 1px solid var(--line); font-size: 14px; line-height: 1.5; color: var(--text-2); }
@media (max-width: 640px) { .lq-pipe-row { grid-template-columns: minmax(0, 1fr); gap: 6px; } .lq-pipe-flow button { font-size: 12.5px; padding: 5px 9px; } }
`;

export function mount(el) {
  style('lq-pipe-css', CSS);
  const box = h('div', 'lq-pipe');
  const detail = h('p', 'lq-pipe-detail', 'Tap a box for what that stage does in our code. Every path ends at the same arm.');
  detail.setAttribute('aria-live', 'polite');
  let pressed = null;
  for (const r of ROWS) {
    const row = h('div', 'lq-pipe-row');
    const head = h('div', 'lq-pipe-head');
    head.append(h('b', null, r.title), h('small', null, r.sub));
    const flow = h('ol', 'lq-pipe-flow');
    r.steps.forEach(([name, text], i) => {
      const li = h('li');
      const b = h('button', text ? '' : 'arm', name);
      b.type = 'button';
      if (text) {
        const show = () => { pressed?.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); pressed = b; detail.textContent = `${name}: ${text}`; };
        b.addEventListener('click', show);
        b.addEventListener('mouseenter', show);
        b.addEventListener('focus', show);
      } else b.setAttribute('aria-disabled', 'true');
      li.appendChild(b);
      if (i < r.steps.length - 1) li.appendChild(h('span', 'ar', '→'));
      flow.appendChild(li);
    });
    row.append(head, flow);
    box.appendChild(row);
  }
  box.appendChild(detail);
  el.style.height = 'auto';
  el.appendChild(box);
  return { dispose() { box.remove(); el.style.height = ''; } };
}

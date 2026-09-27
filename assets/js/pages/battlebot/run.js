// The arena run for the page, worked out ahead of time: where the boxes start, and a small
// deterministic driver that plays the robot through the scroll story (spin the weapon up in place,
// drive into box A, turn in place and hit box B, then box C). It steers toward each box with a
// simple heading controller, the way a driver would, and it only reads the model's state, so the
// same run comes out every time. The page maps the scroll onto this run's clock.
// No imports, so it runs in node for tuning (physics.js takes THREE as an argument).
import { recording } from './physics.js';

export const W_FULL = (740 * 11.1 * 2 * Math.PI) / 60; // 8,214 rpm: Jerry's calculator, no load
// The robot starts at the back of the arena facing the camera (+Z), so its blade faces the reader.
export const START = { x: 0, z: -0.3, yaw: Math.PI };
// cardboard boxes (props): size in mm (w, h, d) and a starting pose (x, z, yaw); A, B, C are hit in turn
export const BOXES = [
  { s: [90, 60, 70], p: [0.0, 0.02, -0.15] },   // A
  { s: [80, 55, 60], p: [0.36, 0.1, -0.5] },    // B
  { s: [70, 50, 50], p: [-0.34, 0.18, 0.3] },   // C
  { s: [120, 40, 80], p: [-0.06, 0.37, -0.2] }, // at the front
  { s: [60, 60, 60], p: [0.52, -0.2, -0.3] },   // at the right
];

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Record the run. Returns the recording plus marks: the clock times the story's steps start at.
 * With { yieldEvery: ms } it returns a promise and gives the main thread back every few ms.
 */
export function recordRun(T, { yieldEvery = 0 } = {}) {
  const SPIN = 2.6, BACK = 0.3, SETTLE = 1.1, TURN_OK = 0.07;
  const marks = { spin: 0, drive: SPIN };
  let phase = 0, since = 0, hits = 0, backUntil = -1, stopAt = Infinity;
  const targets = [0, 1, 2];
  function script(t, st, boxes) {
    const cmd = { f: 0, turn: 0, weapon: W_FULL };
    if (t < SPIN) return cmd;
    if (st.hits > hits) { // a hit: back off for a moment, then move on to the next box
      hits = st.hits;
      marks[`hit${hits}`] = t;
      backUntil = t + BACK;
      phase++;
      since = t + BACK;
      if (phase < targets.length) marks[`turn${phase}`] = t + SETTLE * 0.55;
      else stopAt = t + SETTLE;
    }
    if (t < backUntil) { cmd.f = -0.35; return cmd; }
    if (phase >= targets.length || t - since < SETTLE * 0.55 - BACK) return cmd; // let the box land
    const b = boxes[targets[phase]];
    const want = Math.atan2(-(b.x.x - st.x), -(b.x.z - st.z));
    const e = wrap(want - st.yaw);
    cmd.turn = clamp(-e * 2.2, -1, 1);
    cmd.f = Math.abs(e) < TURN_OK ? 0.5 : Math.abs(e) < 0.35 ? 0.25 : 0;
    return cmd;
  }
  const it = recording(T, { script, duration: 9, boxes: BOXES, start: START });
  const done = (rec) => { marks.end = Math.min(rec.duration, stopAt); return { ...rec, marks }; };
  if (!yieldEvery) { let r; while (!(r = it.next()).done); return done(r.value); }
  return (async () => {
    let r, t0 = performance.now();
    while (!(r = it.next()).done) {
      if (performance.now() - t0 > yieldEvery) { await new Promise((ok) => setTimeout(ok, 0)); t0 = performance.now(); }
    }
    return done(r.value);
  })();
}

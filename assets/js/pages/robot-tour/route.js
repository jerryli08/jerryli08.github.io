// The example track from the 2025 Robot Tour C rules and Jerry's final coded route through it, with
// a small, deterministic simulation of the final sketch's control loop. No DOM here.
//
// Track: centimetres, x to the right from the left edge, y UP from the bottom edge (the rules'
// drawing turned into these coordinates). Twenty 50 cm zones; the 2x4s (1.5 x 16 in) lie centred on
// the zone edges as the rules place them.
//
// The code (final route sketch, github.com/jerryli08/sciolyRoTo): the route is a list of states run
// by a state machine. The OTOS is reset at every transition so that its origin is where the robot
// should be, and its reading is the robot's error from that point:
//   rad = prevHeadingTarget
//   prevXError = x cos(rad) + y sin(rad)
//   prevYError = -x sin(rad) + y cos(rad) - prevDistTarget
//   prevHError = h - prevHeadingTarget            (then setPosition({prevXError, prevYError, prevHError}))
// A forward move of d aims at (0, d) from wherever the robot is:
//   linTarget = prevDistTarget = sqrt(prevXError^2 + (d - prevYError)^2)
//   linInput = distance driven from the start of the move; headingTarget = atan2(x, d - y)
//   linOutput = clamp(0.53 linError, -1, 1), headingOutput = clamp(0.00063 headingError, -1, 1)
//   wheels = linOutput -/+ 7 headingOutput (the steering term only while linError > 0.01 m)
// Turns: headingTarget = +90 (left) or -90 (right); wheels = -/+ headingOutput.
// Then the per-wheel deadband offsets and a clamp to +-0.2; the servo is written 90 - 90 x power.
// A straight move is done when |linError| < 1.5 mm, a turn when |headingError| < 0.5 degrees.
// OTOS frame: y is forward, x to the right, heading counter-clockwise, all reset every move.
//
// What is a model, not the code: how fast the robot moves (the code has no clock the page can use;
// the pacing follows the gains: full speed at the 0.2 cap, then proportional slowing), and the small
// error each move ends with (a fixed pseudo-random list inside the code's tolerances).
export const TRACK = { w: 200, h: 250, cell: 50 };
export const START = [0, 125];
export const TARGET = [175, 175];
export const GATES = [
  { id: 'A', x0: 0, y0: 200, x1: 50, y1: 250 },
  { id: 'C', x0: 150, y0: 100, x1: 200, y1: 150 },
  { id: 'D', x0: 150, y0: 0, x1: 200, y1: 50 },
  { id: 'B', x0: 50, y0: 0, x1: 100, y1: 50, last: true },
];
const L = 40.64, T = 3.81; // a 2x4, 16 in long, 1.5 in across
const hz = (x0, y) => ({ x0: x0 + (50 - L) / 2, x1: x0 + (50 + L) / 2, y0: y - T / 2, y1: y + T / 2 });
const vt = (x, y0) => ({ x0: x - T / 2, x1: x + T / 2, y0: y0 + (50 - L) / 2, y1: y0 + (50 + L) / 2 });
export const OBSTACLES = [
  { x0: 0 + (50 - L) / 2, x1: (50 + L) / 2, y0: 250 - T, y1: 250 }, // along the top edge of A, inside the track
  hz(50, 200), vt(150, 200), hz(150, 200), hz(0, 150), vt(50, 100), vt(150, 100), hz(50, 50), vt(100, 0), hz(150, 50),
];

// the final route, as coded (45 moves, then STOP), with the code's own comments
export const MOVES = `FORWARD_33 TURN_RIGHT FORWARD_50 TURN_LEFT FORWARD_50 TURN_LEFT FORWARD_100 TURN_LEFT FORWARD_50 TURN_RIGHT FORWARD_50
 TURN_RIGHT FORWARD_100 TURN_RIGHT FORWARD_50 TURN_LEFT FORWARD_50 TURN_RIGHT FORWARD_100 TURN_RIGHT FORWARD_50 TURN_LEFT FORWARD_50 TURN_LEFT FORWARD_25
 TURN_RIGHT TURN_RIGHT FORWARD_25 TURN_RIGHT FORWARD_50 TURN_LEFT FORWARD_100 TURN_LEFT FORWARD_50 TURN_LEFT FORWARD_50
 TURN_RIGHT TURN_RIGHT FORWARD_50 TURN_RIGHT FORWARD_50 TURN_RIGHT FORWARD_150 TURN_LEFT FORWARD_100`.split(/\s+/);
export const NOTES = { 11: 'gate zone a', 19: 'passes through gate c', 25: 'gate zone d', 36: 'gate zone b, last', 45: 'to target' };
// the enum values the code prints in "Transitioned to state: N"
const ENUM = ['FORWARD_25', 'FORWARD_33', 'FORWARD_50', 'FORWARD_75', 'FORWARD_100', 'FORWARD_125', 'FORWARD_150', 'FORWARD_175', 'FORWARD_200', 'FORWARD_225',
  'BACKWARD_25', 'BACKWARD_50', 'BACKWARD_75', 'BACKWARD_100', 'BACKWARD_125', 'BACKWARD_150', 'BACKWARD_175', 'BACKWARD_200', 'BACKWARD_225', 'TURN_LEFT', 'TURN_RIGHT', 'STOP'];
export const enumOf = (name) => ENUM.indexOf(name);

// the robot, from the CAD (cm): the turning point is the middle of the axle; the dowel's centre is
// 8.0 cm ahead of it (1/4 in across); the frame runs from 7.65 cm behind to 8.62 cm ahead, 14.2 wide
export const ROBOT = { dowel: 8.0, dowelR: 0.3175, front: 8.62, back: 7.65, half: 7.1 };
// the start pose: the rules put the dowel over the start point, so the turning point is 8 cm behind it
export const START_POSE = [START[0] - ROBOT.dowel, START[1], 0];

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// code constants
export const K = { linKp: 0.53, hKp: 0.00063, steer: 7, cap: 0.2, linTol: 0.0015, angTol: 0.5, steerStop: 0.01,
  dz: { lf: 0.0212, lb: 0.0432, rf: 0.0, rb: 0.0652 } };

// fixed pseudo-random end errors, inside the code's tolerances
let seed = 20250404;
const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647 - 0.5; };

// pacing model (see the header): time in units of (metres at the 0.2 cap speed)
const DC = K.cap / K.linKp; // 0.377 m: closer than this the distance controller is below the cap
const TAU_H = 1 / ((180 / Math.PI) * (K.hKp / K.cap) / 0.05995); // heading time constant (same units)
const TAIL = 2.5; // time constants shown for each approach (the real tail is longer; it is compressed)
const eT = Math.exp(-TAIL);
function fwdTime(d) { return Math.max(0, d - DC) + TAIL * DC; }
function fwdAt(d, t) { // metres driven after time t
  const tc = Math.max(0, d - DC), r0 = Math.min(d, DC);
  if (t <= tc) return t;
  const q = (Math.exp(-(t - tc) / DC) - eT) / (1 - eT);
  return tc + r0 * (1 - clamp(q, 0, 1));
}
const turnTime = () => TAIL * TAU_H;
function turnAt(t) { return 1 - clamp((Math.exp(-t / TAU_H) - eT) / (1 - eT), 0, 1); }

/** Runs the route once. Returns the moves with their world poses, OTOS frames and errors. */
export function simulate() {
  seed = 20250404;
  const out = [];
  // OTOS frame: origin O (world cm) and the world angle phi of its +y axis (the ideal forward)
  let O = [START_POSE[0], START_POSE[1]], phi = START_POSE[2];
  let e = [0, 0, 0]; // the OTOS reading at the start of the move (cm, cm, deg)
  for (let i = 0; i < MOVES.length; i++) {
    const name = MOVES[i];
    const turn = name.startsWith('TURN');
    const d = turn ? 0 : +name.split('_')[1];
    const fwd = [Math.cos(phi), Math.sin(phi)], right = [Math.sin(phi), -Math.cos(phi)];
    const o = [...O];
    const w = (x, y) => [o[0] + x * right[0] + y * fwd[0], o[1] + x * right[1] + y * fwd[1]];
    let end, linTarget = null, hTarget;
    if (turn) {
      hTarget = name === 'TURN_LEFT' ? 90 : -90;
      end = [e[0], e[1], hTarget + rnd() * 0.9];
    } else {
      linTarget = Math.hypot(e[0], d - e[1]);
      hTarget = null;
      end = [rnd() * 0.2, d + rnd() * 0.28, rnd() * 0.7];
    }
    const m = {
      i, n: i + 1, name, turn, d, note: NOTES[i + 1] || '', O: [...O], phi, start: [...e], end, linTarget, hTarget,
      time: turn ? turnTime() : fwdTime(d / 100), toWorld: w,
    };
    out.push(m);
    // the transition, as coded
    const prevHeadingTarget = turn ? hTarget : 0;
    const prevDistTarget = turn ? 0 : linTarget;
    const rad = prevHeadingTarget * DEG;
    const px = end[0] * Math.cos(rad) + end[1] * Math.sin(rad);
    const py = -end[0] * Math.sin(rad) + end[1] * Math.cos(rad) - prevDistTarget;
    const ph = end[2] - prevHeadingTarget;
    m.errOut = [px, py, ph];
    // the world pose at the end, then the new frame that gives that pose the reading (px, py, ph)
    const P = w(end[0], end[1]), th = phi + end[2] * DEG;
    const nphi = th - ph * DEG;
    const nf = [Math.cos(nphi), Math.sin(nphi)], nr = [Math.sin(nphi), -Math.cos(nphi)];
    O = [P[0] - px * nr[0] - py * nf[0], P[1] - px * nr[1] - py * nf[1]];
    phi = nphi;
    e = [px, py, ph];
    m.endWorld = [P[0], P[1], th];
  }
  let t = 0;
  for (const m of out) { m.t0 = t; t += m.time; }
  return { moves: out, total: t };
}

/** The OTOS reading, world pose and controller values u (0..1) of the way through move m. */
export function state(m, u) {
  u = clamp(u, 0, 1);
  const t = u * m.time;
  let x, y, h, frac;
  if (m.turn) {
    frac = turnAt(t);
    x = m.start[0]; y = m.start[1];
    h = m.start[2] + (m.end[2] - m.start[2]) * frac;
  } else {
    const L = m.linTarget / 100; // metres from the start to where the move ends
    frac = L > 0 ? fwdAt(L, t) / L : 1;
    x = m.start[0] + (m.end[0] - m.start[0]) * frac;
    y = m.start[1] + (m.end[1] - m.start[1]) * frac;
    h = m.start[2] + (m.end[2] - m.start[2]) * Math.min(1, frac * 1.6);
  }
  const P = m.toWorld(x, y), th = m.phi + h * DEG;
  // the controller, from the code's formulas
  let linError = null, headingTarget, headingError, linOutput = null, left, right;
  if (m.turn) {
    headingTarget = m.hTarget;
    headingError = headingTarget - h;
    const hOut = clamp(K.hKp * headingError, -1, 1);
    left = -hOut; right = hOut;
  } else {
    const linInput = Math.hypot(x - m.start[0], y - m.start[1]) / 100;
    linError = m.linTarget / 100 - linInput;
    headingTarget = Math.atan2(x, m.d - y) / DEG;
    headingError = headingTarget - h;
    linOutput = clamp(K.linKp * linError, -1, 1);
    const hOut = clamp(K.hKp * headingError, -1, 1);
    left = linOutput; right = linOutput;
    if (linError > K.steerStop) { left -= K.steer * hOut; right += K.steer * hOut; }
  }
  const done = frac >= 0.9999;
  if (done) { left = 0; right = 0; }
  if (left > 0) left += K.dz.lf; else if (left < 0) left -= K.dz.lb;
  if (right > 0) right += K.dz.rf; else if (right < 0) right -= K.dz.rb;
  left = clamp(left, -K.cap, K.cap); right = clamp(right, -K.cap, K.cap);
  const headingOutput = clamp(K.hKp * headingError, -1, 1);
  return { x, y, h, frac, P, th, linError, headingTarget, headingError, linOutput, headingOutput, left, right, done };
}

/** Where the route puts the robot at time t (model units): the move, how far through it, the state. */
export function at(sim, t) {
  const ms = sim.moves;
  let lo = 0, hi = ms.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ms[mid].t0 <= t) lo = mid; else hi = mid - 1; }
  const m = ms[lo];
  return { m, u: clamp((t - m.t0) / m.time, 0, 1) };
}

/**
 * An illustration of drift, NOT measured: the same moves driven by a robot whose sensor reads its
 * heading a little wrong, more so the longer it runs, and over-reads distance by 3 %. The robot
 * follows its reading perfectly, so the real path bends away from the one it believes.
 */
export function drifted(sim, degPerMove = 0.3, scale = 1.03) {
  const pts = [[START_POSE[0], START_POSE[1]]];
  let pose = [START_POSE[0], START_POSE[1]];
  sim.moves.forEach((m, k) => {
    const a = sim.moves[k];
    const [x0, y0] = k === 0 ? [START_POSE[0], START_POSE[1]] : sim.moves[k - 1].endWorld;
    const [x1, y1] = a.endWorld;
    const bias = -degPerMove * (k + 1) * DEG;
    const dx = (x1 - x0) / scale, dy = (y1 - y0) / scale;
    pose = [pose[0] + dx * Math.cos(bias) - dy * Math.sin(bias), pose[1] + dx * Math.sin(bias) + dy * Math.cos(bias)];
    pts.push([...pose]);
  });
  const last = sim.moves[sim.moves.length - 1].endWorld[2] - degPerMove * sim.moves.length * DEG;
  return { pts, heading: last };
}

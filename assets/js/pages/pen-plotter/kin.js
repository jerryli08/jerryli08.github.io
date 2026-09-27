// The plotter's math, copied from my Arduino code (github.com/jerryli08/5bar): the frame, the link
// lengths, the motor limits, the inverse kinematics (computeAll5BarSolutions + selectBestSolution)
// and the way the final sketch (cartesianPathing.ino) walks a path in time. Everything the demos
// show on screen comes from these functions, so the numbers are the numbers the Arduino computes.
//
// Frame (mm): left motor axis at (0, 0), right motor axis at (100, 0), +y away from the motors.
// Angles in degrees from +x, counterclockwise seen from above; 90 = arm pointing straight out.
// The CAD agrees: both motor shafts are 100 mm apart and all four links are 100 mm hole to hole.

export const L = 100; // ARM_LENGTH: every link, mm
export const D = 100; // BASE_SEPARATION: motor spacing, mm
export const STEPS_PER_REV = 3200; // 1/16 microstepping of a 200 step motor
export const STEPS_PER_DEG = STEPS_PER_REV / 360;
export const DEG_PER_STEP = 360 / STEPS_PER_REV; // 0.1125
export const LIM = { lMin: 15, lMax: 270, rMin: -90, rMax: 165 };
export const HOME = [50, 186.6];
const R2D = 180 / Math.PI, D2R = Math.PI / 180;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Both whole-robot solutions for a pen target, as in computeAll5BarSolutions (degrees), or null when out of reach. */
export function solutions(x, y) {
  const D1 = Math.hypot(x, y);
  if (D1 > 2 * L || D1 < 1e-6) return null;
  const phi1 = Math.atan2(y, x), a1 = Math.acos(D1 / (2 * L));
  const xr = x - D, D2 = Math.hypot(xr, y);
  if (D2 > 2 * L || D2 < 1e-6) return null;
  const phi2 = Math.atan2(y, xr), a2 = Math.acos(D2 / (2 * L));
  return {
    D1, D2, phi1: phi1 * R2D, a1: a1 * R2D, phi2: phi2 * R2D, a2: a2 * R2D,
    sols: [
      { l: (phi1 + a1) * R2D, r: (phi2 - a2) * R2D }, // both elbows out
      { l: (phi1 - a1) * R2D, r: (phi2 + a2) * R2D }, // both elbows in
    ],
  };
}
export const legal = (s) => s.l >= LIM.lMin && s.l <= LIM.lMax && s.r >= LIM.rMin && s.r <= LIM.rMax;

/** selectBestSolution: the legal solution with the largest left minus right angle, or null (the code then holds position). */
export function ik(x, y) {
  const s = solutions(x, y);
  if (!s) return null;
  let best = -1, bd = -Infinity;
  s.sols.forEach((q, i) => { if (legal(q) && q.l - q.r > bd) { bd = q.l - q.r; best = i; } });
  if (best < 0) return null;
  return { ...s.sols[best], idx: best, info: s };
}

export const steps = (deg) => Math.round(deg * STEPS_PER_DEG); // degToSteps (lround)

export function elbows(l, r) {
  return [[L * Math.cos(l * D2R), L * Math.sin(l * D2R)], [D + L * Math.cos(r * D2R), L * Math.sin(r * D2R)]];
}
export const heading = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * R2D;
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Forward kinematics: where the pen goes for two motor angles. Two assembly modes; take the one
 * nearest prev (the real linkage does not jump between them). Returns null when the elbows are
 * more than 2L apart: the loop cannot close. gap = how far apart the elbows are.
 */
export function fk(l, r, prev) {
  const [E1, E2] = elbows(l, r);
  const dx = E2[0] - E1[0], dy = E2[1] - E1[1], c = Math.hypot(dx, dy);
  if (c > 2 * L) return { P: null, E1, E2, gap: c };
  const h = Math.sqrt(Math.max(0, L * L - (c * c) / 4)), mx = (E1[0] + E2[0]) / 2, my = (E1[1] + E2[1]) / 2;
  const nx = -dy / c, ny = dx / c;
  const A = [mx + h * nx, my + h * ny], B = [mx - h * nx, my - h * ny];
  const P = !prev || dist(A, prev) <= dist(B, prev) ? A : B;
  return { P, E1, E2, gap: c };
}

/** The whole pose for a pen point solved by the IK: elbows, forearm headings, the five joint angles. */
export function pose(x, y, q) {
  q ||= ik(x, y);
  if (!q) return null;
  const P = [x, y];
  const [E1, E2] = elbows(q.l, q.r);
  return { P, E1, E2, l: q.l, r: q.r, idx: q.idx, hL: heading(E1, P), hR: heading(E2, P), joints: interior([0, 0], E1, P, E2, [D, 0]) };
}

/**
 * Interior angles of the pentagon O1, E1, P, E2, O2 (the base, the motor arms, the forearms), in
 * that order: [left motor, left elbow, pen joint, right elbow, right motor]. The sum is 540° while
 * the pentagon is a simple polygon; `simple` says whether it is.
 */
export function interior(...V) {
  let area = 0;
  for (let i = 0; i < 5; i++) { const a = V[i], b = V[(i + 1) % 5]; area += a[0] * b[1] - b[0] * a[1]; }
  const s = area >= 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < 5; i++) {
    const a = V[(i + 4) % 5], b = V[i], c = V[(i + 1) % 5];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const turn = Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) * R2D;
    out.push(180 - s * turn);
  }
  const sum = out.reduce((t, x) => t + x, 0);
  return { a: out, sum, simple: Math.abs(sum - 540) < 0.5 };
}

/**
 * How far the pen moves for one microstep of one motor (mm, the larger of the two), from the
 * velocity equations of the linkage: (P - E1)·(dP - dE1) = 0 and (P - E2)·(dP - dE2) = 0. It grows
 * without limit where the forearms line up (P - E1 parallel to P - E2): the fold line.
 */
export function perStep(p) {
  const { P, E1, E2 } = p;
  const a = [P[0] - E1[0], P[1] - E1[1]], b = [P[0] - E2[0], P[1] - E2[1]];
  const det = a[0] * b[1] - a[1] * b[0];
  if (Math.abs(det) < 1e-9) return Infinity;
  const col = (t, row) => { // dP for a unit turn of one motor (rad): solve [a; b] dP = rhs
    const rhs = row === 0 ? [a[0] * t[0] + a[1] * t[1], 0] : [0, b[0] * t[0] + b[1] * t[1]];
    return Math.hypot((rhs[0] * b[1] - a[1] * rhs[1]) / det, (a[0] * rhs[1] - rhs[0] * b[0]) / det);
  };
  const tl = [-L * Math.sin(p.l * D2R), L * Math.cos(p.l * D2R)], tr = [-L * Math.sin(p.r * D2R), L * Math.cos(p.r * D2R)];
  return Math.max(col(tl, 0), col(tr, 1)) * DEG_PER_STEP * D2R;
}

/**
 * The fold line: every pen point where the two forearms lie in one straight line (the elbows
 * exactly 2L apart), traced by walking the left elbow round its circle. Only the branch in front
 * of the motors, the one a drawing can reach.
 */
export function foldLine(step = 0.5) {
  const pts = [];
  for (let deg = 0; deg <= 360; deg += step) {
    const E1 = [L * Math.cos(deg * D2R), L * Math.sin(deg * D2R)];
    const dx = D - E1[0], dy = -E1[1], c = Math.hypot(dx, dy);
    const R1 = 2 * L, R2 = L;
    if (c > R1 + R2 || c < Math.abs(R1 - R2) || c === 0) continue;
    const aa = (R1 * R1 - R2 * R2 + c * c) / (2 * c), h = Math.sqrt(Math.max(0, R1 * R1 - aa * aa));
    const xm = E1[0] + (aa * dx) / c, ym = E1[1] + (aa * dy) / c;
    for (const s of [1, -1]) {
      const E2 = [xm - (s * h * dy) / c, ym + (s * h * dx) / c];
      const P = [(E1[0] + E2[0]) / 2, (E1[1] + E2[1]) / 2];
      const q = ik(P[0], P[1] + 1e-3);
      if (P[1] > 30 && q && q.idx === 0) pts.push(P);
    }
  }
  pts.sort((a, b) => a[0] - b[0]);
  // keep one smooth curve: drop points that jump back (the two branches of the walk overlap)
  const out = [];
  for (const p of pts) if (!out.length || p[0] - out[out.length - 1][0] > 0.2) out.push(p);
  return out;
}

// ------------------------------------------------------------------ paths in time (cartesianPathing)
/**
 * A path in my format ([x, y, ms]); returns its timeline. at(t) is what the final loop computes at
 * program time t (ms): the segment, how far along it, and the x-y target on the straight line.
 */
export function timeline(path) {
  const start = [0];
  for (let i = 1; i < path.length; i++) start.push(start[i - 1] + path[i][2]);
  const total = start[start.length - 1];
  const len = [0];
  for (let i = 1; i < path.length; i++) len.push(len[i - 1] + dist(path[i - 1], path[i]));
  function at(t) {
    t = clamp(t, 0, total);
    let k = 1;
    while (k < path.length - 1 && start[k] < t) k++;
    const a = path[k - 1], b = path[k];
    const f = b[2] > 0 ? clamp((t - start[k - 1]) / b[2], 0, 1) : 1;
    return { t, seg: k, of: path.length - 1, f, x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), s: lerp(len[k - 1], len[k], f) };
  }
  return { path, start, total, len, length: len[len.length - 1], at, timeOfEntry: (i) => start[i] };
}

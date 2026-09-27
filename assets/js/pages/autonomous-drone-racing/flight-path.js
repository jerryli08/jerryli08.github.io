// The flight on this page as a pure function of the scroll. flight-data.js holds every control tick
// of one lap, flown ahead of time by the port of our line follower (line-core.js); any moment in
// between is the last tick's state integrated forward with the same flight-controller lag the
// simulation uses (a first-order lag of SIM.TAU on the commanded body velocity and yaw rate).
// No DOM here, so it can be checked headless.
import { SIM } from './line-core.js';
import { FIELDS, TICKS, LAP } from './flight-data.js';

export { TICKS, LAP };
export const F = Object.fromEntries(FIELDS.map((k, i) => [k, i]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// scroll (u = step + progress through it, 0..7) to flight time in seconds. Step 0 is the climb;
// the keys put the first hoop, the bends and the reflection in their steps. The lap ends at 6.7:
// the stage unpins when the last step is about 70 % through. Monotone cubic (Fritsch and
// Carlson), so the drone speeds up and slows down smoothly between steps.
export const KEYS = [[0, 0], [1, 0], [2, 4], [3, 8], [4, 13], [5, 32], [6, 125], [6.15, 129], [6.45, 137.5], [6.7, LAP]];
const M = (() => {
  const n = KEYS.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((KEYS[i + 1][1] - KEYS[i][1]) / (KEYS[i + 1][0] - KEYS[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return m;
})();
export function timeAt(u) {
  u = clamp(u, 0, KEYS[KEYS.length - 1][0]);
  let i = 0;
  while (i < KEYS.length - 2 && u > KEYS[i + 1][0]) i++;
  const [u0, t0] = KEYS[i], [u1, t1] = KEYS[i + 1], h = u1 - u0, s = (u - u0) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
  return clamp(h00 * t0 + h10 * h * M[i] + h01 * t1 + h11 * h * M[i + 1], 0, LAP);
}

// the climb in step 0, drawn for the page: from resting on the landing gear to the script's
// take-off height. From the CAD: the gear feet are 82.6 mm and the downward camera's sensor 46.9 mm
// below the top plate, so the camera starts 35.7 mm off the floor.
export const GEAR = 0.0826, CAM_DROP = 0.0469;
export const GROUND_ALT = GEAR - CAM_DROP;
// it stays on the ground until the stage has pinned (step 0 starts about a third of the way in)
export const altAt = (u) => GROUND_ALT + (SIM.ALT - GROUND_ALT) * smooth(0.42, 0.95, u);

/** Index of the last tick at or before t. */
export function tickAt(t) {
  let lo = 0, hi = TICKS.length - 1;
  if (t >= TICKS[hi][F.t]) return hi;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (TICKS[mid][F.t] <= t + 1e-9) lo = mid; else hi = mid; }
  return lo;
}
/** The drone's pose { x, z, h } at time t (heading h: forward = (cos h, sin h) on the floor). */
export function poseAt(t, out = {}) {
  const T = TICKS[tickAt(t)];
  let x = T[F.x], z = T[F.z], h = T[F.h], vf = T[F.vf], vr = T[F.vr], vw = T[F.vw];
  const cf = T[F.cf], cr = T[F.cr], cw = T[F.cw];
  const H = 1 / 120;
  for (let left = Math.max(0, t - T[F.t]); left > 1e-9; left -= H) { // the simulation's own steps
    const d = Math.min(H, left), a = 1 - Math.exp(-d / SIM.TAU);
    vf += (cf - vf) * a; vr += (cr - vr) * a; vw += (cw - vw) * a;
    h += (vw * Math.PI / 180) * d;
    const c = Math.cos(h), s = Math.sin(h);
    x += (vf * c - vr * s) * d; z += (vf * s + vr * c) * d;
  }
  out.x = x; out.z = z; out.h = h;
  return out;
}

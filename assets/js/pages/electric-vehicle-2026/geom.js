// Geometry shared by this page's two demos. Pure functions, no DOM.
//
// Car sizes come from my CAD (both versions share the rear drive and the 2.875 in wheels).
// The caliper linkage pivots come from tools/cad-axes.py on the final STEP
// (scioly_ev_2026_ev_caliper_steering_final_ver.step), in STEP millimetres, Z up:
//   steering axis (6202 bearing, bearing holder bore)  x -465.2, y 231.5
//   arm pin on the bearing holder / link front pin     x -415.2, y 231.5   (50.0 mm arm, pointing back)
//   link rear pin on the dynamic caliper ends          x -337.5, y 187.3   (slides along +x as the jaw opens)
// The track layout comes from the 2025-26 Electric Vehicle C rules: target 7 to 10 m, bonus line
// halfway, outer can's inside edge 100 cm from the centre line, inner can 0 to 100 cm inside it.

export const WHEELBASE = { v1: 0.142, v2: 0.452 };          // m, rear axle to front axle
export const LENGTH = { v1: 0.215, v2: 0.525 };             // m, front of front wheel to back of rear wheels
export const WIDTH = 0.1297;                                // m, overall
export const REAR = 0.0365;                                 // m, rear axle to the back of the rear wheels (73 mm wheels)
export const OUTER_CAN = 1.0;                               // m, outer can's inside edge from the centre line
export const CAN_R = 0.033;                                 // m, drawing radius of a can (annotation only)

// ---------------------------------------------------------------- caliper linkage (slider-crank)
const P = [-465.2, 231.5], A0 = [-415.2, 231.5], B0 = [-337.5, 187.3];
const ARM = Math.hypot(A0[0] - P[0], A0[1] - P[1]);         // 50.0 mm
const LINK = Math.hypot(A0[0] - B0[0], A0[1] - B0[1]);      // 89.39 mm
export const LINKAGE = { P, A0, B0, arm: ARM, link: LINK, offset: P[1] - B0[1] };

/** Arm angle about STEP +Z (rad), 0 in the CAD pose, for slider travel t (mm, + = jaw opening,
 *  slider moving toward the rear). Positive = wheel steered left. NaN past the toggle point. */
export function steerAt(t) {
  const bx = B0[0] + t, by = B0[1];
  const dx = bx - P[0], dy = by - P[1], d = Math.hypot(dx, dy);
  const k = (d * d + ARM * ARM - LINK * LINK) / (2 * ARM * d);
  if (k > 1 || k < -1) return NaN;
  return Math.atan2(dy, dx) + Math.acos(k);
}
/** Link rotation about STEP +Z (rad) relative to the CAD pose, for travel t. */
export function linkTurnAt(t) {
  const th = steerAt(t);
  const ax = P[0] + ARM * Math.cos(th), ay = P[1] + ARM * Math.sin(th);
  const phi = Math.atan2(ay - B0[1], ax - (B0[0] + t));
  return phi - PHI0;
}
const PHI0 = Math.atan2(A0[1] - B0[1], A0[0] - B0[0]);
/** Where the link and the arm come into line (no solution past it), in mm of opening. */
export const TOGGLE = (() => { let lo = 0, hi = 20; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Number.isNaN(steerAt(m))) hi = m; else lo = m; } return lo; })();
/** d(steer)/dt in degrees per mm, numerically. */
export function sensitivity(t) {
  const h = 0.005;
  const a = steerAt(Math.max(-2.5, t - h)), b = steerAt(Math.min(TOGGLE - 1e-4, t + h));
  return ((b - a) / (Math.min(TOGGLE - 1e-4, t + h) - Math.max(-2.5, t - h))) * (180 / Math.PI);
}
/** Opening travel (mm, >= 0) that steers right by |rad|. */
export function travelForRight(rad) {
  const want = Math.abs(rad);
  let lo = 0, hi = TOGGLE - 1e-4;
  if (-steerAt(hi) < want) return hi;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (-steerAt(m) < want) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------- driving a constant-steering arc
// Track frame: x from the start point toward the target, y sideways toward the cans. The car sets
// its steering once and holds it, so its rear axle drives a circle of curvature k = tan(steer) / wheelbase
// (bicycle model, no slip). It starts at the origin heading alpha toward the cans and turns back.

/** Planned run for a pass offset h (m) at the bonus line: the arc through start, (d/2, h) and target. */
export function planForOffset(d, h) {
  if (h <= 1e-6) return { k: 0, alpha: 0, s: d, R: Infinity };
  const R = (h * h + (d / 2) ** 2) / (2 * h);
  const alpha = Math.asin(d / (2 * R));
  return { k: 1 / R, alpha, s: 2 * R * alpha, R };
}
/** Planned run for a steering angle (rad) on a car with wheelbase wb. null when the arc is too tight to reach the target. */
export function planForSteer(d, steer, wb) {
  const k = Math.tan(Math.abs(steer)) / wb;
  if (k < 1e-9) return { k: 0, alpha: 0, s: d, R: Infinity, h: 0 };
  const R = 1 / k;
  if (d > 2 * R) return null;
  const alpha = Math.asin(d / (2 * R));
  return { k, alpha, s: 2 * R * alpha, R, h: R - Math.sqrt(R * R - (d / 2) ** 2) };
}
/** Pose after arc length s: [x, y, heading]. */
export function poseAt(alpha, k, s) {
  const psi = alpha - k * s;
  if (Math.abs(k * s) < 1e-7) return [s * Math.cos(alpha) + 0.5 * k * s * s * Math.sin(alpha), s * Math.sin(alpha) - 0.5 * k * s * s * Math.cos(alpha), psi];
  return [(Math.sin(alpha) - Math.sin(psi)) / k, (Math.cos(psi) - Math.cos(alpha)) / k, psi];
}
/** Points along the arc (n segments). */
export function arcPoints(alpha, k, s, n = 80) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(poseAt(alpha, k, (s * i) / n));
  return out;
}
/** Where the path crosses x = X: { y, psi } or null if it stops short. */
export function crossing(alpha, k, s, X) {
  if (poseAt(alpha, k, s)[0] < X) return null;
  let lo = 0, hi = s;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (poseAt(alpha, k, m)[0] < X) lo = m; else hi = m; }
  const p = poseAt(alpha, k, (lo + hi) / 2);
  return { y: p[1], psi: p[2] };
}
/** Does the car clear the can gap at the bonus line? Returns 'between', 'inner' (hits or passes
 *  inside the inner can), 'outer' (hits or passes outside the outer can), or 'short'. */
export function canCheck(cross, gap) {
  if (!cross) return 'short';
  const half = WIDTH / 2 / Math.max(0.2, Math.cos(cross.psi));
  if (cross.y - half < OUTER_CAN - gap) return 'inner';
  if (cross.y + half > OUTER_CAN) return 'outer';
  return 'between';
}
/** One run: steering (rad, signed so + turns back toward the line), wheelbase, aim and length fixed by the plan. */
export function runWith(plan, d, steer, wb) {
  const k = Math.tan(steer) / wb;
  const end = poseAt(plan.alpha, k, plan.s);
  return { k, R: Math.abs(k) < 1e-9 ? Infinity : 1 / k, end, miss: Math.hypot(end[0] - d, end[1]), cross: crossing(plan.alpha, k, plan.s, d / 2) };
}

// Easing for scroll-driven modules (see tools/pages/README.md, "Patterns that keep it smooth").
//
//   import { smooth, smoother, blendIn, BLEND } from '/assets/js/lib/ease.js';
//   const k = blendIn(stepP);   // 0..1: how far this step's camera view has come in from the last
//
// smoother (quintic) starts and ends with zero speed AND zero acceleration, so a camera move eases
// in and out instead of setting off with a jolt; smooth (cubic) is the classic smoothstep.
// A camera view blends over the first BLEND (60 %) of its step's pinned scroll, then holds.
export const BLEND = 0.6;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** Cubic smoothstep of x between a and b. */
export function smooth(a, b, x) { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
/** Quintic smootherstep of x between a and b: zero speed and acceleration at both ends. */
export function smoother(a, b, x) { const t = clamp01((x - a) / (b - a)); return t * t * t * (t * (6 * t - 15) + 10); }
/** How far a step's view has blended in from the step before, from its stepP (0..1). */
export function blendIn(stepP, end = BLEND) { return smoother(0, end, stepP); }

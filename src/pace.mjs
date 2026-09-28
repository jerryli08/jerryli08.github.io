// Scroll pace of every scroll animation, in one place (framework agent; Jerry, Sept 27, 21:12:
// "as a blanket rule slow down everything by 2x, then if it feels too slow I will let you know").
// Page files never tune speed with stepHeight or length; they change here.
//
// A factor is how much scrolling a step's animation plays over, as a multiple of round 3 (Sept 27
// afternoon, when the step cards started pinning): 2 means twice the scroll for the same motion.
//   - Steps: round 3 played step i over its pinned range, max(slot / 2, slot - card - gap), where
//     slot is the section's stepHeight (default 80vh). The runtime now pins each card for
//     factor x that range and adds the card's own height and the gap on top, so the hand-off to the
//     next card is as long as before and only the animation gets longer. At 2 every step plays over
//     at least its whole stepHeight, the distance it had before the cards pinned (commit 91abdbd).
//   - No steps: round 3 played the whole animation over `length` minus the stage's height; that
//     part is multiplied by the factor.
// With reduced motion the factor is capped at 1 (the modules show one still pose per step, so a
// longer pin would only be more scrolling past a still picture).
//
// PAGES: a number for the whole page, or { default, <scrolly id>: factor } per section.

export const DEFAULT = 2;

export const PAGES = {
  // Drone on Wheels felt about right: about 1.5x as long there (Jerry)
  'hybrid-vehicle': 1.5,
  // Replac3d: "at least 2x longer because the motions are big"
  'build-plate-robot': 3,
  // Morph: "How the planner searches" (#checks) is far too fast; the servo chain (#servos) is the
  // same kind of flow chart with as many boxes over a shorter pin (4: about as much scroll per box)
  morph: { default: 2, checks: 3, servos: 4 },
  // Golden Retriever: far too fast, at least the default
  'golden-retriever': 2,
};

/** The pace factor of one scrolly: page slug and the section's id. */
export function paceOf(slug, id) {
  const p = PAGES[slug];
  const f = p == null ? DEFAULT : typeof p === 'number' ? p : (p[id] ?? p.default ?? DEFAULT);
  return Number.isFinite(+f) && +f > 0 ? +f : DEFAULT;
}

// Example scrolly for src/pages/_example.mjs: scrolling orbits the camera around the rover,
// then a section plane cuts through the docking latch and the latch parts light up.
// setProgress(p, step, stepP) gets the section's progress 0..1, the active step and how far
// through that step the reader is; everything here is a pure function of those, so scrolling
// back and forth always shows the same picture.
import { createStage } from '/assets/js/lib/stage.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false }); // the page scroll drives the camera
  const rover = await stage.load('/assets/models/rover.glb');
  const { box } = stage.bounds(rover);
  // the latch parts, by their CAD names (tools/optimize-cad.mjs keeps moving parts named)
  const latch = stage.part(/Component9|Component8|passive_latch_doors|Spur_Gear|Component43|SERVO_ARM_HORN/);
  const latchBox = stage.bounds(latch).box;
  const cutX = (latchBox.min.x + latchBox.max.x) / 2; // through the middle of the latch arms
  // keeps x <= constant; parked just past the model so nothing is cut at first
  const cut = stage.sectionPlane([-1, 0, 0], box.max.x + 0.01);
  let unlight = null;

  function setProgress(p, step) {
    // phones: the step cards cover the bottom of the stage, so lift the picture
    const portrait = el.clientHeight > el.clientWidth;
    stage.setShift(portrait ? 0 : 0.14, portrait ? 0.18 : 0);
    // orbit once around, ending on the +X side, which faces the cut
    const az = lerp(35, 90 + 360, smooth(0, 0.62, p));
    const el0 = 18 + 10 * Math.sin(Math.min(1, p / 0.62) * Math.PI);
    const whole = stage.frame(rover, { azimuth: az, elevation: el0, apply: false });
    const close = stage.frame(latch, { azimuth: az, elevation: 24, pad: 1.9, apply: false });
    const z = smooth(0.62, 0.9, p);
    stage.setView({ pos: whole.pos.clone().lerp(close.pos, z), target: whole.target.clone().lerp(close.target, z) });
    cut.set(lerp(box.max.x + 0.01, cutX, smooth(0.4, 0.75, p)));
    if (step >= 3 && !unlight) unlight = stage.highlight(latch, '#ffb45c', { intensity: 0.7 });
    if (step < 3 && unlight) { unlight(); unlight = null; }
  }
  setProgress(0, 0);
  return { setProgress, dispose: () => stage.dispose() };
}

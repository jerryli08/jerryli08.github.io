// Main scrolly: the real linkage from my CAD draws "Jerry Li" and then the square as the reader
// scrolls. The scroll sets the program time; at each time the pen target is what my final sketch
// (cartesianPathing.ino) computes on the straight line between two path entries, my inverse
// kinematics turns it into the two motor angles, and every part turns about its real axis to match
// (rig.js). The ink appears behind the pen, the fold line (where the forearms line up) is drawn on
// the page, and the readout shows the numbers the Arduino works with.
//
// "Jerry Li" is the exact path in cartesianPathing.ino. The square is the one in cartesianTest.ino
// (my first x-y program), run here through the final program's loop: straight lines in x-y,
// inverse kinematics on every pass.
//
// The picture is a pure function of (step, progress through the step): scrolling back undraws it.
import * as K from './kin.js';
import { byId } from './shapes.js';
import { setup } from './base.js';
import { COLORS } from './rig.js';

const NAME = K.timeline(byId.name.path);
const SQUARE = K.timeline(byId.square.path);

// the drawing regions, in code mm: [x0, x1, y0, y1]
const VIEWS = {
  home: { region: [-35, 125, -25, 190], az: 128, el: 30, pad: 1.7, padPhone: 1.12 },
  name: { region: [-40, 120, 40, 195], az: 96, el: 70, pad: 1.85, padPhone: 1.3 },
  square: { region: [-40, 150, -25, 190], az: 96, el: 64, pad: 1.75, padPhone: 1.15 },
  fold: { region: [-15, 190, 25, 125], az: 100, el: 66, pad: 2.2, padPhone: 1.1 },
};

// each step: which drawing, from which path entry to which, and the view
const STEPS = [
  { view: 'home', tl: NAME, e: [0, 0] },
  { view: 'name', tl: NAME, e: [0, 12] }, // to the start, then J and e
  { view: 'name', tl: NAME, e: [12, 21] }, // r, r
  { view: 'name', tl: NAME, e: [21, 30] }, // y, down to y = 100
  { view: 'name', tl: NAME, e: [30, 39] }, // L, i, home
  { view: 'square', tl: SQUARE, e: [0, 2] }, // home, top edge
  { view: 'fold', tl: SQUARE, e: [2, 3], slow: 80 }, // right edge, down through the fold line
  { view: 'square', tl: SQUARE, e: [3, 6] }, // bottom edge, left edge, home
];

export async function mount(el, ctx) {
  const B = await setup(el, ctx, { views: VIEWS });
  const { stage, page, hud, L, ov } = B;
  const dashed = (tl) => {
    const m = page.mat(COLORS.path, 0.32);
    const mesh = page.ribbon(page.fine(tl.path.map((e) => [e[0], e[1]])), 0.45, m, { dash: [1.6, 1.4] });
    return { set opacity(a) { m.opacity = a; mesh.visible = a > 0.01; } };
  };
  const pathMat = dashed(NAME), sqMat = dashed(SQUARE);
  const ink = { name: page.trace(NAME), square: page.trace(SQUARE) };

  // program time on a step's stretch of path: a short hold at each end so the finished strokes can
  // be read; a `slow` step spends half its scroll on the last few mm before an entry (the fold)
  function timeIn(s, stepP) {
    const [a, b] = s.e;
    const t0 = s.tl.timeOfEntry(a), t1 = s.tl.timeOfEntry(b);
    let g = K.clamp((stepP - 0.08) / 0.84, 0, 1);
    if (s.slow) {
      // from (87.5, 150) down to (87.5, 75): reach y = slow quickly, then crawl across the fold line
      const A = s.tl.path[a], Bp = s.tl.path[b];
      const fs = (A[1] - s.slow) / (A[1] - Bp[1]);
      g = g < 0.4 ? (g / 0.4) * fs : fs + ((g - 0.4) / 0.6) * (1 - fs);
    }
    return K.lerp(t0, t1, g);
  }

  function setProgress(p, step, stepP) {
    step = K.clamp(step | 0, 0, STEPS.length - 1);
    const s = STEPS[step], prev = STEPS[Math.max(0, step - 1)];
    const k = step === 0 || B.reduced ? 1 : K.smooth(0, 0.45, stepP);
    stage.setShift(...B.shift());
    B.place(prev.view, s.view, k, B.reduced ? 0 : (stepP - 0.5) * 0.03);

    const t = timeIn(s, stepP);
    const a = s.tl.at(t);
    const pose = B.poseAt(a.x, a.y);
    hud.show(s.tl, t, pose);

    // the ink: the name stays until the square starts, then the page clears
    const onSquare = s.tl === SQUARE;
    const clear = onSquare ? (step === 5 ? K.smooth(0, 0.18, stepP) : 1) : 0;
    ink.name.set(onSquare ? NAME.length : a.s);
    ink.name.fade(1 - clear);
    ink.square.set(onSquare ? a.s : 0);
    ink.square.fade(1);
    pathMat.opacity = 0.32 * (1 - clear);
    sqMat.opacity = 0.32 * clear;

    L.left.a = L.right.a = step === 0 ? 1 : 0;
    L.pen.a = step === 0 || step === 6 ? 1 : 0.0;
    L.fold.a = step === 0 || step >= 5 ? 1 : 0;
    ov.update();
    stage.invalidate(false);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose?.(); stage.dispose(); } };
}

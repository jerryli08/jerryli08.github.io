// The shape library (Jerry's checklist): each step runs one drawing on the real linkage, the same
// way the final sketch runs "Jerry Li": the x-y target moves along straight lines between the path
// entries, and my inverse kinematics turns every target into the two motor angles. The chips across
// the top of the readout are the library; the one being drawn is lit. "Jerry Li" and the square are
// the exact paths from my code and are drawn in the block above; the other five are new, drawn in
// one continuous line (the real plotter has no pen lift) and placed in the stiff middle of the
// workspace, well clear of the fold line. Pure function of the scroll.
import * as K from './kin.js';
import { SHAPES, byId } from './shapes.js';
import { setup } from './base.js';
import { COLORS } from './rig.js';

const RUN = ['circle', 'heart', 'triangle', 'house', 'uiuc'];
const TL = Object.fromEntries(RUN.map((id) => [id, K.timeline(byId[id].path)]));
const VIEWS = {
  lib: { region: [-10, 110, 40, 195], az: 94, el: 72, pad: 1.8, padPhone: 1.3 },
};

export async function mount(el, ctx) {
  const B = await setup(el, ctx, { views: VIEWS, library: SHAPES });
  const { stage, page, hud, L, ov } = B;
  const draw = RUN.map((id) => {
    const m = page.mat(COLORS.path, 0.3);
    const mesh = page.ribbon(page.fine(TL[id].path.map((e) => [e[0], e[1]])), 0.45, m, { dash: [1.6, 1.4] });
    const path = { set opacity(a) { m.opacity = a; mesh.visible = a > 0.01; } };
    return { id, tl: TL[id], ink: page.trace(TL[id]), path };
  });

  function setProgress(p, step, stepP) {
    step = K.clamp(step | 0, 0, draw.length - 1);
    stage.setShift(...B.shift());
    B.place('lib', 'lib', 1, B.reduced ? 0 : (p - 0.5) * 0.06);
    const d = draw[step];
    // a clean page for each drawing: the last one fades while the linkage leaves home
    const t = K.lerp(0, d.tl.total, K.clamp((stepP - 0.1) / 0.8, 0, 1));
    const a = d.tl.at(t);
    const pose = B.poseAt(a.x, a.y);
    hud.show(d.tl, t, pose);
    hud.chips(d.id, ['name', 'square', ...RUN.slice(0, step)]);
    const fadeIn = step === 0 ? 1 : K.smooth(0, 0.12, stepP);
    draw.forEach((x, i) => {
      if (i === step) { x.ink.set(a.s); x.ink.fade(1); x.path.opacity = 0.3 * fadeIn; }
      else if (i === step - 1) { x.ink.set(x.tl.length); x.ink.fade(1 - fadeIn); x.path.opacity = 0; }
      else { x.ink.set(0); x.ink.fade(0); x.path.opacity = 0; }
    });
    L.left.a = L.right.a = 0;
    L.pen.a = 0;
    L.fold.a = 1;
    ov.update();
    stage.invalidate(false);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose?.(); stage.dispose(); } };
}

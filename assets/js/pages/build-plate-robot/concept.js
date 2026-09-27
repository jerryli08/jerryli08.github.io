// "From linear rails to drawer slides", scroll-driven: the February 2024 rail concept next to the
// final arm, both from my CAD at the same scale, run through their reach by the scroll. It replaces
// the reach slider; there is nothing to drag.
// Concept (replac3d_original_mgn_rail_concept): two MGN12 rails, 450 mm, with one carriage block
// each; the magnet plate is bolted to the blocks at its back end, so the blocks and plate travel
// 405 mm along the rails (-Z), which puts the magnets over the target plate. Final: the carriage on
// two three-member telescoping slides, 355 mm. Two views, each framed once at full reach: the
// three-quarter view of both, and a side view of the concept the camera swings round to while the
// third step plays (the final arm fades out behind it), so its plate is seen side on, hanging past
// the rail ends from the blocks at its back. The fourth step swings back and lights the final slides.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRig, STROKE, clamp, smooth, lerp, readout, glow, blendView, inward } from './rig.js';

const CONCEPT = '/assets/models/build-plate-robot/concept.glb';
const C_STROKE = 0.405;   // m: blocks from z 687 to 282 mm, the front end of the rails
const C_SHIFT = [-0.42, 0, -0.402]; // place the concept beside the final arm, rail fronts level with the frame front
const SIDE_AZ = -84, SIDE_EL = 14;  // the side view: from the concept's outer side (-X), nearly level
const FADED = 0;                    // the final arm while the camera looks at the concept side on (gone)

// reach (fraction of each stroke) through the steps: side by side, running out, the concept side on,
// the final arm's slides, back in
function reachAt(step, q) {
  if (step === 0) return 0;
  if (step === 1) return smooth(0.05, 0.85, q);
  if (step === 2 || step === 3) return 1;
  return 1 - smooth(0.1, 0.8, q);
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const { P } = rig;
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'PSU', 'BAY_L', 'BAY_R', 'BASE', 'NEMA23', 'TPUL', 'BELT', 'MIDPLATE', 'RING', 'THR_UP', 'THR_LO', 'MR106']) P[n].visible = false;
  // the stock plate stays: it marks the printer plate the final arm reaches

  const concept = await stage.load(CONCEPT);
  concept.position.set(...C_SHIFT);
  concept.updateMatrixWorld(true);
  const moving = stage.part(/_G_MOVE$/, concept);   // the magnet plate and both carriage blocks
  const carried = stage.part(/_G_CARRIED$/, concept); // the plate under the magnets
  carried.forEach((o) => { o.visible = false; });
  const slideC = new T.Group();
  concept.add(slideC);
  for (const o of moving) slideC.attach(o);
  stage.fitGround();

  // two views, framed once at full reach (so nothing is re-framed while they move): both arms, and
  // the concept alone from the side
  const all = [concept, P.ROT, P.EXT, P.STOCK];
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      const keep = slideC.position.z, keepS = rig.state.s;
      rig.set({ s: STROKE }); slideC.position.z = -C_STROKE; rig.turret.updateMatrixWorld(true); concept.updateMatrixWorld(true);
      views = {
        main: stage.frame(all, { azimuth: 38, elevation: 34, pad: a < 1 ? 1.0 : 1.14, apply: false, refresh: true }),
        side: stage.frame(concept, { azimuth: SIDE_AZ, elevation: SIDE_EL, pad: a < 1 ? 1.12 : 1.08, apply: false, refresh: true }),
      };
      slideC.position.z = keep; rig.set({ s: keepS });
    }
    return views;
  }

  // labels at fixed points (measured at rest): the concept's rails, and the final frame's slides
  const bc = stage.bounds(concept, true).box, bf = stage.bounds([P.ROT], true).box;
  const bm = stage.bounds(moving, true).box.clone(); // the plate and blocks, retracted
  const back = new T.Vector3((bm.min.x + bm.max.x) / 2, bm.max.y, bm.max.z - 0.02); // where the blocks hold it
  const tip = new T.Vector3(bm.min.x + 0.01, bm.max.y, bm.min.z + 0.01);       // the plate's front, near side
  const ov = labelLayer(stage);
  const L = {
    concept: ov.label('Feb 2024: two MGN12 rails', [(bc.min.x + bc.max.x) / 2, bc.max.y, bc.max.z - 0.03], { color: '#fff1e2' }),
    final: ov.label('Final: a telescoping slide on each side', [bf.max.x, bf.max.y, bf.max.z - 0.05], { color: '#fff1e2', minW: 460 }),
    blocks: ov.label('Plate held only at its back', back.toArray(), { color: '#ff6b35' }),
    tip: ov.label('About 400 mm past the rail ends', tip.toArray(), { color: '#fff1e2' }),
  };
  const blockGlow = glow(stage, moving, '#ff6b35', 0.6);
  const slideGlow = glow(stage, [P.MID], '#3d8bff', 0.8);
  const fadeFinal = (o) => { rig.fade(rig.turret, o); rig.fade(P.STOCK, o); };

  const hud = readout(ov, `
    <table class="num"><thead><tr><th></th><th>Reach</th></tr></thead><tbody>
      <tr><td>Concept <small>MGN12 rails, 450 mm</small></td><td data-k="c"></td></tr>
      <tr><td>Final <small>telescoping slides, 400 mm</small></td><td data-k="f"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Concept plate past the rail ends</span><b class="num" data-k="co"></b></div>`);

  const reduced = !!ctx.reducedMotion;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 4);
    const [fx, fy] = ctx.shift();
    stage.setShift(fx ? fx + 0.05 : 0, fy); // a little further right: the two arms are wide
    const q = reduced ? 1 : clamp(stepP, 0, 1);
    const k = reduced ? reachAt(step, 1) : reachAt(step, q);
    slideC.position.z = -C_STROKE * k;
    rig.set({ s: STROKE * k });
    // the camera swings round to the concept's side while the third step plays, and back for the fourth
    const v = viewsNow();
    const toSide = reduced ? (step === 2 ? 1 : 0) : step === 2 ? smooth(0, 0.55, q) : step === 3 ? 1 - smooth(0, 0.5, q) : 0;
    stage.setView(toSide <= 0 ? v.main : toSide >= 1 ? v.side : blendView(v.main, v.side, toSide));

    // the final arm fades out behind the concept while the camera is at its side; its slides glow
    // (blue) only once it is back at full opacity, so a glow and a fade never act on the same part
    const fin = reduced ? (step === 2 ? FADED : 1) : step === 2 ? lerp(1, FADED, smooth(0.05, 0.5, q)) : step === 3 ? lerp(FADED, 1, smooth(0, 0.4, q)) : 1;
    const slides = reduced ? (step === 3 ? 1 : 0) : step === 3 ? smooth(0.45, 0.8, q) : step === 4 ? 1 - smooth(0, 0.3, q) : 0;
    if (slides > 0) { fadeFinal(1); slideGlow(slides); } else { slideGlow(0); fadeFinal(fin); }
    // the blocks light up side on, and stay lit while the final slides are compared with them
    const lit = reduced ? (step === 2 || step === 3 ? 1 : 0) : step === 2 ? smooth(0.3, 0.7, q) : step === 3 ? 1 : step === 4 ? 1 - smooth(0, 0.3, q) : 0;
    blockGlow(lit);
    const side = step === 2 ? smooth(0.45, 0.8, reduced ? 1 : q) : step === 3 ? 1 - smooth(0, 0.3, reduced ? 1 : q) : 0;
    L.concept.a = (1 - 0.6 * lit) * (1 - side); L.final.a = Math.min(fin, 1 - side); L.blocks.a = lit;
    L.tip.a = side;
    L.blocks.p.copy(back).z -= C_STROKE * k;
    L.tip.p.copy(tip).z -= C_STROKE * k;

    // the magnet plate front starts at z 284 mm, the rail front at 282 mm
    const cMm = C_STROKE * k * 1000, fMm = STROKE * k * 1000, past = Math.max(0, cMm - 2);
    hud.put('c', `${Math.round(cMm)} mm`); hud.put('f', `${Math.round(fMm)} mm`);
    hud.put('co', `${Math.round(past)} mm`);
    hud.put('mini', `Reach: concept ${Math.round(cMm)} mm, final ${Math.round(fMm)} mm`);
    ov.update();
    inward(el, ov.labels, [hud.el]);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

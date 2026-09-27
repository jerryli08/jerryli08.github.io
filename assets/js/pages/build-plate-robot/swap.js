// Scrolly: one full plate swap on Jerry's CAD, driven by the page scroll.
// The picture is a pure function of (step, stepP): turntable angle, reach, magnets, where each
// plate is and the camera all come from the timeline below, so scrolling back plays it backwards.
// Plate A (the used plate) is "FILLETED Bambu Build Plate:3", moved into the printer; plate B (the
// fresh one) is ":1" on the -X holder; the +X holder starts empty. The same order as the firmware:
// retrieve() at the printer, deposit() to the right-hand holder, pickup() from the left, replace().
import { createStage } from '/assets/js/lib/stage.js';
import { loadRig, STROKE, clamp, smooth, lerp, hud, note, blendView } from './rig.js';

const BED_UP = 0.15; // m. The printer's bed is not in the CAD; the plate shows it dropping to the bottom.

// Mechanism timeline in t = step + stepP (10 steps, t from 0 to 10)
function poseAt(t) {
  const seg = (a, b) => smooth(a, b, t);
  let theta = 0, s = 0;
  s += STROKE * (seg(1.15, 1.8) - seg(3.15, 3.8));
  theta += -90 * seg(4.15, 4.8);
  s += STROKE * (seg(5.1, 5.4) - seg(5.6, 5.9));
  theta += 180 * seg(6.15, 6.85);
  s += STROKE * (seg(7.1, 7.4) - seg(7.6, 7.9));
  theta += -90 * seg(8.15, 8.8);
  s += STROKE * (seg(9.1, 9.35) - seg(9.55, 9.8));
  const mag = clamp(seg(2.1, 2.4) - seg(5.45, 5.55) + seg(7.45, 7.55) - seg(9.4, 9.5), 0, 1);
  const bed = BED_UP * (1 - seg(0.25, 0.8));
  return { theta, s, mag, bed,
    a: t < 2.25 ? 'printer' : t < 5.5 ? 'carried' : 'holder',
    b: t < 7.5 ? 'holder' : t < 9.45 ? 'carried' : 'printer' };
}
// the end pose of each step (reduced motion shows only these)
const STEP_END = [0.95, 1.95, 2.95, 3.95, 4.95, 5.95, 6.95, 7.95, 8.95, 9.99];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const rig = await loadRig(stage);
  const { P } = rig;
  P.STOCK.visible = false;   // the stock plate: the finished machine runs on my steel plates
  P.PLATE_R.visible = false; // the empty holder
  const A = rig.carrier(P.PLATE_C, 0, 0);          // on the grasper in the CAD
  const B = rig.carrier(P.PLATE_L, 90, STROKE);    // on the -X holder in the CAD
  const aPrinter = A.at(0, STROKE), aHolder = A.at(-90, STROKE), bPrinter = B.at(0, STROKE), bHolder = B.at(90, STROKE);
  const up = (m, y) => m.clone().premultiply(new stage.THREE.Matrix4().makeTranslation(0, y, 0));

  const info = hud(el, [
    { key: 'theta', label: 'Turntable' },
    { key: 's', label: 'Reach' },
    { key: 'mag', label: 'Magnets' },
  ]);
  note(el, 'My CAD. The printer’s bed is not modeled, so only the plate moves with it.');

  // camera: one framed view per step, computed with the rig in that step's pose (and again on resize)
  const V = [
    { f: 'all', az: 38, el: 28, pad: 0.84 },
    { f: ['ROT', 'STOCK'], az: 60, el: 24, pad: 1.12 },
    { f: ['EXT', 'STOCK'], az: 12, el: 42, pad: 1.15 },
    { f: ['ROT', 'STOCK'], az: 55, el: 32, pad: 1.12 },
    { f: ['HOLDERS', 'ROT'], az: 20, el: 68, pad: 1.05 },
    { f: ['PLATE_R', 'ROT'], az: 62, el: 32, pad: 1.1 },
    { f: ['HOLDERS', 'ROT'], az: -20, el: 70, pad: 1.05 },
    { f: ['PLATE_L', 'ROT'], az: -62, el: 32, pad: 1.1 },
    { f: ['ROT', 'HOLDERS', 'PRINTER'], az: -40, el: 30, pad: 1.0 },
    { f: ['ROT', 'STOCK'], az: 60, el: 24, pad: 1.12 },
  ];
  let views = null, sized = '';
  function computeViews() {
    const keep = { ...rig.state };
    views = V.map((v, i) => {
      const p = poseAt(STEP_END[i]);
      rig.set({ theta: p.theta, s: p.s });
      rig.turret.updateMatrixWorld(true);
      const objs = v.f === 'all' ? rig.model : v.f.map((n) => P[n]);
      return stage.frame(objs, { azimuth: v.az, elevation: v.el, pad: v.pad, apply: false, refresh: true });
    });
    rig.set(keep);
  }

  let magOn = null, lastA = '', lastB = '';
  function setProgress(p, step, stepP) {
    const portrait = el.clientHeight > el.clientWidth;
    const key = `${el.clientWidth}x${el.clientHeight}`;
    if (key !== sized) { sized = key; stage.setShift(portrait ? 0 : 0.15, portrait ? 0.2 : 0); computeViews(); }
    const t = ctx.reducedMotion ? STEP_END[step] : clamp(step + stepP, 0, 9.999);
    const q = poseAt(t);
    rig.set({ theta: q.theta, s: q.s });

    // magnets glow while they are on
    if (q.mag > 0.02) magOn = stage.highlight(P.MAG, '#ff7a2f', { intensity: 0.25 + 0.75 * q.mag });
    else if (magOn) { magOn(); magOn = null; }

    // plates: at rest where they were left, or riding the carriage while the magnets hold them
    if (q.a === 'printer') A.put(up(aPrinter, q.bed));
    else if (q.a === 'carried') A.put(A.carried());
    else if (lastA !== 'holder') A.put(aHolder);
    if (q.b === 'holder') { if (lastB !== 'holder') B.put(bHolder); }
    else if (q.b === 'carried') B.put(B.carried());
    else if (lastB !== 'printer') B.put(bPrinter);
    lastA = q.a; lastB = q.b;

    // the printer turns see-through while the camera looks into it
    const inside = ctx.reducedMotion ? ([1, 2, 3, 9].includes(step) ? 1 : 0)
      : smooth(1, 1.3, t) - smooth(4, 4.3, t) + smooth(9, 9.3, t);
    rig.fade(P.PRINTER, lerp(1, 0.28, inside));

    // camera: ease from the previous step's view to this one over the first part of the step
    const k = ctx.reducedMotion ? 1 : smooth(0, 0.4, stepP);
    const view = step === 0 ? views[0] : blendView(views[step - 1], views[step], k);
    stage.setView(view);

    info.set({
      theta: `${q.theta.toFixed(0)}°`,
      s: `${(q.s * 1000).toFixed(0)} mm`,
      mag: q.mag > 0.5 ? ['On', true] : 'Off',
    });
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose: () => stage.dispose() };
}


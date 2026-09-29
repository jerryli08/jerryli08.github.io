// Scrolly: one full plate swap on Jerry's CAD, driven by the page scroll.
// The picture is a pure function of (step, stepP): turntable angle, reach, magnets, where each
// plate is and the camera all come from the timeline below, so scrolling back plays it backwards.
// Plate A (the used plate) is "FILLETED Bambu Build Plate:3", moved into the printer; plate B (the
// fresh one) is ":1" on the -X holder; the +X holder starts empty. The same order as the firmware:
// retrieve() at the printer, deposit() to the right-hand holder, pickup() from the left, replace().
// The camera views are framed once per stage shape, each with the rig parked in its step's end pose,
// and blended; nothing is framed on a moving part. The two extension belts (belt.js, drawn along the
// path the CAD's pulleys, idlers and clamps set) ride with the arm and glow while they drive it.
// The finished print on plate A is a 3DBenchy (Jerry, Sept 28): the official single-part STL by
// Creative Tools (public domain), unmodified and at true scale (60.0 x 31.0 x 48.0 mm), in blue
// PLA, standing at the plate's centre and parented to it, so it leaves the printer with the plate
// and stays on it in the holder; plate B goes in empty. The centre of the plate is clear of the
// carriage, the arm's frame and the printer through the whole swap (checked on the CAD: nothing
// above the plate within 85 mm of its centre across the arm, up to 50 mm high, over the whole stroke).
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRig, STROKE, clamp, smooth, lerp, readout, glow, blendView } from './rig.js';

const BED_UP = 0.15; // m. The printer's bed is not in the CAD; the plate shows it dropping to the bottom.
const BENCHY = '/assets/models/build-plate-robot/benchy.glb'; // converted by benchy2glb.mjs (r5 notes)

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
// which function of the final sketch (finalWorking08-23-2024.ino) each step belongs to
const FN = ['waiting for the button', 'retrieve()', 'retrieve()', 'retrieve()', 'deposit()', 'deposit()', 'pickup()', 'pickup()', 'replace()', 'replace()'];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const rig = await loadRig(stage);
  const { P } = rig;
  P.STOCK.visible = false;   // the stock plate: the finished machine runs on my steel plates
  P.PLATE_R.visible = false; // the empty holder
  const A = rig.carrier(P.PLATE_C, 0, 0);          // on the grasper in the CAD
  const B = rig.carrier(P.PLATE_L, 90, STROKE);    // on the -X holder in the CAD
  const aPrinter = A.at(0, STROKE), aHolder = A.at(-90, STROKE), bPrinter = B.at(0, STROKE), bHolder = B.at(90, STROKE);
  const up = (m, y) => m.clone().premultiply(new stage.THREE.Matrix4().makeTranslation(0, y, 0));

  // the print on plate A, loaded after the rig so the swap goes live first; it rides on the plate
  stage.load(BENCHY, { add: false, finish: 'printed' }).then((benchy) => {
    const T = stage.THREE, plate = P.PLATE_C;
    plate.updateWorldMatrix(true, false);
    const box = new T.Box3();
    plate.traverse((m) => { if (m.isMesh) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(m === plate ? new T.Matrix4() : m.matrix)); } });
    // the plate's own frame carries its quantization scale: undo it so the boat stays true size
    const k = new T.Vector3().setFromMatrixScale(rig.model.matrixWorld).x / new T.Vector3().setFromMatrixScale(plate.matrixWorld).x;
    benchy.scale.setScalar(k);
    benchy.position.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2); // on the plate's top face, centred
    benchy.rotation.y = Math.PI; // bow toward -X, across the arm
    benchy.name = 'benchy';
    plate.add(benchy);
    stage.invalidate();
  }).catch(() => {});

  const ov = labelLayer(stage);
  const hud = readout(ov, `
    <div class="rx-hud-row"><span>Sketch</span><b data-k="fn"></b></div>
    <table class="num"><tbody>
      <tr><td>Turntable</td><td data-k="theta"></td></tr>
      <tr><td>Reach <small>355 mm stroke</small></td><td data-k="s"></td></tr>
      <tr><td>Magnets</td><td data-k="mag"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);

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

  const magGlow = glow(stage, P.MAG, '#ff7a2f', 1);
  const beltGlow = glow(stage, rig.belts, '#ff9a4a', 0.7);
  const beltLab = ov.label('GT2 belt, open loop, one per side', [0, 0, 0], { color: '#fff1e2', minW: 420 });
  const beltAt = new stage.THREE.Vector3();
  let lastA = '', lastB = '';
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, V.length - 1);
    stage.setShift(...ctx.shift());
    const key = `${el.clientWidth}x${el.clientHeight}`;
    if (key !== sized) { sized = key; computeViews(); }
    const t = ctx.reducedMotion ? STEP_END[step] : clamp(step + stepP, 0, 9.999);
    const q = poseAt(t);
    rig.set({ theta: q.theta, s: q.s });

    // magnets glow while they are on; the belts while they drive the arm (by its speed along the timeline)
    magGlow(q.mag > 0.02 ? 0.25 + 0.75 * q.mag : 0);
    const ds = ctx.reducedMotion ? 0 : Math.abs(poseAt(Math.min(9.999, t + 0.02)).s - poseAt(Math.max(0, t - 0.02)).s);
    beltGlow(clamp(ds / 0.012, 0, 1));
    rig.turret.updateMatrixWorld(true);
    rig.beltAnchor.outerR.getWorldPosition(beltAt);
    beltLab.p.copy(beltAt);
    beltLab.a = ctx.reducedMotion ? (step === 1 ? 1 : 0) : smooth(1.1, 1.35, t) - smooth(3.6, 3.9, t);

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

    const deg = `${Math.round(q.theta)}°`, mm = `${Math.round(q.s * 1000)} mm`, mag = q.mag > 0.5 ? 'On' : 'Off';
    hud.put('fn', FN[step]);
    hud.put('theta', deg); hud.put('s', mm); hud.put('mag', mag);
    hud.put('mini', `Turntable ${deg}, reach ${mm}, magnets ${mag.toLowerCase()}`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}


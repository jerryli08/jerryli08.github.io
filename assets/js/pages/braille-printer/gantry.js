// The gantry, axis by axis, driven by the scroll. My team's CAD moving along its real axes: Y slides
// the beam and everything on it along the side rails, X slides the servo carriage along the beam,
// and the motor shafts, the X pulley, the floss spools and the idler rollers turn with the travel
// they drive (20-tooth GT2 pulley: 40 mm per turn; spool drum radius 15.47 mm: 97.2 mm per turn).
// The floss (white) and the pin's trace (orange) are drawn: the floss is not in the CAD, but the
// photos show it running along both side rails. Every picture is a pure function of the scroll.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadPrinter, views, partRx, G, clamp, smooth, lerp } from './rig.js';

const ACCENT = '#ff6b35';
const [YMIN, YMAX] = [-0.105, 0.1], [XMIN, XMAX] = [-0.07, 0.1]; // inside the travel the CAD allows
// piecewise-smooth keyframes: [[f, value], ...] -> value at f
const keys = (K, f) => {
  for (let i = 1; i < K.length; i++) if (f <= K[i][0]) return lerp(K[i - 1][1], K[i][1], smooth(K[i - 1][0], K[i][0], f));
  return K[K.length - 1][1];
};
// what each step moves
const Y1 = [[0, 0], [0.12, 0], [0.45, YMAX], [0.85, YMIN], [1, YMIN]];
const Y2 = [[0, YMIN], [0.2, YMIN], [0.9, 0], [1, 0]];
const X3 = [[0, 0], [0.12, 0], [0.45, XMAX], [0.85, XMIN], [1, XMIN]];
// step 4: a rectangle, Y first, then X
const RECT = [[XMIN, 0], [XMIN, YMIN], [XMAX, YMIN], [XMAX, YMAX], [XMIN, YMAX], [XMIN, YMIN]];
const rectAt = (f) => {
  const n = RECT.length - 1, u = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(u)), t = smooth(0, 1, u - i);
  return { x: lerp(RECT[i][0], RECT[i + 1][0], t), y: lerp(RECT[i][1], RECT[i + 1][1], t) };
};

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const P = await loadPrinter(stage, { floss: true });
  const reduced = ctx.reducedMotion;

  const V = views(stage, el, {
    over: { box: [[-0.40, 0.304, -0.60], [0.03, 0.39, -0.02]], azimuth: -38, elevation: 30, pad: 1.0 },
    y: { box: [[-0.40, 0.304, -0.60], [0.03, 0.39, -0.02]], azimuth: -50, elevation: 22, pad: 1.1 },
    spool: { box: [[-0.33, 0.306, -0.075], [-0.25, 0.352, -0.06]], azimuth: 14, elevation: 14, pad: 1.5 },
    x: { box: [[-0.42, 0.335, -0.40], [0.045, 0.392, -0.30]], azimuth: -24, elevation: 24, pad: 1.05 },
    top: { box: [[-0.40, 0.304, -0.56], [0.03, 0.39, -0.06]], azimuth: -12, elevation: 62, pad: 1.05 },
  });
  const CAM = ['over', 'y', 'spool', 'x', 'top'];

  // a section through the spool's axis for step 2 (keeps z <= constant)
  const cut = stage.sectionPlane([0, 0, -1], 1);
  const CUT_AT = G.spool.z;

  // highlights by step (applied when the step changes)
  const Y_PARTS = stage.part(partRx('yCarriageR', 'yCarriageL', 'beam'), P.model);
  const X_PARTS = stage.part(partRx('xCarriage'), P.model);
  const SPOOLS = stage.part(partRx('ySpoolL', 'ySpoolR'), P.model);
  const XDRIVE = stage.part(partRx('xPulley'), P.model);
  const LIT = [[], [[Y_PARTS, 0.3], [SPOOLS, 0.5]], [[SPOOLS, 0.45]], [[X_PARTS, 0.3], [XDRIVE, 0.6]], []];
  let litStep = -1, unlit = [];
  const light = (step) => {
    if (step === litStep) return;
    litStep = step;
    unlit.forEach((f) => f()); unlit = [];
    for (const [parts, i] of LIT[step]) unlit.push(stage.highlight(parts, ACCENT, { intensity: i }));
  };

  // the pin's trace on the die for step 4 (drawn)
  const N = 400, trace = new Float32Array(N * 3);
  const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(trace, 3));
  for (let i = 0; i < N; i++) {
    const r = rectAt(i / (N - 1));
    trace.set([G.nose[0] + r.x, G.dieY + 0.0004, G.nose[2] + r.y], i * 3);
  }
  const tLine = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 }));
  tLine.frustumCulled = false; tGeo.setDrawRange(0, 0);
  P.model.add(tLine);

  const ov = labelLayer(stage);
  const L = {
    rail: ov.label('Side rail: 2020 extrusion, 400 mm', [-0.315, 0.335, -0.47], { color: '#fff1e2', side: 'l', minW: 520 }),
    beam: ov.label('Gantry beam', [0.0, 0.362, -0.33], { color: '#fff1e2', minW: 520 }),
    yL: ov.label('Y motor and floss spool', [-0.308, 0.349, -0.064], { color: '#fff1e2', side: 'l' }),
    yR: ov.label('Y motor and floss spool', [-0.042, 0.349, -0.064], { color: '#fff1e2', side: 'l', minW: 520 }),
    groove: ov.label('Two 4 mm grooves', [-0.312, 0.3284 + 0.0155, -0.064], { color: ACCENT, side: 'l' }),
    drum: ov.label('Drum, 15.5 mm radius', [-0.309, 0.3284, -0.064], { color: '#fff1e2' }),
    xm: ov.label('X motor', [-0.3865, 0.383, -0.33], { color: '#fff1e2', side: 'l', minW: 520 }),
    xp: ov.label('X motor, 20-tooth GT2 pulley', [-0.3865, 0.37, -0.33], { color: ACCENT }),
    xc: ov.label('Servo carriage', [-0.17, 0.39, -0.33], { color: '#fff1e2', minW: 520 }),
    rollers: ov.label('Idler rollers, 7 mm', [-0.309, 0.345, -0.5433], { color: '#fff1e2', side: 'l', minW: 520 }),
  };
  const SHOW = [['rail', 'beam', 'yL', 'xm', 'xc'], ['yL', 'yR', 'rollers'], ['groove', 'drum'], ['xp', 'xc'], []];

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, CAM.length - 1);
    stage.setShift(...ctx.shift());
    const k = reduced || step === 0 ? 1 : smooth(0, 0.45, stepP);
    V.place(CAM[Math.max(0, step - 1)], CAM[step], k, reduced ? 0 : (stepP - 0.5) * 0.06);

    let x = 0, y = 0;
    if (step === 1) y = keys(Y1, stepP);
    else if (step === 2) y = keys(Y2, stepP);
    else if (step === 3) x = keys(X3, stepP);
    else if (step === 4) { const r = rectAt(smooth(0.12, 0.92, stepP)); x = r.x; y = r.y; }
    P.set({ x, y, a: 0 });
    light(step);

    // the cut sweeps in through the spool, and back out
    const c = step === 2 ? lerp(-0.02, CUT_AT, smooth(0.05, 0.45, stepP)) : 1;
    cut.set(c);

    const f = step === 4 ? smooth(0.12, 0.92, stepP) : 0;
    const cnt = Math.round(f * (N - 1)) + (f > 0 ? 1 : 0), fl = step !== 3;
    if (cnt !== tGeo.drawRange.count || tLine.visible !== (step === 4) || P.floss.visible !== fl) {
      tGeo.setDrawRange(0, cnt); tLine.visible = step === 4; P.floss.visible = fl;
      stage.invalidate();
    }

    // labels ride with what they name
    const g = P.gy.position.z;
    L.beam.p.set(0.0, 0.362, -0.33 + g);
    L.xm.p.set(-0.3865, 0.383, -0.33 + g);
    L.xp.p.set(-0.3806, 0.37, -0.33 + g);
    L.xc.p.set(-0.165 + x, 0.392, -0.33 + g);
    for (const [key, l] of Object.entries(L)) {
      const on = SHOW[step].includes(key);
      const was = step > 0 && SHOW[step - 1].includes(key);
      l.a = on ? (was ? 1 : smooth(0.3, 0.55, stepP)) : 0;
    }
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

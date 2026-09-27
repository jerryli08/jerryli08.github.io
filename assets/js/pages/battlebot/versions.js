// Version 1 (CAD only) against version 2 (built), scroll-driven, both from Jerry's CAD at the same
// scale, version 1 always above (or on the left on a very wide stage). Four steps, one per change: the
// height (dimension marks), the frame (five parts to one), the blade (the two blades alone, from
// above, with their 112 mm swing) and the power switch (version 2 alone, from the back). The
// dimensions are measured on his two STEP files. Views are framed once with the robots at rest and
// blended by the scroll; every picture is a pure function of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, LIFT, TIP_R } from './rig.js';
import { clamp, smooth, lerp, toSph, blend, viewCache } from './views.js';

const ACCENT = '#ff6b35';
const GAP = 0.14;             // each robot's centre from the middle, side by side
const WHEEL_TOP = 0.048575;   // wheel radius 28.575 mm about the axle at 20 mm (model y, before the lift)
const DIMS = {                // measured on the STEP files (model y of the outer plate faces, before the lift)
  v1: { bot: -0.004, top: 0.044, stack: '48.0 mm', proud: '4.6 mm', bladeY: 0.021, blade: 'Two teeth, 18 mm thick', name: 'Version 1 (CAD only)' },
  v2: { bot: 0.0014, top: 0.0386, stack: '37.2 mm', proud: '10.0 mm', bladeY: 0.019, blade: 'One tooth, 16 mm thick', name: 'Version 2 (built)' },
};
// per step: what is lit and how strongly, which camera, whether the dimensions (dims) or the blades
// alone (blades) show, whether version 1 shows (v1), and where version 1 sits relative to version 2
// when they are stacked (up: above it; back: behind it, for the view from above). Cameras look from
// the front half, so side by side version 1 (at +X) stays on the left; the switch step shows
// version 2 alone, from the back.
const STEPS = [
  { lit: (a, b) => [...a.top, ...a.bottom, ...b.top, ...b.bottom], glow: 0.3, cam: { azimuth: 180, elevation: 9 }, dims: 1, blades: 0, v1: 1, up: 0.085 },
  { lit: (a, b) => [...a.center, ...a.guards, ...a.clamps, ...b.tpu], glow: 0.35, cam: { azimuth: 146, elevation: 24 }, dims: 0, blades: 0, v1: 1, up: 0.16 },
  { lit: (a, b) => [...a.blade, ...b.blade], glow: 0.22, cam: { azimuth: 180, elevation: 88 }, dims: 0, blades: 1, v1: 1, back: 0.17 },
  { lit: (a, b) => [...b.switch], glow: 0.5, cam: { azimuth: 24, elevation: 20 }, dims: 0, blades: 0, v1: 0, up: 0.16 },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const reduced = ctx.reducedMotion;
  const g1 = new T.Group(), g2 = new T.Group();
  g1.position.set(GAP, LIFT, 0); g2.position.set(-GAP, LIFT, 0);
  stage.root.add(g1, g2);
  const [r1, r2] = await Promise.all([loadRobot(stage, 'v1', { add: false }), loadRobot(stage, 'v2', { add: false })]);
  g1.add(r1.model); g2.add(r2.model);
  stage.fitGround();
  const a = r1.p, b = r2.p;

  // one material per mesh, so each part can fade and glow on its own
  const meshes = [];
  for (const g of [g1, g2]) g.traverse((m) => {
    if (!m.isMesh) return;
    m.material = Array.isArray(m.material) ? m.material.map(stage.cloneMaterial) : stage.cloneMaterial(m.material);
    meshes.push(m);
  });
  const meshSet = (objs) => { const s = new Set(); for (const o of objs) o.traverse((m) => { if (m.isMesh) s.add(m); }); return s; };
  const bladeMeshes = meshSet([...a.blade, ...b.blade]);
  const v1Meshes = meshSet([g1]);
  const litSets = STEPS.map((s) => meshSet(s.lit(a, b)));
  const accent = new T.Color(ACCENT);

  // where each robot sits: side by side on a very wide stage, otherwise stacked (version 1 above;
  // for the blades seen from above, version 1 behind, which is the top of the picture)
  const isStacked = () => el.clientWidth < el.clientHeight * 1.8;
  function layout(step, stacked) {
    if (!stacked) return [[GAP, LIFT, 0], [-GAP, LIFT, 0]];
    const s = STEPS[step];
    return [[0, LIFT + (s.up || 0), (s.back || 0) / 2], [0, LIFT, -(s.back || 0) / 2]];
  }
  const place = (P) => { g1.position.set(...P[0]); g2.position.set(...P[1]); };

  // ------------------------------------------------------------ marks (annotations), in each robot's own frame
  const marksMat = new T.LineBasicMaterial({ color: ACCENT, depthTest: false, transparent: true, opacity: 0 });
  const ringMat = new T.LineBasicMaterial({ color: ACCENT, depthTest: false, transparent: true, opacity: 0 });
  const geos = [];
  function seg(parent, pts, mat) {
    const g = new T.BufferGeometry().setFromPoints(pts.map((q) => new T.Vector3(...q)));
    const l = new T.Line(g, mat); l.renderOrder = 10; parent.add(l); geos.push(g); return l;
  }
  const ov = labelLayer(stage);
  const labs = []; // { l, grp, at: [x, y, z] local, kind: 'dims' | 'name' | 'blade', text, short }; version 1's fade with it
  const lab = (grp, text, at, kind, o, short = text) => labs.push({ l: ov.label(text, [0, 0, 0], o), grp, at, kind, text, short, pv: new T.Vector3() });
  const narrowNow = () => el.clientWidth < 620; // a phone: shorter labels and more room round the robots
  let narrow = null;
  // side: +1 puts the marks on the robot's +X side (the left of the screen from the front)
  for (const [v, grp, side] of [['v1', g1, 1], ['v2', g2, -1]]) {
    const d = DIMS[v];
    const x = side * 0.112, z = -0.045, tk = 0.006 * side;
    seg(grp, [[x, d.bot, z], [x, d.top, z]], marksMat);
    seg(grp, [[x - tk, d.bot, z], [x + tk, d.bot, z]], marksMat); seg(grp, [[x - tk, d.top, z], [x + tk, d.top, z]], marksMat);
    lab(grp, d.stack, [x + side * 0.004, (d.bot + d.top) / 2, z], 'dims', { side: side > 0 ? 'l' : 'r', color: ACCENT });
    const wx = side * 0.0711, wz = -0.03;
    seg(grp, [[wx, d.top, wz], [wx, WHEEL_TOP, wz]], marksMat);
    seg(grp, [[wx - 0.012, d.top, wz], [wx + 0.012, d.top, wz]], marksMat); seg(grp, [[wx - 0.006, WHEEL_TOP, wz], [wx + 0.006, WHEEL_TOP, wz]], marksMat);
    lab(grp, `Wheel +${d.proud}`, [wx, WHEEL_TOP + 0.004, wz], 'dims', { side: side > 0 ? 'l' : 'r', color: ACCENT }, `+${d.proud}`);
    lab(grp, d.name, [-side * 0.118, 0.02, -0.045], 'name', { color: '#fff1e2', side: side > 0 ? 'r' : 'l' }, d.name.replace(/ \(.*\)$/, ''));
    // the blade's swing circle
    const pts = [];
    for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push([TIP_R * Math.cos(t), d.bladeY, -0.076 + TIP_R * Math.sin(t)]); }
    seg(grp, pts, ringMat);
    lab(grp, d.blade, [0, d.bladeY, -0.076 + TIP_R], 'blade', { color: ACCENT });
    lab(grp, v === 'v1' ? 'Version 1: 112 mm swing' : 'Version 2: 112 mm swing', [0, d.bladeY, -0.076 - TIP_R], 'blade', { color: '#fff1e2' });
  }

  // ------------------------------------------------------------ views: framed once per step, robots at rest in that step's layout
  const views = viewCache(el, (aspect) => {
    const stacked = aspect < 1.8, portrait = aspect < 1;
    const keep = [g1.position.clone(), g2.position.clone()];
    const out = STEPS.map((s, i) => {
      place(layout(i, stacked));
      const objs = s.blades ? [...a.blade, ...b.blade] : s.v1 ? [g1, g2] : [g2];
      const pad = s.blades ? 1.5 : narrowNow() ? (s.v1 ? 1.65 : 1.5) : !s.v1 ? 1.4 : portrait ? 1.3 : 1.2;
      return toSph(T, stage.frame(objs, { ...s.cam, pad, apply: false, refresh: true }));
    });
    g1.position.copy(keep[0]); g2.position.copy(keep[1]);
    return out;
  });

  let sig = '';
  function setProgress(prog, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const i0 = Math.max(0, step - 1), A = STEPS[i0], B = STEPS[step];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const stacked = isStacked();
    const [fx, fy] = ctx.shift();
    stage.setShift(fx, fy);
    // stacked, version 1 moves between the steps' layouts (views are framed with it at rest in each)
    const PA = layout(i0, stacked), PB = layout(step, stacked);
    place(PA.map((q, j) => q.map((c, n) => lerp(c, PB[j][n], k))));
    // fades and glows: write materials only when they change
    const fade = lerp(A.blades, B.blades, k), v1a = lerp(A.v1, B.v1, k), q = (x) => Math.round(x * 100) / 100;
    const s = `${step}|${q(k)}|${q(fade)}|${q(v1a)}`;
    if (s !== sig) {
      sig = s;
      for (const m of meshes) {
        const op = (bladeMeshes.has(m) ? 1 : 1 - fade) * (v1Meshes.has(m) ? v1a : 1);
        const glow = (litSets[i0].has(m) && step !== i0 ? (1 - k) * A.glow : 0) + (litSets[step].has(m) ? k * B.glow : 0);
        for (const mat of [].concat(m.material)) {
          mat.transparent = op < 0.999; mat.opacity = op; mat.depthWrite = op > 0.5;
          if (mat.emissive) { mat.emissive.copy(accent); mat.emissiveIntensity = glow; }
        }
        m.visible = op > 0.02;
        m.castShadow = op > 0.5;
      }
      stage.invalidate();
    }
    const dims = lerp(A.dims, B.dims, k), rings = fade;
    marksMat.opacity = 0.95 * dims; ringMat.opacity = 0.85 * rings; // version 1 is always shown while these are
    marksMat.visible = dims > 0.01; ringMat.visible = rings > 0.01;
    if (narrow !== narrowNow()) {
      narrow = narrowNow();
      for (const x of labs) x.l.el.lastChild.textContent = narrow ? x.short : x.text;
    }
    for (const x of labs) {
      x.l.a = (x.kind === 'dims' ? dims : x.kind === 'blade' ? rings : 1 - rings) * (x.grp === g1 ? v1a : 1);
      x.grp.localToWorld(x.pv.set(...x.at)); x.l.p.copy(x.pv);
    }
    const v = views();
    blend(stage, v[i0], v[step], k, reduced ? 0 : 0.02 * (step + stepP - 2));
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); for (const g of geos) g.dispose(); marksMat.dispose(); ringMat.dispose(); stage.dispose(); },
  };
}

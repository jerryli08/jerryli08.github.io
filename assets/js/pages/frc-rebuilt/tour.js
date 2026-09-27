// "The CAD, mechanism by mechanism": Jerry's final robot turned by the scroll. Each step lights one
// mechanism in place on the whole robot and turns it about its real axes (rig.js) as the reader
// scrolls; the transfer is shown through a section at the middle lane, and the last step sweeps a
// section across the robot through all three lanes. It replaces the old viewer with its buttons.
//
// Every view is framed once on the whole robot at rest (cached per stage shape) and the camera
// blends between them; nothing is framed on a moving part. The picture is a pure function of the
// scroll (step + progress through it). Spin directions follow the fuel path; speeds are drawn, not
// to scale. With reduced motion nothing turns and the views cut.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, LANES } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ACCENT = '#ff6b35';

// per step: camera (degrees), what is lit, what spins, and the section (x kept below `cut`, seen from +X)
const STEPS = [
  { az: 42, el: 20, lit: [] },
  { az: 38, el: 9, lit: ['swerve'], bumpers: 0.22 }, // the bumpers see-through, so the modules in the corners show
  { az: 62, el: 16, lit: ['roller', 'rollerBelt', 'motorBelt', 'motorPulley', 'pivotShaft'], spin: 'roller' },
  { az: 96, el: 9, lit: ['lower', 'upper', 'tBelt'], spin: 'transfer', cut: LANES[1], back: true },
  { az: 150, el: 24, lit: ['fly'], spin: 'fly' },
  { az: 90, el: 7, lit: [], sweep: true, back: true },
];
const SWEEP = [0.62, LANES[0]]; // the last step's cut: from past one side of the robot to the far lane's centre
const OUT = 1.0; // a cut this far out keeps the whole robot

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE: T } = stage;
  const rig = await loadRobot(stage);
  const { model } = rig;
  const reduced = !!ctx.reducedMotion;
  const cut = stage.sectionPlane([-1, 0, 0], 1000); // parked: cuts nothing
  rig.fixClear();

  // the back of the robot (hopper floor, transfer, shooters), framed for the section steps: a box in
  // the model frame, not a moving part
  const back = new T.Mesh(new T.BoxGeometry(0.84, 0.58, 0.7));
  back.position.set(0.292, 0.25, -0.38);
  // views, framed once at rest: the whole robot, or the back of it
  let views = null, aspect = 0;
  const sph = (v) => { const s = new T.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      views = STEPS.map((s) => sph(stage.frame(s.back ? back : model, { azimuth: s.az, elevation: s.el, pad: s.back ? 1.02 : 1.06, apply: false, refresh: true })));
    }
    return views;
  }
  const sp = new T.Spherical();
  function place(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: new T.Vector3().setFromSpherical(sp).add(target), target });
  }

  // highlights: every lit part gets its own tint, blended by the scroll
  const tintOf = new Map(); // part -> { mats, from }
  const glow = new T.Color(ACCENT).multiplyScalar(0.5);
  const lit = [...new Set(STEPS.flatMap((s) => s.lit))];
  for (const name of lit) {
    const ps = rig.parts(name);
    const mats = [];
    for (const p of ps) p.traverse((m) => {
      if (!m.isMesh) return;
      m.material = [].concat(m.material).map((x) => { const c = stage.cloneMaterial(x); mats.push(c); return c; });
      if (m.material.length === 1) m.material = m.material[0];
    });
    tintOf.set(name, { mats, k: -1 });
  }
  rig.fixClear();
  function tint(name, k) {
    const t = tintOf.get(name);
    if (!t || Math.abs(t.k - k) < 0.004) return;
    t.k = k;
    for (const m of t.mats) if (m.emissive) m.emissive.copy(glow).multiplyScalar(k);
    stage.invalidate(false);
  }

  // (after the highlight copies above, so these are the materials in use) the bumpers and the bumper wood fade out while a section is in, so the cut shows the lanes
  const blue = rig.parts('bumpers').flatMap((b) => { const out = []; b.traverse((m) => { if (m.isMesh) out.push(m.material); }); return out; });
  const woodMats = new Set();
  model.traverse((m) => { if (!m.isMesh) return; for (const x of [].concat(m.material)) if (x.color && Math.abs(x.color.r - 0.896) < 0.01 && Math.abs(x.color.g - 0.761) < 0.01 && Math.abs(x.color.b - 0.565) < 0.01) woodMats.add(x); });
  const fading = [...new Set([...blue, ...woodMats])];
  for (const m of fading) { m.transparent = true; m.needsUpdate = true; }
  let fadeNow = -1;
  function fadeBumpers(a) {
    if (Math.abs(a - fadeNow) < 0.004) return;
    fadeNow = a;
    for (const m of fading) { m.opacity = a; m.depthWrite = a > 0.98; m.visible = a > 0.01; }
    stage.invalidate();
  }

  // lane labels for the sweep
  const ov = labelLayer(stage);
  const LANE_NAMES = ['Outer lane', 'Middle lane', 'Outer lane'];
  const laneLabels = LANES.map((x, i) => ov.label(LANE_NAMES[i], [x, 0.24, -0.47], { color: '#fff1e2', side: i === 2 ? 'l' : 'r' }));

  // the last step's text only gets about two thirds of the way up the screen, so the sweep ends early
  const cutAt = (S, q) => (S.sweep ? lerp(SWEEP[0], SWEEP[1], smooth(0.06, 0.55, q)) : S.cut ?? OUT);
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    stepP = clamp(stepP, 0, 1);
    stage.setShift(...ctx.shift());
    const prev = Math.max(0, step - 1);
    const A = STEPS[prev], B = STEPS[step];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const u = step + stepP;

    // camera: blend from the previous view, then a slow drift while the text is read
    const v = viewsNow();
    place(v[prev], v[step], k, reduced ? 0 : (u - 2.5) * 0.05);

    // lit parts
    for (const name of lit) tint(name, lerp(A.lit.includes(name) ? 1 : 0, B.lit.includes(name) ? 1 : 0, k));

    // spinning while its step is read: angles are functions of the scroll alone
    const spin = (key, rate) => (reduced ? 0 : rate * clamp(u - STEPS.findIndex((s) => s.spin === key), 0, 1));
    rig.setRoller(spin('roller', 10));
    rig.setTransfer(spin('transfer', 12));
    rig.setFly(spin('fly', 30));

    // section: moves in from past the robot, and back out when the next step has none
    const c = lerp(cutAt(A, 1), cutAt(B, reduced ? 1 : stepP), k);
    cut.set(c >= OUT - 1e-4 ? 1000 : c);
    const see = lerp(A.bumpers ?? 1, B.bumpers ?? 1, k);
    fadeBumpers(Math.min(see, smooth(0.74, 0.92, c)));

    // lane labels: each shows while the cut is at its lane
    laneLabels.forEach((l, i) => { l.a = B.sweep ? k * (1 - smooth(0.02, 0.07, Math.abs(c - LANES[i]))) : 0; });
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); back.geometry.dispose(); back.material.dispose(); stage.dispose(); } };
}

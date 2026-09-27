// "The CAD: what changed from V1 to V2", scroll-driven. Both robots from Jerry's CAD on one stage:
// the shared chassis (drive, intake, ramp) stays put, and only the parts that differ between the
// two files swap, dissolving from V1's to V2's. Steps (u = step + progress through it):
//   0  V1, whole          2  what changed: V1's own parts tinted     4  V2 cut in half
//   1  V1 cut in half     3  V2 comes in, its own parts tinted
// The section plane runs down the robot's centreline (x = -0.036, keeping the robot's left half)
// and sweeps in from outside the robot, so nothing is cut until a cut step. The balls stay whole
// inside the cut. Views are framed once, at rest, on a fixed box around both robots, and blended.
// Every picture is a pure function of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { MODELS, MID_X, dropMouthBall, wholeBalls, part, region, viewSet, hudPanel, stepState, lerp, smooth } from './rig.js';

const ACCENT = '#ff6b35';
const INFO = [
  { name: 'V1, November 2025', s: 'Fixed to the chassis', w: '2 x 96 mm, a motor on each end', a: 'Turn the whole robot', h: 'Fixed, with a 2-position flap' },
  { name: 'V2, the Worlds robot', s: 'On a turret', w: '1 x 72 mm, 2 motors through bevels', a: 'Turret, from the odometry pose', h: 'Geared, adjustable' },
];
// per step: which version, cut (0..1), tint on that version's own parts (0..1), view
const STEPS = [
  { v: 0, cut: 0, tint: 0, view: 'whole' },
  { v: 0, cut: 1, tint: 0, view: 'cut' },
  { v: 0, cut: 0, tint: 1, view: 'whole' },
  { v: 1, cut: 0, tint: 1, view: 'whole' },
  { v: 1, cut: 1, tint: 0, view: 'cut' },
];
const CUT_AT = -MID_X; // plane constant for the centreline cut (keeps x >= -0.036)
const CUT_OFF = 0.3; // keeps x >= -0.3: the whole robot (it spans x -0.242 to 0.189)

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const [chassis, v1, v2] = await Promise.all(['chassis', 'v1top', 'v2top'].map((n) => stage.load(`${MODELS}${n}.glb`)));
  dropMouthBall(stage, v2);
  const tops = [v1, v2];

  // every material of each top gets its own copy, so the two dissolve and tint independently
  const mats = tops.map((top) => {
    const list = [];
    top.traverse((o) => {
      if (!o.isMesh) return;
      o.material = [].concat(o.material).map((m) => {
        const c = stage.cloneMaterial(m);
        c.alphaHash = true; // dissolves without sorting trouble
        c.userData.emissive0 = c.emissive ? c.emissive.clone() : null;
        c.userData.op0 = c.opacity;
        list.push(c);
        return c;
      });
      if (o.material.length === 1) o.material = o.material[0];
    });
    return list;
  });
  const cut = stage.sectionPlane([1, 0, 0], CUT_OFF);
  // balls whole inside the cut (after the plane exists: it prepares every material once)
  const ballParts = [part(stage, chassis, 'ball_low'), part(stage, v1, 'ball_mid'), part(stage, v1, 'ball_top'), part(stage, v2, 'ball_mid'), part(stage, v2, 'ball_top')];
  const ballMats = wholeBalls(stage, ballParts);
  const topBallMats = [ballMats.slice(1, 3), ballMats.slice(3, 5)];
  // the top balls belong to their version: they fade with it but take no tint
  mats.forEach((list, i) => { for (const m of topBallMats[i]) { m.alphaHash = true; m.userData.noTint = true; m.userData.op0 = 1; list.push(m); } });

  const faded = [-1, -1], tinted = [-1, -1];
  const tintC = new THREE.Color(ACCENT).multiplyScalar(0.36), tmp = new THREE.Color();
  function setFade(i, f) {
    if (Math.abs(faded[i] - f) < 0.002) return;
    faded[i] = f;
    tops[i].visible = f > 0.004;
    for (const m of mats[i]) m.opacity = m.userData.op0 * f;
    stage.invalidate();
  }
  function setTint(i, t) {
    if (Math.abs(tinted[i] - t) < 0.002) return;
    tinted[i] = t;
    for (const m of mats[i]) {
      if (m.userData.noTint || !m.emissive) continue;
      m.emissive.copy(m.userData.emissive0 || tmp.set(0)).lerp(tintC, t);
    }
    stage.invalidate();
  }

  // views, framed once at rest on a box around both robots
  const box = new THREE.Box3();
  for (const o of [chassis, v1, v2]) box.expandByObject(o);
  const all = region(THREE, box.min.toArray(), box.max.toArray());
  const phone = () => el.clientWidth < 640;
  const views = viewSet(stage, el, {
    whole: { obj: all, azimuth: 38, elevation: 20, pad: (e) => (e.clientWidth < 640 ? 1.08 : 1.08) },
    cut: { obj: all, azimuth: -90, elevation: 8, pad: (e) => (e.clientWidth < 640 ? 1.16 : 1.06) },
  });

  // labels (model metres) and the comparison readout
  const ov = labelLayer(stage);
  // on a phone the robot fills the stage: every label reads to the right, so none runs off the left edge
  const L = (text, p, o) => ov.label(text, p, { color: '#fff1e2', ...o, ...(el.clientWidth < 640 ? { side: 'r' } : {}) });
  const labels = {
    v1whole: [L('Intake', [-0.0305, 0.09, 0.232]), L('Ramp: three balls', [0.07, 0.1, 0.03], { minW: 520 }), L('Fixed flywheel', [0.04, 0.25, -0.2], { side: 'l' })],
    v1cut: [L('Top ball', [MID_X, 0.19, -0.066], { side: 'l' }), L('Gate', [MID_X, 0.268, -0.03]), L('Flywheel pair', [MID_X, 0.25, -0.173], { side: 'l' })],
    v2whole: [L('Turret', [0.07, 0.29, -0.09]), L('Flywheel, 72 mm', [-0.04, 0.3, -0.19], { side: 'l', minW: 520 })],
    v2cut: [L('Top ball, in the turret bearing', [MID_X, 0.232, -0.065], { side: 'l' }), L('Hood', [MID_X, 0.37, -0.03]), L('Flywheel', [MID_X, 0.267, -0.16], { side: 'l' })],
  };
  const hud = hudPanel(ov.layer, `
    <div class="rx-hud-row rx-hud-big" style="margin-top:0;padding-top:0;border-top:0"><b data-k="name" style="font-size:19px"></b></div>
    <table><tbody>
      <tr><td>Shooter</td><td data-k="s"></td></tr>
      <tr><td>Flywheel</td><td data-k="w"></td></tr>
      <tr><td>Aiming</td><td data-k="a"></td></tr>
      <tr><td>Hood</td><td data-k="h"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini" data-k="mini"></div>`);

  function setProgress(p, step, stepP) {
    const s = stepState(step, stepP, STEPS.length, reduced);
    const A = STEPS[s.prev], B = STEPS[s.step], k = s.k;
    // which version shows: dissolve over the first part of the step
    const vis = lerp(A.v, B.v, s.step === s.prev ? 1 : k);
    setFade(0, 1 - vis);
    setFade(1, vis);
    // the tint belongs to the step's own version
    const t = lerp(A.tint, B.tint, k);
    setTint(0, B.v === 0 ? t : A.v === 0 ? A.tint * (1 - k) : 0);
    setTint(1, B.v === 1 ? t : 0);
    // the cut sweeps in from outside the robot
    const c = lerp(A.cut, B.cut, k);
    cut.set(lerp(CUT_OFF, CUT_AT, smooth(0, 1, c)));
    // camera, framed once
    stage.setShift(...(phone() ? [0, -0.07] : ctx.shift())); // on a phone: below the readout across the top
    const wa = A.view === 'cut' ? 1 : 0, wb = B.view === 'cut' ? 1 : 0;
    const w = lerp(wa, wb, k);
    views.blend('whole', 'cut', w, reduced ? 0 : (s.u - s.step - 0.5) * 0.03);
    // labels: the ones for what is on screen once the blend has settled
    const on = (v, cutView) => Math.min(v === 0 ? 1 - vis : vis, cutView ? w : 1 - w) * smooth(0.35, 0.6, s.step === 0 ? 1 : stepP);
    for (const l of labels.v1whole) l.a = on(0, false) * (1 - t);
    for (const l of labels.v1cut) l.a = on(0, true);
    for (const l of labels.v2whole) l.a = on(1, false) * (1 - t * 0.5);
    for (const l of labels.v2cut) l.a = on(1, true);
    ov.update();
    const info = INFO[vis < 0.5 ? 0 : 1];
    hud.show(1);
    hud.put('name', info.name); hud.put('s', info.s); hud.put('w', info.w); hud.put('a', info.a); hud.put('h', info.h);
    hud.put('mini', `${info.s}; aimed by: ${info.a.toLowerCase()}`);
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); all.geometry.dispose(); stage.dispose(); },
  };
}

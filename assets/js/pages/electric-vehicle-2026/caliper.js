// "Caliper in, steering out", scroll-driven: version 2's front end from my CAD. Scrolling moves the
// caliper's sliding jaw through a travel sweep, and the link and the fork turn about their real
// pivots, from tools/cad-axes.py on scioly_ev_2026_ev_caliper_steering_final_ver.step (mm, Z up):
//   steering: vertical axis through the 6202 bearing and the bearing holder bore, x -465.2, y 231.5
//   link:     its rear pin on the dynamic caliper ends, x -337.5, y 187.3, which slides along +x
// The slider-crank maths (50 mm arm, 89.4 mm link, 44.2 mm offset) is in geom.js. A rotation about
// STEP +Z is the same angle about model +Y, and STEP +x is model +x (cad.point), so the parts move
// by exactly the computed angles and travel. The orange line on the floor is an annotation, not a
// part: it follows the wheel's heading so a degree or two reads at a glance; the pale one is
// straight ahead. Views are framed once with the linkage at rest and blended.
// Every picture is a pure function of (step, stepP); nothing moves on its own.
import { createStage, cad } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import * as G from './geom.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ACCENT = '#ff6b35';

// The version 2 setting for the track in the path scrolly above (8 m, 30 cm gap): 1.21 mm of
// travel is 2.63 degrees, computed there with the same linkage.
const SET = 1.21;
// per step: jaw travel (mm from straight ahead) at the start and end of the step, the view, and
// how brightly the printed link is lit
const STEPS = [
  { view: 'angle', a: 0, b: 0, lit: 0 },
  { view: 'angle', a: 0, b: SET, lit: 0 },
  { view: 'top', a: SET, b: -2, lit: 0 },
  { view: 'top', a: -2, b: 4.2, lit: 0 },
  { view: 'angle', a: 4.2, b: SET, counts: 5, lit: 0 },
  { view: 'angle', a: SET + 0.05, b: SET + 0.05, lit: 1 },
];
// both look from the car's right, so the car's front is to the right of the picture (the step text
// covers the left): 'top' straight down, like the photo from above, 'angle' from above and in front
const VIEWS = { angle: { azimuth: 208, elevation: 46, pad: 1.22 }, top: { azimuth: 180, elevation: 88, pad: 1.7 } };
const LEN = 0.14; // m, the heading annotation

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const model = await stage.load('/assets/models/electric-vehicle-2026/v2-caliper.glb');

  // parts, by their CAD names (tools/cad/configs/electric-vehicle-2026-v2-caliper.json keeps them separate)
  const steerParts = stage.part(/^anim_ev2_\d+_(front_wheel_holder_1|front_wheel_bearing_holder_1|front_axle_1|BaneBots_2_875_x0_8_30A_Wheel_4|BaneBots_12mm_T81_Wheel_Hub_4|_4x_5mm_12id_spacer_[24]|1603_0032_0012_assembly_[13])/);
  const clampParts = stage.part(/^anim_ev2_\d+_(bottom|top)_dynamic_caliper_end_1/);
  const headParts = stage.part(/^anim_ev2_\d+_Component2[345]_1/);
  const linkParts = stage.part(/^anim_ev2_\d+_caliper_linkage_1/);

  const P = cad.point([-465.2, 231.5, 0]);
  const steer = stage.pivot(steerParts, P, [0, 1, 0]);
  const link = stage.pivot(linkParts, cad.point([-337.5, 187.3, 13.3]), [0, 1, 0]);
  const slide = stage.pivot([...headParts, ...clampParts], 'center', [0, 1, 0]); // translated only
  const linkX0 = link.position.x, slideX0 = slide.position.x;

  // the heading annotation: two thin strips on the floor ahead of the front wheel
  const groundY = stage.bounds(model).box.min.y + 0.0006;
  const strip = (color, opacity, w) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.0008, w), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, depthWrite: false }));
    m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2;
    return m;
  };
  const straight = strip('#eee9e3', 0.45, 0.0022);
  straight.position.set(P[0] - 0.045 - LEN / 2, groundY, P[2]);
  model.add(straight);
  const heading = strip(ACCENT, 0.95, 0.0034);
  steer.add(heading);
  heading.position.copy(steer.worldToLocal(model.localToWorld(new THREE.Vector3(P[0] - 0.045 - LEN / 2, groundY + 0.0003, P[2]))));

  // labels, pinned to points that ride with the moving parts
  const ov = labelLayer(stage);
  const anchor = (group, p) => { const a = new THREE.Object3D(); group.add(a); a.position.copy(group.worldToLocal(model.localToWorld(new THREE.Vector3(...p)))); return a; };
  const tags = [
    // (the axis label's dot sits on the bearing holder's rim on the car's right, clear of the arm's)
    { a: anchor(model, cad.point([-465.2, 251.5, 22])), l: ov.label('Steering axis: 6202 bearing', [0, 0, 0], { color: '#fff1e2' }), steps: [0, 1] },
    { a: anchor(steer, cad.point([-415.2, 231.5, 17])), l: ov.label('50 mm arm', [0, 0, 0], { color: ACCENT, side: 'l' }), steps: [0, 1] },
    { a: anchor(link, cad.point([-376.3, 209.4, 17])), l: ov.label('Printed link, 89.4 mm', [0, 0, 0], { color: ACCENT }), steps: [0, 1, 5] },
    { a: anchor(slide, cad.point([-337.5, 187.3, 17])), l: ov.label('Clamp on the sliding jaw', [0, 0, 0], { color: '#fff1e2', side: 'l', minW: 560 }), steps: [0, 1, 2] },
    { a: anchor(steer, [P[0] - 0.045 - LEN, groundY, P[2]]), l: ov.label('Wheel heading', [0, 0, 0], { color: ACCENT, side: 'l', minW: 420 }), steps: [0, 1, 2, 3, 4, 5] },
  ];

  // the linkage is tinted so it reads against the black prints; the link glows in the last step
  const linkage = [...stage.part(/^anim_ev2_\d+_front_wheel_bearing_holder_1/), ...linkParts, ...clampParts];
  stage.highlight(linkage, ACCENT, { intensity: 0.16 });
  const linkMats = [];
  for (const p of linkParts) p.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive) linkMats.push(m); });
  let litNow = -1;
  function lightLink(x) {
    const v = Math.round(lerp(0.16, 0.6, x) * 50) / 50;
    if (v === litNow) return;
    litNow = v;
    for (const m of linkMats) m.emissiveIntensity = v;
    stage.invalidate(false);
  }

  // travel in, parts out
  let tNow = NaN;
  function pose(t) {
    if (t === tNow) return;
    tNow = t;
    steer.setAngle(G.steerAt(t));
    link.setAngle(G.linkTurnAt(t));
    link.position.x = linkX0 + t / 1000;
    slide.position.x = slideX0 + t / 1000;
    stage.invalidate();
  }

  // views, framed once with the linkage straight ahead, cached per stage shape
  const focus = [...steerParts, ...linkParts, ...clampParts, straight];
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const keep = tNow;
    pose(0);
    views = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, sph(stage.frame(focus, { ...v, apply: false, refresh: true }))]));
    pose(Number.isNaN(keep) ? 0 : keep);
    return views;
  }
  const sp = new THREE.Spherical();
  function place(A, B, k) {
    let dT = B.s.theta - A.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = A.t.clone().lerp(B.t, k);
    sp.set(lerp(A.s.radius, B.s.radius, k), lerp(A.s.phi, B.s.phi, k), A.s.theta + dT * k);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }

  // the readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  ov.layer.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Caliper travel from straight ahead</span><b class="num" data-k="t"></b></div>
    <table class="num"><tbody>
      <tr><td>Turn radius <small>452 mm wheelbase</small></td><td data-k="r"></td></tr>
      <tr><td>Sensitivity here</td><td data-k="s"></td></tr>
      <tr><td>One 0.01 mm count</td><td data-k="c"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Steering angle</span><b class="num" data-k="a"></b></div>`;
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  function readout(t) {
    const th = G.steerAt(t), deg = th / DEG, sens = Math.abs(G.sensitivity(t));
    const R = Math.abs(th) < 1e-6 ? Infinity : G.WHEELBASE.v2 / Math.tan(Math.abs(th));
    const tt = `${t > 0.004 ? '+' : t < -0.004 ? '−' : ''}${Math.abs(t).toFixed(2)} mm`;
    const ang = Math.abs(deg) < 0.005 ? 'straight ahead' : `${Math.abs(deg).toFixed(2)}° ${deg > 0 ? 'left' : 'right'}`;
    const rad = R === Infinity ? 'straight' : `${R.toFixed(R < 10 ? 2 : 1)} m`;
    put('t', tt); put('a', ang); put('r', rad);
    put('s', `${sens.toFixed(2)}° per mm`);
    put('c', `${(sens * 0.01).toFixed(3)}°`);
    put('mini', `${tt}: ${ang}, ${rad}${R === Infinity ? '' : ' radius'}`);
  }

  function travelAt(step, sp0) {
    const S = STEPS[step];
    if (reduced) return S.counts ? S.b + 0.01 * S.counts : S.b;
    if (!S.counts) return lerp(S.a, S.b, smooth(0.1, 0.85, sp0));
    if (sp0 < 0.4) return lerp(S.a, S.b, smooth(0.05, 0.35, sp0));
    // then one caliper count at a time
    return S.b + 0.01 * Math.min(S.counts, Math.floor(((sp0 - 0.4) / 0.45) * (S.counts + 1)));
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const phone = el.clientWidth < 640;
    const prev = Math.max(0, step - 1);
    const A = STEPS[prev], B = STEPS[step];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    // the readout sits top right (across the top on a phone), where both views leave room; when the
    // step cards cover the left, the long view from above moves a little further right
    const [fx] = ctx.shift();
    const top = lerp(A.view === 'top' ? 1 : 0, B.view === 'top' ? 1 : 0, k);
    stage.setShift(fx + (fx > 0 ? 0.07 * top : 0), phone ? -0.12 : -0.02);
    const t = Math.round(travelAt(step, stepP) * 1000) / 1000;
    pose(t);
    const v = viewsNow();
    place(v[A.view], v[B.view], k);
    lightLink(lerp(A.lit, B.lit, k));
    for (const g of tags) {
      const on = (s) => (g.steps.includes(s) ? 1 : 0);
      g.l.a = step === prev ? on(step) : lerp(on(prev), on(step), smooth(0.2, 0.9, k));
      if (g.l.a > 0.02) g.a.getWorldPosition(g.l.p);
    }
    readout(t);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

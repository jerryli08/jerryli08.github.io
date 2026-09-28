// One intake cycle on the real CAD, driven only by the scroll: the slides push the intake out, the
// front rollers fold down, the rollers pull two pixels up the ramp, the arm folds back up, the
// slides pull the intake in, and the rollers hand the pixels to the robot's 4-bar dumper.
// Every part moves about or along its real axis in the CAD (rig.js). The pixels are the only
// things that are not CAD: plain 3 in hexagons added to show the path.
//
// The picture is a pure function of (step, progress through the step): scrolling back plays it
// backwards and nothing moves on its own. Views are framed once with everything at rest, cached
// (per stage aspect) and blended. With reduced motion each step cuts to its end pose and the
// rollers do not spin.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { rigRobot, AX, FOLD, INTAKE, PIXEL, SLIDE_FRONT, SLIDE_LEN } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const BLUE = '#27c7ff', ORANGE = '#ff6b35';

// ---------------------------------------------------------------- the pixels' path
// Points on the path of a pixel's centre in the carriage's frame (metres; z forward, y up) and its
// tilt about X (degrees, + = front end down). From the floor ahead of the intake, over the counter
// roller, up the ramp (its top surface measured on the CAD), onto the flat top under the rear
// rollers; then, with the intake retracted (carriage frame = robot frame + 0.9606 m in z), off the
// back of the ramp, over the robot's centre channel and into the 4-bar dumper's tray, which slopes
// up toward the back. Where a pixel sits on a surface its centre is half a pixel (6.35 mm) off it.
const H = PIXEL.thick / 2, BACK = 0.9606;
const on = (z, y, deg) => [z + H * Math.sin(deg * DEG), y + H * Math.cos(deg * DEG), deg];
const PATH = [
  [1.32, 0.0085, 0],                 // 0: B starts here
  [1.21, 0.0085, 0],                 // 1: A starts here
  [1.15, 0.0085, 0],                 // under the front rollers
  on(1.121, 0.0183, 20),             // back edge riding up over the counter roller
  on(1.086, 0.024, 38),              // onto the lip of the ramp
  on(1.0564, 0.0499, 36),
  on(1.0485, 0.0558, 33),            // 6: B's place on the ramp
  on(1.0403, 0.0608, 32),
  on(1.0255, 0.0693, 24),
  on(1.0151, 0.0732, 14),
  on(1.0047, 0.075, 6),
  on(0.99, 0.0758, 0),
  on(0.96, 0.0758, 0),               // 12: A held under the rear rollers
  on(0.925, 0.0758, 0),              // retracted: sliding off the back of the ramp
  [BACK - 0.07, 0.0735, 5],          // over the channel and the dumper's front bars
  [BACK - 0.105, 0.0752, 4],         // 15: B's place, under the dumper wheel
  [BACK - 0.16, 0.0735, 7.1],
  [BACK - 0.21, 0.0785, 7.1],        // 17: A at the back of the tray
];
const S = [0];
for (let i = 1; i < PATH.length; i++) S.push(S[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
function at(s, out) {
  let i = 1; while (i < PATH.length - 1 && S[i] < s) i++;
  const t = clamp((s - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1]), 0, 1);
  const a = PATH[i - 1], b = PATH[i];
  out[0] = lerp(a[0], b[0], t); out[1] = lerp(a[1], b[1], t); out[2] = lerp(a[2], b[2], t);
  return out;
}
const A = { start: S[1], hold: S[12], end: S[17] };
const B = { start: S[0], hold: S[6], end: S[15] };

// ---------------------------------------------------------------- the timeline
// u = step + progress through it (0..7). Steps: 0 stowed, 1 extend, 2 fold down, 3 roll in,
// 4 fold up, 5 retract, 6 transfer.
const TURNS = 1.2; // star roller turns per step at full speed (slowed down; the picture, not a speed)
const rollSpeed = (u) => smooth(2.3, 2.9, u) * (1 - smooth(4.05, 4.6, u)) + smooth(6.2, 6.45, u);
const dumpSpeed = (u) => smooth(6.25, 6.5, u);
const N = 700, U = 7;
const tabR = new Float64Array(N + 1), tabD = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) {
  const u = ((i - 0.5) / N) * U;
  tabR[i] = tabR[i - 1] + rollSpeed(u) * (U / N) * TURNS * 2 * Math.PI;
  tabD[i] = tabD[i - 1] + dumpSpeed(u) * (U / N) * 1.4 * 2 * Math.PI;
}
const integral = (tab, u) => { const x = clamp(u / U, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return lerp(tab[i], tab[i + 1], x - i); };

function state(step, sp, reduced) {
  const e = (a, b) => (reduced ? 1 : smooth(a, b, sp));
  const u = step + (reduced ? 1 : sp);
  let ext = 1, fold = 0, sA = A.start, sB = B.start;
  if (step === 0) ext = 0;
  else if (step === 1) ext = e(0.05, 0.8);
  else if (step === 2) fold = FOLD * e(0.3, 0.85);
  else if (step === 3) { fold = FOLD; sA = lerp(A.start, A.hold, e(0.3, 0.8)); sB = lerp(B.start, B.hold, e(0.45, 0.95)); }
  else if (step === 4) { fold = FOLD * (1 - e(0.15, 0.7)); sA = A.hold; sB = B.hold; }
  else if (step === 5) { ext = 1 - e(0.3, 0.9); sA = A.hold; sB = B.hold; }
  else { ext = 0; sA = lerp(A.hold, A.end, e(0.3, 0.8)); sB = lerp(B.hold, B.end, e(0.42, 0.95)); }
  return { ext, fold, sA, sB, riding: step >= 3, spin: reduced ? 0 : integral(tabR, u), dspin: reduced ? 0 : integral(tabD, u) };
}

// per step: the view it settles on (and so its section cut)
const VIEW = ['stow', 'reach', 'intake', 'side', 'side', 'stow', 'transfer'];
// The stowed and extending side views (seen from -X) hide the left outer drive plate (plateL, model
// x -0.1981 to -0.1949), so the left slides show whole where the plate covers them; slide A's outer
// body is right behind it, from x -0.19488 (SLIDE_X). The intake and the transfer are cut by a
// section plane at x = -0.028 (CUT_X), keeping x >= -0.028: it cuts the ramp, the counter roller,
// the pixels and the dumper's tray, and passes just outside the middle star rollers and the nearer
// rear roller, which stay whole behind it.
const CUT_X = -0.028, SLIDE_X = -0.1949, TOP_Y = 0.15;
const CUT_AT = { side: CUT_X, transfer: CUT_X };
const PLATE_OFF = { stow: true, reach: true };

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const R = await rigRobot(stage);
  const { model, pixels } = R;
  const reduced = ctx.reducedMotion;
  const intake = stage.part(INTAKE, model);

  // ---- views, framed once at rest (extended, arm up; pixels at their start) and cached per aspect
  const box = (z0, z1, y1, w = 0.12) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, y1, z1 - z0)); m.position.set(0, y1 / 2, (z0 + z1) / 2); m.updateMatrixWorld(true); return m; };
  const sideBox = box(0.9, 1.37, 0.19); // the intake from the side, with the pixels on the floor ahead
  const stowBox = box(-0.26, 0.205, 0.43, 0.42); // the robot, front to back, floor to top of the lift, side to side
  const reachBox = box(-0.26, 1.37, 0.43, 0.42); // the robot and the full reach, with the pixels ahead
  const transferBox = box(-0.27, 0.09, 0.17); // the dumper and the back of the retracted ramp
  const place = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  const pA = [0, 0, 0], pB = [0, 0, 0];
  function putPixels(st) {
    const dz = st.riding ? R.car.position.z : 0;
    at(st.sA, pA); at(st.sB, pB);
    pixels[0].position.set(0, pA[1], pA[0] + dz); pixels[0].rotation.set(pA[2] * DEG, 0, 0);
    pixels[1].position.set(0, pB[1], pB[0] + dz); pixels[1].rotation.set(pB[2] * DEG, 0, 0);
    pixels[0].visible = pixels[1].visible = true;
    const key = `${pixels[0].position.z}|${pixels[0].position.y}|${pixels[1].position.z}|${pixels[1].position.y}`;
    if (key !== pixKey) { pixKey = key; stage.invalidate(); }
  }
  let pixKey = '';
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const portrait = a < 0.9;
    // stage.frame fits each view into the part of the stage the step cards leave free
    R.pose({ ext: 1 }); putPixels(state(0, 0, true)); // at rest, pixels at their start
    const fr = (obj, azimuth, elevation, pad) => place(stage.frame(obj, { azimuth, elevation, pad, apply: false, refresh: true }));
    views = {
      stow: fr(stowBox, -90, 3, portrait ? 1.0 : 1.04),
      // a straight side view of the whole reach would be a thin sliver, so it is seen from the front quarter
      reach: portrait ? fr(reachBox, -38, 24, 0.95) : fr(reachBox, -62, 14, 1.0),
      intake: fr([...intake, ...pixels], -48, 22, portrait ? 1.0 : 1.05),
      side: fr(sideBox, -90, 4, portrait ? 0.98 : 1.1),
      transfer: fr(transferBox, -90, 6, portrait ? 0.98 : 1.1),
    };
    return views;
  }
  const sph = new THREE.Spherical();
  function blend(a, b, k) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sph.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sph).add(target), target });
  }

  // ---- section planes, made at mount parked outside the model and switched off when not cutting.
  // The side cut keeps x >= its plane (CUT_AT) and sweeps in from outside the robot (x = -0.32) or
  // from one plane to the next; for the transfer a second, level cut keeps y <= 0.15 m so the lift
  // and the hubs above the dumper do not fill the picture.
  const OUT = -0.32;
  let cut = stage.sectionPlane([1, 0, 0], -OUT, { enabled: false }), top = null;
  function setCut(x, amountTop) {
    if (x <= OUT + 0.001) cut.enable(false);
    else { cut.enable(true); cut.set(-x); } // keeps x >= x
    if (amountTop <= 0.001) { if (top) top.enable(false); }
    else {
      if (!top) top = stage.sectionPlane([0, -1, 0], 1);
      top.enable(true);
      top.set(lerp(0.8, TOP_Y, amountTop)); // keeps y <= constant
    }
  }

  // ---- labels: one per step at most
  const ov = labelLayer(stage);
  const slideBox = new THREE.Box3().setFromObject(stage.part(/^anim_cx_slide3$/, model)[0]);
  const LBL = {
    1: ov.label('Pixels, 3 in across', [0, 0, 0], { side: 'l' }),
    2: ov.label('Three slides open in a row', [0, 0, 0], { side: 'l' }),
    5: ov.label('Front ends in line', [SLIDE_X, 0.142, SLIDE_FRONT], { color: ORANGE, side: 'l' }),
    6: ov.label('Back ends in line', [SLIDE_X, 0.122, SLIDE_FRONT - SLIDE_LEN], { color: ORANGE, side: 'l' }),
    3: ov.label('Front rollers fold down', [0, 0, 0], { side: 'l' }),
    4: ov.label('Counter roller', [0, 0, 0]),
    7: ov.label('Into the 4-bar dumper', [0, 0, 0]),
  };
  const fw = new THREE.Vector3();
  const ramp = stage.part(/^anim_cx_ramp$/, model), tray = stage.part(/^anim_cx_tray$/, model);
  const plateL = stage.part(/^anim_cx_plateL$/, model);
  let plateShown = true;
  let litNow = 0, unlit = [];

  function setProgress(p, step = 0, stepP = 0) {
    const vs = viewsNow();
    const st = state(step, stepP, reduced);
    R.pose({ ext: st.ext, fold: st.fold, spin: st.spin, dspin: st.dspin });
    putPixels(st);

    // camera: blend from the previous step's view over the first 45 % of this one
    const k = reduced ? 1 : smooth(0, 0.45, stepP);
    const cur = vs[VIEW[step]], prev = vs[VIEW[Math.max(0, step - 1)]];
    blend(prev, cur, step === 0 ? 1 : k);
    stage.setShift(...ctx.shift()); // the model right of the step cards
    const cutX = (i) => CUT_AT[VIEW[i]] ?? OUT;
    const tA = step > 0 && VIEW[step - 1] === 'transfer' ? 1 : 0, tB = VIEW[step] === 'transfer' ? 1 : 0;
    setCut(lerp(cutX(Math.max(0, step - 1)), cutX(step), step === 0 ? 1 : k), lerp(tA, tB, step === 0 ? 1 : k));
    // the left outer drive plate is hidden in the side views of the slides (switched halfway through the blend)
    const offA = !!PLATE_OFF[VIEW[Math.max(0, step - 1)]], offB = !!PLATE_OFF[VIEW[step]];
    const shown = !(step === 0 || k >= 0.5 ? offB : offA);
    if (shown !== plateShown) { plateShown = shown; for (const o of plateL) o.visible = shown; stage.invalidate(); }

    // labels
    const dz = R.car.position.z;
    LBL[1].p.set(0, pA[1] + 0.02, (st.riding ? pA[0] + dz : pA[0]));
    LBL[2].p.set(slideBox.min.x + 0.006, (slideBox.min.y + slideBox.max.y) / 2, slideBox.max.z - 0.1 + dz);
    R.groups.gF.getWorldPosition(fw); LBL[3].p.copy(fw);
    LBL[4].p.set(CUT_X, AX.C[1], AX.C[2] + dz);
    LBL[7].p.set(CUT_X, 0.1, -0.16);
    // the transfer: the ramp and the dumper's tray lit, so the line-up reads
    const lit = step === 6 ? Math.round(10 * (reduced ? 1 : smooth(0.1, 0.4, stepP))) / 10 : 0;
    if (lit !== litNow) {
      litNow = lit;
      unlit.forEach((f) => f()); unlit = [];
      if (lit > 0) unlit = [stage.highlight(ramp, ORANGE, { intensity: 0.5 * lit }), stage.highlight(tray, BLUE, { intensity: 0.45 * lit })];
    }
    const show = (i, a) => { LBL[i].a = a; };
    const kin = reduced ? 1 : smooth(0.35, 0.6, stepP), kout = reduced ? 1 : 1 - smooth(0.85, 1, stepP);
    const ends = step === 0 ? 1 : step === 5 ? (reduced ? 1 : smooth(0.88, 0.97, stepP)) : 0; // the slide ends, once closed
    show(5, ends);
    show(6, ends);
    show(1, step === 1 ? 1 - kin : 0);
    show(2, step === 1 ? kin : 0);
    show(3, step === 2 ? kin : 0);
    show(4, step === 3 ? kin * kout : 0);
    show(7, step === 6 ? smooth(0.5, 0.75, reduced ? 1 : stepP) : 0);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

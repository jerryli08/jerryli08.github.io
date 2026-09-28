// One full cycle of the STEAM Carnival robot on Jerry's real CAD, driven only by the scroll, in the
// order he gave: stowed, extend, grab two pixels, retract, pivot, extend again, deposit. Pixels are
// picked up in front and scored over the back of the robot (Jerry, Sept 27).
//
// Every part moves about or along its real axis (rig.js). The pixels are props, not CAD; the backdrop
// is the official CENTERSTAGE backdrop's CAD (rig.js, loadBackdrop), standing on the robot's floor
// just behind it. At the up preset the wrist turns the claw so the pixels lie parallel to the
// backdrop's 60 degree face; the slides then run out until the pixels are right over two of the
// notches in the frame's bottom edge, and on release they drop straight down into them, still
// parallel to the face. (At the code's up preset, 105 degrees from flat, the arm leans back less
// than the face does, so with the robot's back against the backdrop the claw cannot reach the face
// itself: the pixels drop the last part.) The picture is a pure function of (step, progress through the step): scrolling back
// plays it backwards and nothing moves on its own. Views are framed once with the robot at rest,
// cached per stage aspect, and blended. With reduced motion each step cuts to its end pose.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { blendIn, smoother } from '/assets/js/lib/ease.js';
import { rigRobot, pixelGeometry, loadBackdrop, BD_TILT, BD_LIP, FLOOR, PHI_UP, TRAVEL } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = smoother; // quintic: every motion starts and stops with zero speed and acceleration
const lerp = (a, b, t) => a + (b - a) * t;

// poses (degrees; e 0 = slides in, 1 = all the way out)
const PHI_REST = 4; // arm just off the floor with the slides in
const PHI_FLOOR = 0.8; // at full reach this sets the claw on the floor (the CAD pose has it 20 mm below)
// wrist at the up preset: the claw turns the way the arm pitches, over the top, until the pixels'
// faces are parallel to the backdrop's face. The pixels were picked up flat with the arm at
// PHI_FLOOR, so their faces turn by (PHI_UP + W_UP - PHI_FLOOR) about X in all: 360 - 60 degrees.
const W_UP = 360 - BD_TILT - PHI_UP + PHI_FLOOR; // 195.4
const OPEN = 28; // finger opening, degrees each, outward from the CAD pose (closed on two pixels)
const ROBOT_BACK = -0.228; // the back bumper, from my CAD (456 mm long with the bumpers)
const GAP = 0.012; // between the bumper and the backdrop frame's lowest front edge

// the state at the end of every step and how the step gets there (m = the motion window's progress)
function state(step, sp, reduced, eDep) {
  const m = reduced ? 1 : smooth(0.35, 0.97, sp);
  const s = { phi: PHI_REST, e: 0, wrist: 0, grip: [OPEN, OPEN], held: false, fall: 0 };
  if (step === 1) { s.e = m; s.phi = lerp(PHI_REST, PHI_FLOOR, m); }
  if (step === 2) {
    // open (fingers out, clear of the pixels) to closed (the CAD pose, hooked in front of them)
    s.e = 1; s.phi = PHI_FLOOR;
    const a = reduced ? 1 : smooth(0.4, 0.66, sp), b = reduced ? 1 : smooth(0.7, 0.96, sp);
    s.grip = [OPEN * (1 - a), OPEN * (1 - b)];
  }
  if (step >= 3) { s.grip = [0, 0]; s.held = true; }
  if (step === 3) {
    const lift = reduced ? 1 : smooth(0.3, 0.45, sp), pull = reduced ? 1 : smooth(0.45, 0.97, sp);
    s.phi = lerp(PHI_FLOOR, PHI_REST, lift); s.e = 1 - pull;
  }
  if (step === 4) { s.phi = lerp(PHI_REST, PHI_UP, m); s.wrist = W_UP * m; }
  if (step >= 5) { s.phi = PHI_UP; s.wrist = W_UP; s.e = step === 5 ? eDep * m : eDep; }
  if (step === 6) {
    const o = reduced ? 1 : smooth(0.3, 0.46, sp);
    s.grip = [OPEN * o, OPEN * o];
    s.held = false; s.fall = reduced ? 1 : clamp((sp - 0.46) / 0.46, 0, 1);
  }
  return s;
}

const VIEW = ['wide', 'wide', 'claw', 'wide', 'side', 'deposit', 'drop'];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const R = await rigRobot(stage);
  const { model } = R;
  const reduced = ctx.reducedMotion;

  // ---- two pixels (props) and the official backdrop, behind the robot, centred on the pixel pair
  const geo = pixelGeometry(THREE);
  const pixels = ['#f4f2ec', '#f2c230'].map((color) => {
    const p = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
    p.castShadow = p.receiveShadow = true; p.matrixAutoUpdate = false; p.name = 'prop-pixel';
    model.add(p); return p;
  });
  const H = 0.0127 / 2;
  // on the floor under the claw at full reach, one against each finger (claw centre x = -0.039)
  const floorPos = [new THREE.Vector3(-0.0775, FLOOR + H, 1.431), new THREE.Vector3(-0.0005, FLOOR + H, 1.431)];
  const floorQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); // flats toward the fingers
  const bd = await loadBackdrop(stage, model, { x: (floorPos[0].x + floorPos[1].x) / 2, edgeZ: ROBOT_BACK - BD_LIP - GAP });
  // the backdrop only comes in once the arm pitches toward it (step 4): a fade of its own materials
  const bdMats = [];
  bd.obj.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (!bdMats.includes(m)) bdMats.push(m); });
  let bdShown = -1;
  function showBackdrop(a) {
    a = Math.round(a * 50) / 50;
    if (a === bdShown) return;
    bdShown = a;
    bd.obj.visible = a > 0;
    for (const m of bdMats) {
      const t = a < 1;
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
      m.opacity = a;
    }
    stage.invalidate();
  }

  // held: fixed in the wrist's frame, measured once in the grab pose
  const inv = new THREE.Matrix4();
  const toModel = (worldM, out) => out.copy(inv.copy(model.matrixWorld).invert()).multiply(worldM);
  R.pose({ phi: PHI_FLOOR, e: 1, wrist: 0, grip: [0, 0] });
  model.updateMatrixWorld(true);
  const wristInModel = () => toModel(R.wrist.matrixWorld, new THREE.Matrix4());
  const W0inv = wristInModel().invert();
  const heldLocal = floorPos.map((p) => W0inv.clone().multiply(new THREE.Matrix4().compose(p, floorQ, new THREE.Vector3(1, 1, 1))));
  const heldAt = (s) => {
    R.pose(s); model.updateMatrixWorld(true);
    const Wm = wristInModel();
    return heldLocal.map((L) => { const pos = new THREE.Vector3(), q = new THREE.Quaternion(); Wm.clone().multiply(L).decompose(pos, q, new THREE.Vector3()); return { pos, q }; });
  };

  // how far the slides run out at the backdrop: until the pixels are right over their notches
  // (the pixels' distance back from the robot grows with the extension; bisection)
  const restZ = bd.rest(0).z;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2, h = heldAt({ phi: PHI_UP, e: mid, wrist: W_UP, grip: [0, 0] });
    if ((h[0].pos.z + h[1].pos.z) / 2 > restZ) lo = mid; else hi = mid;
  }
  const E_DEP = (lo + hi) / 2;
  // released: from where the claw lets go, straight down into the notch, parallel to the face all the way
  const release = heldAt({ phi: PHI_UP, e: E_DEP, wrist: W_UP, grip: [0, 0] });
  const land = release.map(({ pos }) => bd.rest(pos.x));

  const pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), M = new THREE.Matrix4();
  let pixKey = '';
  function placePixels(s, step) {
    const onFloor = !s.held && step < 6;
    const Wm = onFloor ? null : wristInModel();
    pixels.forEach((p, i) => {
      if (onFloor) p.matrix.compose(floorPos[i], floorQ, one);
      else if (s.fall <= 0) p.matrix.copy(M.copy(Wm).multiply(heldLocal[i]));
      else {
        // a scripted fall (a function of the scroll, not physics): slow off the fingers, then faster
        const r = release[i], l = land[i], f = clamp(s.fall, 0, 1);
        pv.copy(r.pos).lerp(l, f);
        pv.y = lerp(r.pos.y, l.y, f * f);
        p.matrix.compose(pv, r.q, one);
      }
      p.matrixWorldNeedsUpdate = true;
    });
    const key = `${step}|${s.fall}`;
    if (key !== pixKey) { pixKey = key; stage.invalidate(); } // the rig's own moves invalidate already
  }

  // ---- rest pose, ground fitted once: on the robot's floor, sized to take in the backdrop too
  // (its legs stand outside the field, 17.5 mm lower; lifted onto the floor for the fit only)
  R.pose({ phi: PHI_REST, e: 0, wrist: 0, grip: [OPEN, OPEN] });
  placePixels(state(0, 0, true, E_DEP), 0);
  const bdY = bd.obj.position.y;
  bd.obj.position.y = FLOOR; bd.obj.updateMatrixWorld(true);
  stage.fitGround();
  bd.obj.position.y = bdY; bd.obj.updateMatrixWorld(true);

  // ---- views: framed once at rest, cached per aspect (never on the moving arm)
  const boxOf = (x0, x1, y0, y1, z0, z1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.updateMatrixWorld(true); return m;
  };
  const BOX = {
    wide: boxOf(-0.24, 0.19, FLOOR, 0.2, -0.26, 1.5), // the robot, the reach and the pixels
    claw: boxOf(-0.17, 0.09, FLOOR, 0.1, 1.3, 1.5),
    side: boxOf(-0.37, 0.29, FLOOR, 0.95, -0.86, 0.5), // the arm swinging over the back, the whole backdrop
    deposit: boxOf(-0.04, 0.29, 0.5, 1.08, -0.86, -0.2), // side on, cut through the claw: the pixel and the face
    drop: boxOf(-0.3, 0.2, FLOOR, 1.08, -0.86, 0.25), // down into the bottom row
  };
  const place = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    // keyed on the camera's own aspect, the one stage.frame fits to (the stage updates it from a
    // ResizeObserver, a moment after the element changes size)
    const a = stage.camera.aspect;
    if (views && a === aspect) return views;
    aspect = a;
    const portrait = a < 0.9, narrow = el.clientWidth < 600;
    const fr = (obj, azimuth, elevation, pad) => place(stage.frame(obj, { azimuth, elevation, pad, apply: false, refresh: true }));
    views = {
      // seen from the robot's left (-X), so the arm reaches to the right, away from the step cards
      // looking partly along the arm foreshortens the long reach, so the robot comes out bigger
      wide: fr(BOX.wide, narrow ? -36 : -44, narrow ? 28 : 24, portrait ? 1.0 : 1.02),
      claw: fr(BOX.claw, -40, 28, portrait ? 1.1 : 1.3),
      side: fr(BOX.side, -82, 10, portrait ? 1.0 : 1.04),
      deposit: fr(BOX.deposit, -90, 0, portrait ? 1.0 : 1.04),
      drop: fr(BOX.drop, -64, 12, portrait ? 1.0 : 1.02),
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

  // ---- readout: how far the slides are out and how far the arm has pitched
  const ov = labelLayer(stage);
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.style.width = 'min(250px, calc(100% - 28px))';
  if (el.clientWidth < 600) hud.style.display = 'none'; // phones: the small stage stays for the model (the cards give the numbers)
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Slides out</span><b class="num" data-k="e"></b><i><em data-k="eBar"></em></i></div>
    <div class="rx-hud-row" style="margin-top:8px"><span>Arm pitch, from flat</span><b class="num" data-k="phi"></b><i><em data-k="phiBar"></em></i></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { K[k].textContent = t; shown[k] = t; } };
  const bar = (k, f) => { const w = `${(clamp(f, 0, 1) * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } };
  const L = {
    pixels: ov.label('Two pixels (added, not CAD)', [-0.039, FLOOR + 0.03, 1.431], { side: 'l' }),
    align: ov.label('Pixels parallel to the backdrop\'s 60° face', release[0].pos.clone().lerp(release[1].pos, 0.5).toArray(), { side: 'l' }),
    backdrop: ov.label('Official CENTERSTAGE backdrop (field CAD)', bd.plane.point.clone().addScaledVector(bd.plane.up, 0.8).setX(bd.plane.point.x - 0.33).toArray(), { minW: 420 }),
  };

  // step 6 (reach again): a section through the claw's middle, between the two pixels (x = -0.039,
  // keeping x >= -0.039), so the held pixel and the backdrop are both cut at the same depth and the
  // side view shows the pixel's face parallel to the backdrop's; it opens again before the drop
  const CUT_X = -(floorPos[0].x + floorPos[1].x) / 2;
  let cut = null;
  function setCut(amount) {
    if (amount <= 0.001) { if (cut) cut.enable(false); return; }
    if (!cut) cut = stage.sectionPlane([1, 0, 0], 1.6);
    cut.enable(true);
    cut.set(lerp(1.6, CUT_X, amount));
  }

  function setProgress(p, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, 6);
    const s = state(step, stepP, reduced, E_DEP);
    R.pose(s);
    model.updateMatrixWorld(true);
    placePixels(s, step);
    const vs = viewsNow();
    const k = step === 0 || reduced ? 1 : blendIn(stepP);
    blend(vs[VIEW[Math.max(0, step - 1)]], vs[VIEW[step]], k);
    stage.setShift(...ctx.shift());
    put('e', `${Math.round(s.e * TRAVEL * 1000)} mm`); bar('eBar', s.e);
    put('phi', `${Math.round(s.phi)}°`); bar('phiBar', s.phi / PHI_UP);
    showBackdrop(step < 4 ? 0 : step > 4 || reduced ? 1 : smooth(0.05, 0.45, stepP));
    L.pixels.a = step === 0 ? 1 : step === 1 ? 1 - smooth(0.5, 0.9, stepP) : 0;
    L.backdrop.a = step === 4 ? smooth(0.3, 0.55, reduced ? 1 : stepP) * (1 - smooth(0.88, 1, reduced ? 0 : stepP)) : 0;
    L.align.a = step === 5 ? smooth(0.6, 0.8, reduced ? 1 : stepP) : step === 6 && !reduced ? 1 - smooth(0.02, 0.15, stepP) : 0;
    setCut(step === 5 ? (reduced ? 1 : smooth(0.15, 0.55, stepP)) : step === 6 && !reduced ? 1 - smooth(0.04, 0.3, stepP) : 0);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

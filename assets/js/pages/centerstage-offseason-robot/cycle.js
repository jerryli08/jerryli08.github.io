// One full cycle of the STEAM Carnival robot on Jerry's real CAD, driven only by the scroll, in the
// order he gave: stowed, extend, grab two pixels, retract, pivot, extend again, deposit. Pixels are
// picked up in front and scored over the back of the robot (Jerry, Sept 27).
//
// Every part moves about or along its real axis (rig.js). The pixels, the backdrop and its posts are
// props, not CAD. The picture is a pure function of (step, progress through the step): scrolling back
// plays it backwards and nothing moves on its own. Views are framed once with the robot at rest,
// cached per stage aspect, and blended. With reduced motion each step cuts to its end pose.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { blendIn, smoother } from '/assets/js/lib/ease.js';
import { rigRobot, pixelGeometry, backdrop, FLOOR, PHI_UP, TRAVEL } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = smoother; // quintic: every motion starts and stops with zero speed and acceleration
const lerp = (a, b, t) => a + (b - a) * t;

// poses (degrees; e 0 = slides in, 1 = all the way out)
const PHI_REST = 4; // arm just off the floor with the slides in
const PHI_FLOOR = 0.8; // at full reach this sets the claw on the floor (the CAD pose has it 20 mm below)
const W_UP = 104; // wrist at the up preset: fingers point back over the robot and down at the backdrop
const E_DEP = 0.22; // slides out again, over the backdrop
const OPEN = 28; // finger opening, degrees each

// the state at the end of every step and how the step gets there (m = the motion window's progress)
function state(step, sp, reduced) {
  const m = reduced ? 1 : smooth(0.35, 0.97, sp);
  const s = { phi: PHI_REST, e: 0, wrist: 0, grip: [OPEN, OPEN], held: false, fall: 0 };
  if (step === 1) { s.e = m; s.phi = lerp(PHI_REST, PHI_FLOOR, m); }
  if (step === 2) {
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
  if (step >= 5) { s.phi = PHI_UP; s.wrist = W_UP; s.e = step === 5 ? E_DEP * m : E_DEP; }
  if (step === 6) {
    const o = reduced ? 1 : smooth(0.35, 0.5, sp);
    s.grip = [OPEN * o, OPEN * o];
    s.held = false; s.fall = reduced ? 1 : clamp((sp - 0.45) / 0.5, 0, 1);
  }
  return s;
}

const VIEW = ['wide', 'wide', 'claw', 'wide', 'side', 'side', 'drop'];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const R = await rigRobot(stage);
  const { model } = R;
  const reduced = ctx.reducedMotion;

  // ---- props: two pixels and the backdrop
  const geo = pixelGeometry(THREE);
  const pixels = ['#f4f2ec', '#f2c230'].map((color) => {
    const p = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
    p.castShadow = p.receiveShadow = true; p.matrixAutoUpdate = false; p.name = 'prop-pixel';
    model.add(p); return p;
  });
  const bd = backdrop(THREE);
  model.add(bd.group);
  // the backdrop only comes in once the arm pitches toward it (step 5): a fade of its own materials
  const bdMats = [];
  bd.group.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (!bdMats.includes(m)) { m.transparent = true; bdMats.push(m); } });
  let bdShown = -1;
  function showBackdrop(a) {
    a = Math.round(a * 50) / 50;
    if (a === bdShown) return;
    bdShown = a;
    bd.group.visible = a > 0;
    for (const m of bdMats) m.opacity = a;
    stage.invalidate();
  }
  const H = 0.0127 / 2;
  // on the floor under the claw at full reach, one against each finger (claw centre x = -0.039)
  const floorPos = [new THREE.Vector3(-0.0775, FLOOR + H, 1.431), new THREE.Vector3(-0.0005, FLOOR + H, 1.431)];
  const floorQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); // flats toward the fingers

  // held: fixed in the wrist's frame, measured once in the grab pose
  const inv = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const toModel = (worldM, out) => out.copy(inv.copy(model.matrixWorld).invert()).multiply(worldM);
  R.pose({ phi: PHI_FLOOR, e: 1, wrist: 0, grip: [0, 0] });
  model.updateMatrixWorld(true);
  const wristInModel = () => toModel(R.wrist.matrixWorld, new THREE.Matrix4());
  const W0inv = wristInModel().invert();
  const heldLocal = floorPos.map((p) => W0inv.clone().multiply(new THREE.Matrix4().compose(p, floorQ, new THREE.Vector3(1, 1, 1))));

  // released: where each pixel ends up on the backdrop, and its orientation lying on the face
  R.pose({ phi: PHI_UP, e: E_DEP, wrist: W_UP, grip: [0, 0] });
  model.updateMatrixWorld(true);
  const Wd = wristInModel();
  const release = heldLocal.map((L) => {
    const M = Wd.clone().multiply(L), pos = new THREE.Vector3(), q = new THREE.Quaternion();
    M.decompose(pos, q, new THREE.Vector3());
    return { pos, q };
  });
  const { point: B0, normal: N, up: U } = bd.plane;
  const restQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0), N.clone(), new THREE.Vector3(1, 0, 0).cross(N).normalize()));
  const land = release.map(({ pos }) => {
    // straight down from the release point onto the face (plane through B0 with normal N)
    const t = (pos.clone().sub(B0).dot(N) - H) / N.y;
    const hit = pos.clone().setY(pos.y - t);
    // then it slides down the face onto the lip at the bottom
    const lip = B0.clone().addScaledVector(U, 0.0381 + 0.016).addScaledVector(N, H).setX(pos.x);
    const up = hit.clone().sub(B0).dot(U) > lip.clone().sub(B0).dot(U) ? hit : lip;
    return { hit: up, lip };
  });

  const pv = new THREE.Vector3(), pq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), M = new THREE.Matrix4();
  let pixKey = '';
  function placePixels(s, step) {
    const onFloor = !s.held && step < 6;
    const Wm = onFloor ? null : wristInModel();
    pixels.forEach((p, i) => {
      if (onFloor) p.matrix.compose(floorPos[i], floorQ, one);
      else if (s.fall <= 0) p.matrix.copy(M.copy(Wm).multiply(heldLocal[i]));
      else {
        // released: a scripted fall onto the face (a function of the scroll, not physics), then a
        // short slide down the face onto the lip
        const r = release[i], l = land[i];
        const f1 = clamp(s.fall / 0.62, 0, 1), f2 = clamp((s.fall - 0.62) / 0.38, 0, 1);
        pv.copy(r.pos).lerp(l.hit, f1);
        pv.y = lerp(r.pos.y, l.hit.y, f1 * f1); // slow off the fingers, then faster
        pv.lerp(l.lip, smooth(0, 1, f2));
        pq.copy(r.q).slerp(restQ, smooth(0, 0.8, f1));
        p.matrix.compose(pv, pq, one);
      }
      p.matrixWorldNeedsUpdate = true;
    });
    const key = `${step}|${s.fall}`;
    if (key !== pixKey) { pixKey = key; stage.invalidate(); } // the rig's own moves invalidate already
  }

  // ---- rest pose, ground fitted once
  R.pose({ phi: PHI_REST, e: 0, wrist: 0, grip: [OPEN, OPEN] });
  placePixels(state(0, 0, true), 0);
  stage.fitGround();

  // ---- views: framed once at rest, cached per aspect (never on the moving arm)
  const boxOf = (x0, x1, y0, y1, z0, z1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.updateMatrixWorld(true); return m;
  };
  const BOX = {
    wide: boxOf(-0.24, 0.19, FLOOR, 0.2, -0.26, 1.5), // the robot, the reach and the pixels
    claw: boxOf(-0.17, 0.09, FLOOR, 0.1, 1.3, 1.5),
    side: boxOf(-0.24, 0.19, FLOOR, 0.9, -0.6, 0.6), // the arm swinging over the back, the backdrop
    drop: boxOf(-0.24, 0.19, FLOOR, 0.9, -0.6, 0.3),
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
      side: fr(BOX.side, -80, 10, portrait ? 1.0 : 1.04),
      drop: fr(BOX.drop, -64, 14, portrait ? 1.0 : 1.02),
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
    backdrop: ov.label('Backdrop (added, not CAD)', B0.clone().addScaledVector(U, 0.45).setX(-0.31).toArray(), { minW: 420 }),
  };

  function setProgress(p, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, 6);
    const s = state(step, stepP, reduced);
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
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}

// Scroll story for the FRC REBUILT robot (Jerry's checklist): fuel on the left, the robot on the
// right, folded up as it starts a match; scrolling drives the robot over, swings the intake pivot
// down (the front of the hopper rides on the arm and its sprung top panel springs open), shows the
// roller and its belts picking fuel up, drives on toward the hub, cuts a section through the middle
// lane to show the transfer, fires the three shooters and ends on the robot's height under the trench.
//
// Everything is a pure function of (step, stepP), so scrolling back plays it backwards. The robot
// is Jerry's real CAD (see rig.js for every axis). The fuel, the floor, the labels and the
// dimension lines are drawn in as annotations. Each ball the robot picks up is one ball the whole
// way: it waits on the floor until the roller reaches it, goes under the roller and up its back
// against the bumper, is thrown over the ridge at the pivot, rolls down its lane, and is later fed
// up the transfer and shot (fuel-path.js has the path and where every number in it comes from; the
// throw and the shot arcs are drawn, not measured). The camera follows the robot along its path:
// every view is a fixed offset from where the robot is, never fitted to moving parts.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';
import { loadRobot, fuelKit, FLOOR, FUEL_R, LANES, AX, STOW, onArm, onPanel } from './rig.js';
import { intake, fed, arrival, CONTACT, T_ORBIT, T_THROW } from './fuel-path.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// quintic ease: starts and stops with no kick (zero speed and acceleration at both ends), for the camera
const ease = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Travel: straight ahead, front (intake) first. The CAD has the swerve wheels set in an X, and
// the modules' steering parts are not separate in the model, so the robot slides without the
// wheels steering or turning rather than turning them about a wrong axis.
const D = V(0, 0, 1);
const AZ_D = Math.atan2(D.x, D.z) / DEG;
const A0 = AZ_D + 90; // side view from +X: the direction of travel points left on screen

// travel distances (m)
const S1 = 1.2, S2 = 2.12, S3 = 3.25;
const CENTER = V(0.292, 0.16, -0.16); // middle of the robot, model frame
const Y_FUEL = FLOOR + FUEL_R;
const TOP = 0.493; // top of the robot in the CAD (22.0 in above the floor)
const TRENCH = FLOOR + 22.25 * 0.0254; // the trench opening
const V0 = 7.2, T_PER = 0.28; // shot speed and flight time per unit of feed: drawn, not measured
const LANE_OFF = [0.33, 0, 0.66]; // left, middle, right: middle lane first, then alternate
// The fuel the robot picks up: three for each lane (middle, left, right in turn), touching the
// roller one after another as the robot drives on, at scroll U0 + i DU (in steps). Three balls in a
// lane are DU * 3 apart, which keeps them a ball apart along the path.
const U0 = 3.38, DU = 0.075, LANE_ORDER = [1, 0, 2];

// 0 start, 1 drive, 2 intake pivot, 3 intake, 4 to the hub, 5 transfer, 6 shooters, 7 22 inches
const travel = (step, t) => {
  if (step <= 0) return 0;
  if (step === 1) return S1 * smooth(0.12, 1, t);
  if (step === 2) return S1;
  if (step === 3) return lerp(S1, S2, smooth(0.3, 1, t));
  if (step === 4) return lerp(S2, S3, smooth(0.15, 0.9, t));
  return S3;
};

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const rig = await loadRobot(stage);
  const { model } = rig;
  const reduced = !!ctx.reducedMotion;
  const ov = labelLayer(stage);

  // ---------------------------------------------------------------- the drawn-in world
  const world = new THREE.Group(); world.name = 'annotations';
  stage.scene.add(world);
  const kit = fuelKit();

  // floor: a soft disc with a faint half-metre grid (drawn in; the field is not modelled)
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g2 = cv.getContext('2d');
  const grad = g2.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(237,232,226,0.10)'); grad.addColorStop(0.7, 'rgba(237,232,226,0.05)'); grad.addColorStop(1, 'rgba(237,232,226,0)');
  g2.fillStyle = grad; g2.fillRect(0, 0, 512, 512);
  g2.globalCompositeOperation = 'destination-out';
  g2.strokeStyle = 'rgba(0,0,0,0.45)'; g2.lineWidth = 1.2;
  for (let i = 0; i <= 512; i += 512 / 16) { g2.beginPath(); g2.moveTo(i, 0); g2.lineTo(i, 512); g2.stroke(); g2.beginPath(); g2.moveTo(0, i); g2.lineTo(512, i); g2.stroke(); }
  const floorTex = new THREE.CanvasTexture(cv); floorTex.colorSpace = THREE.SRGBColorSpace;
  const floorMat = new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = -2;
  const mid = D.clone().multiplyScalar(S3 * 0.45).add(V(0.3, 0, 0));
  floor.position.set(mid.x, FLOOR - 0.002, mid.z);
  world.add(floor);

  // fuel the robot picks up, each placed on the floor where the roller will first touch it
  const R = rng(2856);
  // (the draws the pile's layout was made with before this path existed, so the rest of the pile keeps its place)
  for (let n = [], tries = 0; n.length < 9 && tries < 500; tries++) {
    const x = lerp(0.08, 0.5, R()), z = lerp(1.32, 1.83, R());
    if (!n.some(([a, b]) => Math.hypot(a - x, b - z) < 2 * FUEL_R + 0.012)) n.push([x, z]);
  }
  const jitter = rng(8568);
  const fuel = [];
  for (let i = 0; i < 9; i++) {
    const lane = LANE_ORDER[i % 3], uc = U0 + DU * i;
    const xc = LANES[lane] + (jitter() - 0.5) * 0.016; // lanes are 169 mm apart: neighbours never touch
    const B = D.clone().multiplyScalar(travel(3, uc - 3)).add(V(xc, Y_FUEL, CONTACT[1]));
    const m = kit.ball(); world.add(m);
    fuel.push({ lane, k: Math.floor(i / 3), uc, xc, B, m, done: arrival(Math.floor(i / 3)) });
  }
  // the rest of the pile, outside the strip the robot sweeps (so nothing drives through a ball)
  const swept = (B) => {
    for (let s = 0; s <= S3; s += 0.02) {
      const x = B.x - D.x * s, z = B.z - D.z * s, pad = FUEL_R + 0.03;
      if (x > -0.127 - pad && x < 0.711 + pad && z > -0.711 - pad && z < 0.41 + pad) return true;
    }
    return false;
  };
  const pileC = D.clone().multiplyScalar(1.835).add(V(0.3, Y_FUEL, 0.36)); // the middle of the pile
  const decor = [];
  for (let tries = 0; decor.length < 24 && tries < 6000; tries++) {
    // both sides of the strip the robot clears, more of them on the far side from the camera
    const far = R() < 0.85, dx = 0.3 + (FUEL_R + 0.08) + R() * 0.75;
    const B = V(pileC.x + (far ? -1 : 1) * dx + (far ? -0.1 : 0.1), Y_FUEL, pileC.z + (R() - 0.5) * 1.5);
    if (swept(B) || [...decor, ...fuel].some((p) => p.B.distanceTo(B) < 2 * FUEL_R + 0.01)) continue;
    const m = kit.ball(); m.material = kit.mat.clone(); m.material.transparent = true; m.position.copy(B);
    world.add(m);
    decor.push({ B, m });
  }
  // the last step's lines (annotations), moved with the robot: its height and the trench opening, seen side on
  const inside = new THREE.Group(); world.add(inside);
  const dims = new THREE.Group(); dims.visible = false; inside.add(dims);
  const lineMat = new THREE.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true });
  const trenchMat = new THREE.LineDashedMaterial({ color: '#8fc3ff', dashSize: 0.03, gapSize: 0.02, depthTest: false, transparent: true });
  const seg = (pts, mat = lineMat) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => V(...p))), mat); l.computeLineDistances(); l.renderOrder = 10; dims.add(l); };
  const DX = 0.8, DZ = -0.8;
  seg([[DX, FLOOR, DZ], [DX, TOP, DZ]]); seg([[DX - 0.05, FLOOR, DZ], [DX + 0.05, FLOOR, DZ]]); seg([[DX - 0.05, TOP, DZ], [DX + 0.05, TOP, DZ]]);
  seg([[DX, TOP, -0.8], [DX, TOP, 0.42]]);
  seg([[DX, TRENCH, -1.0], [DX, TRENCH, 0.6]], trenchMat);

  // section plane, parked where it cuts nothing (no recompiles when it moves)
  const cut = stage.sectionPlane([1, 0, 0], 1000);
  rig.fixClear();
  // the fuel inside the robot is cut by the same section, so the middle lane shows its balls in half
  kit.mat.clippingPlanes = [cut.plane]; kit.mat.side = THREE.DoubleSide; kit.mat.needsUpdate = true;

  // ---------------------------------------------------------------- the story as a function of scroll
  const armAt = (step, t) => (step < 2 ? STOW : step === 2 ? lerp(STOW, 0, smooth(0.12, 0.88, t)) : 0);
  // in the last step the fuel already in the air flies on out of the picture (every ball has left
  // the shooter by 3.66; the last one is out of flight by about 7.6) instead of vanishing mid-air
  const conveyor = (step, t) => (step < 5 ? 0 : step === 5 ? 0.8 * smooth(0.3, 1, t) : step === 6 ? lerp(0.8, 4.6, smooth(0.08, 0.95, t)) : lerp(4.6, 8, smooth(0, 0.6, t)));

  // camera for each step: target (model frame plus the robot offset), azimuth, elevation, and the size to fit
  const views = [
    (o) => ({ target: o.clone().add(CENTER).lerp(pileC, 0.5).setY(0.14), az: A0, el: 18, w: o.clone().add(CENTER).distanceTo(pileC) + 1.9, h: 0.95 }),
    (o) => ({ target: o.clone().add(CENTER).addScaledVector(D, 0.45), az: A0 - 12, el: 17, w: 2.5, h: 0.95 }),
    (o) => ({ target: o.clone().add(V(0.6, 0.3, -0.06)), az: 100, el: 10, w: 1.3, h: 0.95 }),
    (o) => ({ target: o.clone().add(V(0.02, 0.125, 0.04)), az: -78, el: 9, w: 0.78, h: 0.46 }),
    // front quarter: the swing from the intake close-up comes round the front, not past the hoods
    (o) => ({ target: o.clone().add(CENTER).addScaledVector(D, 0.3), az: 40, el: 24, w: 2.3, h: 1.1 }),
    (o) => ({ target: o.clone().add(V(0.3, 0.3, -0.39)), az: 90, el: 3, w: 0.62, h: 0.58 }),
    (o) => ({ target: o.clone().add(V(0.3, 0.62, -0.1)), az: 122, el: 20, w: 1.5, h: 1.55 }),
    (o) => ({ target: o.clone().add(V(0.4, 0.22, -0.2)), az: 90, el: 0, w: 1.75, h: 0.72 }),
  ];
  // Each view is placed once as a pose (target, azimuth, elevation, distance) and the camera eases
  // from the last step's pose to this one's over most of the step (CAM_IN), so a change of view is
  // one slow, even move that starts and stops gently. The distance is blended, not the sizes to fit,
  // so the move has no kink where the fit switches from the width to the height.
  const CAM_IN = [0, 0.85];
  const fov = stage.camera.fov * DEG;
  function pose(v, shift) {
    const aspect = el.clientWidth / Math.max(1, el.clientHeight);
    const tv = Math.tan(fov / 2), th = tv * aspect;
    // the part of the stage the step cards leave free (the whole stage on a phone), with a margin
    const fw = (1 - 2 * Math.min(0.4, Math.abs(shift[0]))) * 0.96, fh = (1 - 2 * Math.min(0.4, Math.abs(shift[1]))) * 0.94;
    const dist = Math.max(v.h / (2 * tv * fh), v.w / (2 * th * fw)) + 0.1;
    return { target: v.target, az: v.az, el: v.el, dist };
  }
  function blend(a, b, k) {
    let dAz = b.az - a.az; while (dAz > 180) dAz -= 360; while (dAz < -180) dAz += 360;
    return { target: a.target.clone().lerp(b.target, k), az: a.az + dAz * k, el: lerp(a.el, b.el, k), dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), k)) };
  }
  function viewAt(step, t, o, shift) {
    const cur = pose(views[step](o), shift);
    const ps = step === 0 || reduced ? cur : blend(pose(views[step - 1](o), shift), cur, ease(CAM_IN[0], CAM_IN[1], t));
    const az = ps.az * DEG, e = ps.el * DEG;
    const dir = V(Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e));
    return { pos: ps.target.clone().addScaledVector(dir, ps.dist), target: ps.target };
  }

  // labels: made once, moved and faded by the scroll (o: robot offset, a: arm angle)
  const P = (o, x, y, z) => [o.x + x, o.y + y, o.z + z];
  const PA = (o, x, y, z, a) => { const [yy, zz] = onArm(y, z, a); return P(o, x, yy, zz); };
  const PP = (o, x, y, z, a) => { const [yy, zz] = onPanel(y, z, a); return P(o, x, yy, zz); };
  const LAB = [
    [0, 'Intake folded inside the bumpers', (o, a) => PA(o, 0.6, AX.roller[0], AX.roller[1], a), 'l'],
    [2, 'NEO, 25:1 MAXPlanetary, 12T sprocket', (o) => P(o, 0.59, AX.gearbox[0], AX.gearbox[1]), 'l', 'NEO, 25:1, 12T'],
    [2, 'Encoder on a 24T sprocket', (o) => P(o, 0.59, AX.encoder[0], AX.encoder[1])],
    [2, '40T sprocket on the arm', (o) => P(o, 0.59, AX.pivot[0], AX.pivot[1]), 'l'],
    [2, 'Top panel, sprung', (o, a) => PP(o, 0.586, 0.45, 0.343, a)],
    [2, 'Roller', (o, a) => PA(o, 0.6, AX.roller[0], AX.roller[1], a)],
    [3, 'NEO 2.0', (o) => P(o, 0.045, 0.06, -0.21), 'l'],
    [3, '12T to 24T belt', (o) => P(o, 0.02, 0.15, -0.1), 'l'],
    [3, 'Pivot axis', (o) => P(o, 0, AX.pivot[0], AX.pivot[1])],
    [3, '24T to 24T belt', (o) => P(o, 0.006, 0.19, 0.08)],
    [3, 'Roller', (o) => P(o, 0.02, AX.roller[0], AX.roller[1])],
    [5, '3D printed hood', (o) => P(o, 0.2955, 0.47, -0.588)],
    [5, 'Flywheel', (o) => P(o, 0.2955, AX.fly[0], AX.fly[1]), 'l'],
    [5, 'Upper flex wheels', (o) => P(o, 0.2955, AX.upper[0], AX.upper[1]), 'l'],
    [5, 'Lower flex wheels', (o) => P(o, 0.2955, AX.lower[0], AX.lower[1]), 'l'],
    [5, 'Bent backing', (o) => P(o, 0.2955, 0.09, -0.585)],
    [5, 'Lane ramp', (o) => P(o, 0.2955, 0.13, -0.27), 'l'],
    [6, 'Kraken X60', (o) => P(o, 0.47, 0.3, -0.35)],
    [6, '4 in flywheels', (o) => P(o, 0.13, 0.43, -0.42), 'l'],
    [7, 'Robot 22.0 in', (o) => P(o, DX, (FLOOR + TOP) / 2, DZ), 'l'],
    [7, 'Trench opening 22.25 in', (o) => P(o, DX, TRENCH, -0.3)],
  ].map(([step, text, at, side, short]) => ({ step, at, text, short, l: ov.label(text, [0, 0, 0], { color: '#fff1e2', side }) }));
  // a shorter text for a label that would run off a phone-width stage
  let narrow = null;
  const fitLabels = () => {
    const n = el.clientWidth < 520;
    if (n === narrow) return;
    narrow = n;
    for (const x of LAB) if (x.short) x.l.setText(n ? x.short : x.text);
  };

  // what is lit in each step (moving parts only; the static ones get labels). The lit parts and the
  // labels of a step fade in once its view has nearly settled (SHOW), and fade out at the start of
  // the next step (HIDE), so a hand-off between two cards never changes the picture.
  const HL = { 1: ['bumpers', 'swerve'], 2: ['gearboxSprocket', 'chain', 'encSprocket', 'fold'], 3: ['motorBelt', 'rollerBelt', 'motorPulley', 'pivotShaft'], 5: ['lower', 'upper'], 6: ['fly'] };
  const SHOW = [0.45, 0.65], HIDE = [0, 0.14], GLOW = 0.55;
  const lit = new Map(); // step -> { clear, mats, k }
  function light(s, k) {
    let h = lit.get(s);
    if (!(k > 0.001)) { if (h) { h.clear(); lit.delete(s); rig.fixClear(); } return; }
    if (!h) {
      const ps = rig.parts(HL[s]);
      const clear = stage.highlight(ps, '#ff6b35', { intensity: GLOW * k });
      const mats = [];
      for (const q of ps) q.traverse((m) => { if (m.isMesh) for (const x of [].concat(m.material)) if (x.emissive) mats.push(x); });
      h = { clear, mats, k }; lit.set(s, h);
      rig.fixClear();
    }
    if (h.k !== k) { h.k = k; for (const m of h.mats) m.emissiveIntensity = GLOW * k; stage.invalidate(false); }
  }
  // how much of step s shows while step `step` is at t: its own things come in, the last step's go out
  const shown = (s, step, t) => (s === step ? (reduced ? 1 : smooth(SHOW[0], SHOW[1], t)) : s === step - 1 && !reduced ? 1 - smooth(HIDE[0], HIDE[1], t) : 0);

  const tmp = new THREE.Vector3();
  let lastS = -1;
  function setProgress(p, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, 7);
    const t = reduced ? 0.7 : clamp(stepP, 0, 1); // reduced motion: one still pose per step
    const s = travel(step, t);
    const o = D.clone().multiplyScalar(s);
    model.position.copy(o);
    inside.position.copy(o);
    if (s !== lastS) { lastS = s; stage.fitGround(); }

    // mechanisms
    const u = step + t;
    const a = armAt(step, t);
    rig.setArm(a);
    rig.setRoller(28 * clamp(u - 2.7, 0, 2)); // positive: the bottom of the roller moves back, pulling fuel under it
    rig.setTransfer(26 * clamp(u - 5, 0, 2));
    rig.setFly(70 * clamp(u - 5.4, 0, 1.6));

    // the fuel: on the floor until the roller reaches it, then through the intake into its lane,
    // then fed up the transfer and shot
    const q = conveyor(step, t);
    for (const f of fuel) {
      const m = f.m, tau = u - f.uc;
      let sq = 1, dir = 0;
      if (tau < 0) m.position.copy(f.B);
      else if (tau < f.done && step < 5) {
        const [y, z, sqz, d, stage] = intake(tau, f.k);
        // sideways from where it was picked up to the middle of its lane while it is thrown
        const x = stage === 0 ? f.xc : stage === 1 ? lerp(f.xc, LANES[f.lane], smooth(0, 1, (tau - T_ORBIT) / T_THROW)) : LANES[f.lane];
        m.position.set(o.x + x, o.y + y, o.z + z);
        sq = sqz; dir = d;
      } else {
        const x = f.k - clamp(q - LANE_OFF[f.lane], 0, 9);
        const [y, z, sqz, d] = fed(x, T_PER, V0);
        m.position.set(o.x + LANES[f.lane], o.y + y, o.z + z);
        m.visible = !(x < -1 && (-1 - x) * T_PER > 1.1);
        if (!m.visible) continue;
        sq = sqz; dir = d;
      }
      m.visible = true;
      // squeezed (by the roller, the flex wheels or the flywheel): flatter along the squeeze, a little wider across it
      const w = sq < 1 ? Math.pow(sq, -0.3) : 1;
      m.rotation.x = Math.PI / 2 - dir;
      m.scale.set(w, sq, w);
    }

    // camera: clear of the step cards on a desktop (they cover the left); the text is below on a phone
    const shift = ctx.shift();
    stage.setShift(...shift);
    const view = viewAt(step, t, o, shift);
    // decor fuel in front of the camera fades so it never hides the mechanism
    const cam = view.pos, tgt = view.target;
    const ab = tgt.clone().sub(cam), len = ab.length(); ab.normalize();
    // (graded, not switched, so no ball pops in or out as the camera moves past it)
    const gone = step === 7 ? smooth(0, 0.35, t) : 0; // the last step is a clean side elevation
    for (const d of decor) {
      tmp.copy(d.m.position).sub(cam);
      const along = tmp.dot(ab), off = tmp.addScaledVector(ab, -along).length();
      const r = FUEL_R + 0.06 * (along / len) + 0.02;
      const inFront = smooth(0, 0.08, along) * (1 - smooth(len - 0.18, len - 0.04, along));
      const block = inFront * (1 - smooth(r, r + 0.08, off));
      // close-ups: between the camera and the robot
      const near = (1 - smooth(2.2, 2.6, len)) * smooth(0, 0.08, along) * (1 - smooth(len - 0.45, len - 0.28, along));
      const a = (1 - Math.max(0.92 * block, 0.82 * near)) * (1 - gone);
      d.m.material.opacity = a;
      d.m.visible = a > 0.005;
    }

    // section: the intake step from the roller-motor side, the transfer step through the middle lane;
    // each sweeps in during its step and back out at the start of the next, never switched off
    const cutIn = smooth(0.04, 0.32, t), cutOut = reduced ? 1 : smooth(0, 0.3, t);
    if (step === 3) { cut.setNormal([1, 0, 0]); cut.set(lerp(0.9, 0.002, cutIn) - o.x); }
    else if (step === 4 && cutOut < 1) { cut.setNormal([1, 0, 0]); cut.set(lerp(0.002, 0.9, cutOut) - o.x); }
    else if (step === 5) { cut.setNormal([-1, 0, 0]); cut.set(o.x + lerp(1.2, LANES[1], cutIn)); }
    else if (step === 6 && cutOut < 1) { cut.setNormal([-1, 0, 0]); cut.set(o.x + lerp(LANES[1], 1.2, cutOut)); }
    else cut.set(1000);

    for (const s of Object.keys(HL)) light(+s, shown(+s, step, t));
    const dimA = step === 7 ? shown(7, step, t) : 0;
    dims.visible = dimA > 0.001;
    lineMat.opacity = trenchMat.opacity = dimA;
    stage.setView(view);
    fitLabels();
    for (const x of LAB) { x.l.a = shown(x.step, step, t); if (x.l.a > 0) x.l.p.set(...x.at(o, a)); }
    ov.update();
  }

  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); for (const h of lit.values()) h.clear(); lit.clear(); kit.dispose(); floorTex.dispose(); floorMat.dispose(); lineMat.dispose(); trenchMat.dispose(); stage.dispose(); },
  };
}

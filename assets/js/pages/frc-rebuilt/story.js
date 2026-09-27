// Scroll story for the FRC REBUILT robot (Jerry's checklist): fuel on the left, the robot on the
// right, folded up as it starts a match; scrolling drives the robot over, swings the intake pivot
// down (the front of the hopper rides on the arm and its top panel unfolds), shows the roller and
// its belts picking fuel up, drives on toward the hub, cuts a section through the middle lane to
// show the transfer, fires the three shooters and ends on the robot's height under the trench.
//
// Everything is a pure function of (step, stepP), so scrolling back plays it backwards. The robot
// is Jerry's real CAD (see rig.js for every axis). The fuel, the floor, the labels and the
// dimension lines are drawn in as annotations; fuel paths inside the robot follow the CAD's lane
// ramps, transfer wheels, backing and hood, and the shot arcs are drawn, not measured.
import { createStage } from '/assets/js/lib/stage.js';
import * as THREE from 'three';
import { loadRobot, fuelKit, G, FLOOR, FUEL_R, LANES, AX, STOW } from './rig.js';
import { createLabels } from './labels.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Travel: straight ahead, front (intake) first. The CAD has the swerve wheels set in an X, and
// the modules' steering parts are not separate in the export, so the robot slides without the
// wheels steering or turning rather than turning them about a wrong axis.
const D = V(0, 0, 1);
const AZ_D = Math.atan2(D.x, D.z) / DEG;
const A0 = AZ_D + 90; // side view from +X: the direction of travel points left on screen

// travel distances (m)
const S1 = 1.2, SC0 = 1.32, SC1 = 1.95, S2 = 2.12, S3 = 3.25;
const CENTER = V(0.292, 0.16, -0.16); // middle of the robot, model frame
const Z_PICK = 0.36; // fuel centre (model z) where it meets the roller
const Y_FUEL = FLOOR + FUEL_R;
const TOP = 0.493; // top of the robot in the CAD (22.0 in above the floor)
const TRENCH = FLOOR + 22.25 * 0.0254; // the trench opening

// fuel slots in each lane (y, z in the model frame), from the CAD's surfaces:
// 0 in the curve of the backing above the lane ramp, 1 and 2 resting on the ramp (15.6 degree slope)
const SLOTS = [[0.16, -0.5], [0.1743, -0.351], [0.2147, -0.2065]];
// up through the transfer: touching the lower flex wheels and the backing, the upper wheels, the
// flywheel squeezed against the hood, and the hood's top edge, whose tangent sets the exit direction
const LIFT = [[0.16, -0.5], [0.2065, -0.52], [0.2985, -0.526], [0.377, -0.538], [0.495, -0.555]];
const EXIT = V(0, 0.894, 0.447); // tangent of the hood's top edge in the CAD
const V0 = 7.2, T_PER = 0.28; // drawn, not measured
const LANE_OFF = [0.33, 0, 0.66]; // left, middle, right: middle lane first, then alternate

// a point on the arm (y, z in the deployed pose) after the arm turns by a about the pivot axis
const onArm = (y, z, a) => {
  const c = Math.cos(a), s = Math.sin(a), dy = y - AX.pivot[0], dz = z - AX.pivot[1];
  return [AX.pivot[0] + c * dy - s * dz, AX.pivot[1] + s * dy + c * dz];
};

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const rig = await loadRobot(stage);
  const { model } = rig;
  const reduced = !!ctx.reducedMotion;
  const labels = createLabels(el);

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
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = -2;
  const mid = D.clone().multiplyScalar(S3 * 0.45).add(V(0.3, 0, 0));
  floor.position.set(mid.x, FLOOR - 0.002, mid.z);
  world.add(floor);

  // fuel the robot picks up: each meets the roller at its own point across the roller's width
  const R = rng(2856);
  const picks = [];
  for (let tries = 0; picks.length < 9 && tries < 500; tries++) {
    const xc = lerp(0.08, 0.5, R()), sc = lerp(SC0, SC1 - 0.12, R());
    const B = D.clone().multiplyScalar(sc).add(V(xc, Y_FUEL, Z_PICK));
    if (picks.some((p) => p.B.distanceTo(B) < 2 * FUEL_R + 0.012)) continue;
    picks.push({ xc, sc, B });
  }
  picks.sort((a, b) => a.sc - b.sc);
  for (const p of picks) {
    p.m = kit.ball(); p.m.material = kit.mat.clone(); p.m.material.transparent = true;
    world.add(p.m);
  }
  // the rest of the pile, outside the strip the robot sweeps (so nothing drives through a ball)
  const swept = (B) => {
    for (let s = 0; s <= S3; s += 0.02) {
      const x = B.x - D.x * s, z = B.z - D.z * s, pad = FUEL_R + 0.03;
      if (x > -0.127 - pad && x < 0.711 + pad && z > -0.711 - pad && z < 0.41 + pad) return true;
    }
    return false;
  };
  const pileC = D.clone().multiplyScalar((SC0 + SC1) / 2 + 0.2).add(V(0.3, Y_FUEL, Z_PICK));
  const decor = [];
  for (let tries = 0; decor.length < 24 && tries < 6000; tries++) {
    // both sides of the strip the robot clears, more of them on the far side from the camera
    const far = R() < 0.85, dx = 0.3 + (FUEL_R + 0.08) + R() * 0.75;
    const B = V(pileC.x + (far ? -1 : 1) * dx + (far ? -0.1 : 0.1), Y_FUEL, pileC.z + (R() - 0.5) * 1.5);
    if (swept(B) || [...decor, ...picks].some((p) => p.B.distanceTo(B) < 2 * FUEL_R + 0.01)) continue;
    const m = kit.ball(); m.material = kit.mat.clone(); m.material.transparent = true; m.position.copy(B);
    world.add(m);
    decor.push({ B, m });
  }
  // fuel inside the robot: three per lane, moved with the robot
  const inside = new THREE.Group(); world.add(inside);
  const held = [];
  for (let k = 0; k < 3; k++) for (const l of [1, 0, 2]) { const m = kit.ball(); inside.add(m); held.push({ lane: l, k, m }); }

  // the last step's lines (annotations): the robot's height and the trench opening, seen side on
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
  // 0 start, 1 drive, 2 intake pivot, 3 intake, 4 to the hub, 5 transfer, 6 shooters, 7 22 inches
  const travel = (step, t) => {
    if (step <= 0) return 0;
    if (step === 1) return S1 * smooth(0.12, 1, t);
    if (step === 2) return S1;
    if (step === 3) return lerp(S1, S2, smooth(0.3, 1, t));
    if (step === 4) return lerp(S2, S3, smooth(0.15, 0.9, t));
    return S3;
  };
  const armAt = (step, t) => (step < 2 ? STOW : step === 2 ? lerp(STOW, 0, smooth(0.12, 0.88, t)) : 0);
  const slot = (lane, x) => {
    // x >= 0: along the lane (slot index); -1..0: up through the transfer; < -1: in flight
    if (x >= 0) { const i = Math.min(1, Math.floor(x)), f = clamp(x - i, 0, 1); const a = SLOTS[Math.min(2, i)], b = SLOTS[Math.min(2, i + 1)]; return V(LANES[lane], lerp(a[0], b[0], f), lerp(a[1], b[1], f)); }
    if (x >= -1) { const u = -x * (LIFT.length - 1), i = Math.min(LIFT.length - 2, Math.floor(u)), f = u - i; return V(LANES[lane], lerp(LIFT[i][0], LIFT[i + 1][0], f), lerp(LIFT[i][1], LIFT[i + 1][1], f)); }
    const t = (-1 - x) * T_PER, e = LIFT[LIFT.length - 1];
    return V(LANES[lane], e[0] + V0 * EXIT.y * t - 4.905 * t * t, e[1] + V0 * EXIT.z * t);
  };
  const conveyor = (step, t) => (step < 5 ? 0 : step === 5 ? 0.8 * smooth(0.3, 1, t) : step === 6 ? lerp(0.8, 4.6, smooth(0.08, 0.95, t)) : 4.6);

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
  const fov = stage.camera.fov * DEG;
  function place(v) {
    const aspect = el.clientWidth / Math.max(1, el.clientHeight);
    const portrait = aspect < 1;
    const usableH = portrait ? 0.62 : 1, usableW = portrait ? 1 : 0.7; // step cards cover part of the stage
    const tv = Math.tan(fov / 2), th = tv * aspect;
    const dist = Math.max(v.h / (2 * tv * usableH), v.w / (2 * th * usableW)) + 0.1;
    const az = v.az * DEG, e = v.el * DEG;
    const dir = V(Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e));
    return { pos: v.target.clone().addScaledVector(dir, dist), target: v.target };
  }
  function blend(a, b, t) {
    let dAz = b.az - a.az; while (dAz > 180) dAz -= 360; while (dAz < -180) dAz += 360;
    return { target: a.target.clone().lerp(b.target, t), az: a.az + dAz * t, el: lerp(a.el, b.el, t), w: Math.exp(lerp(Math.log(a.w), Math.log(b.w), t)), h: Math.exp(lerp(Math.log(a.h), Math.log(b.h), t)) };
  }

  const P = (o, x, y, z) => [o.x + x, o.y + y, o.z + z];
  const PA = (o, x, y, z, a) => { const [yy, zz] = onArm(y, z, a); return P(o, x, yy, zz); };
  const LABELS = {
    0: (o, a) => [{ text: 'Intake folded inside the bumpers', p: PA(o, 0.6, AX.roller[0], AX.roller[1], a), side: 'l' }],
    2: (o, a) => [
      { text: 'NEO, 25:1 MAXPlanetary, 12T sprocket', p: P(o, 0.59, 0.1186, -0.1206), side: 'l' },
      { text: 'Encoder on a 24T sprocket', p: P(o, 0.59, AX.encoder[0], AX.encoder[1]) },
      { text: '40T sprocket on the arm', p: P(o, 0.59, AX.pivot[0], AX.pivot[1]), side: 'l' },
      { text: 'Top panel, sprung', p: PA(o, 0.586, 0.43, 0.343, a) },
      { text: 'Roller', p: PA(o, 0.6, AX.roller[0], AX.roller[1], a) },
    ],
    3: (o) => [
      { text: 'NEO 2.0', p: P(o, 0.045, 0.06, -0.21), side: 'l' },
      { text: '12T to 24T belt', p: P(o, 0.02, 0.15, -0.1), side: 'l' },
      { text: 'Pivot axis', p: P(o, 0, AX.pivot[0], AX.pivot[1]) },
      { text: '24T to 24T belt', p: P(o, 0.006, 0.19, 0.08) },
      { text: 'Roller', p: P(o, 0.02, AX.roller[0], AX.roller[1]) },
    ],
    5: (o) => [
      { text: '3D printed hood', p: P(o, 0.2955, 0.47, -0.588) },
      { text: 'Flywheel', p: P(o, 0.2955, 0.377, -0.421), side: 'l' },
      { text: 'Upper flex wheels', p: P(o, 0.2955, 0.2985, -0.432), side: 'l' },
      { text: 'Lower flex wheels', p: P(o, 0.2955, 0.2065, -0.424), side: 'l' },
      { text: 'Bent backing', p: P(o, 0.2955, 0.09, -0.585) },
      { text: 'Lane ramp', p: P(o, 0.2955, 0.13, -0.27), side: 'l' },
    ],
    6: (o) => [
      { text: 'Kraken X60', p: P(o, 0.47, 0.3, -0.35) },
      { text: '4 in flywheels', p: P(o, 0.13, 0.43, -0.42), side: 'l' },
    ],
    7: (o) => [
      { text: 'Robot 22.0 in', p: P(o, DX, (FLOOR + TOP) / 2, DZ), side: 'l' },
      { text: 'Trench opening 22.25 in', p: P(o, DX, TRENCH, 0.5) },
    ],
  };
  const HL = {
    1: ['bumpers'], 2: ['gearbox', 'chain', 'gearboxSprocket', 'pivotSprocket', 'encoder', 'encSprocket', 'topPanel'], 3: ['motorBelt', 'rollerBelt', 'motorPulley'],
    5: ['feeders'], 6: ['flyWheels', 'hoods'],
  };
  let hlStep = -1, unlight = null;
  function highlightFor(step) {
    if (step === hlStep) return;
    hlStep = step;
    unlight?.(); unlight = null;
    const keys = HL[step];
    if (keys) {
      const list = keys.flatMap((k) => rig.parts(G[k]));
      if (step === 1) list.push(...rig.swerve);
      unlight = stage.highlight(list, '#ff6b35', { intensity: 0.55 });
      rig.fixClear();
    }
  }

  const tmp = new THREE.Vector3();
  let last = [0, 0];
  function setProgress(p, step = 0, stepP = 0) {
    last = [step, stepP];
    step = clamp(step | 0, 0, 7);
    const t = reduced ? 0.7 : clamp(stepP, 0, 1); // reduced motion: one still pose per step
    const s = travel(step, t);
    const o = D.clone().multiplyScalar(s);
    model.position.copy(o);
    inside.position.copy(o);
    stage.fitGround();

    // mechanisms
    const u = step + t;
    const a = armAt(step, t);
    rig.setArm(a);
    rig.setRoller(28 * clamp(u - 2.7, 0, 2));
    rig.setTransfer(26 * clamp(u - 5, 0, 2));
    rig.setFly(70 * clamp(u - 5.4, 0, 1.6));

    // fuel on the floor: taken in when the roller reaches it
    let taken = 0;
    for (const f of picks) {
      const k = (s - f.sc) / 0.14;
      if (k <= 0) { f.m.visible = true; f.m.position.copy(f.B); f.m.material.opacity = 1; f.m.scale.setScalar(1); continue; }
      if (k >= 1) { f.m.visible = false; taken++; continue; }
      f.m.visible = true;
      f.m.position.set(o.x + f.xc, lerp(Y_FUEL, Y_FUEL + 0.035, k), o.z + lerp(Z_PICK, 0.24, k));
      f.m.material.opacity = 1 - k;
      f.m.scale.setScalar(lerp(1, 0.8, k));
    }
    // fuel held in the lanes, then lifted and shot
    const q = conveyor(step, t);
    held.forEach((h, i) => {
      const shown = i < taken || step >= 4;
      const x = h.k - clamp(q - LANE_OFF[h.lane], 0, 9);
      const pos = slot(h.lane, x);
      const flying = x < -1, gone = flying && ((-1 - x) * T_PER > 1.1 || step >= 7);
      h.m.visible = shown && !gone && !(step === 5 && h.lane === 2);
      h.m.position.copy(pos);
    });

    // decor fuel in front of the camera fades so it never hides the mechanism
    const v = blendView(step, t, o);
    const view = place(v);
    const cam = view.pos, tgt = view.target;
    const ab = tgt.clone().sub(cam), len = ab.length(); ab.normalize();
    for (const d of decor) {
      tmp.copy(d.m.position).sub(cam);
      const along = tmp.dot(ab), off = tmp.addScaledVector(ab, -along).length();
      const block = along > 0 && along < len - 0.1 && off < FUEL_R + 0.06 * (along / len) + 0.02;
      const near = len < 2.4 && along > 0 && along < len - 0.35; // close-ups: between the camera and the robot
      d.m.material.opacity = block ? 0.08 : near ? 0.18 : 1;
      d.m.visible = step < 7; // the last step is a clean side elevation
    }

    // section: the intake step from the roller-motor side, the transfer step through the middle lane
    const cutIn = smooth(0.04, 0.32, t);
    if (step === 3) { cut.setNormal([1, 0, 0]); cut.set(lerp(0.9, 0.002, cutIn) - o.x); }
    else if (step === 5) { cut.setNormal([-1, 0, 0]); cut.set(o.x + lerp(1.2, LANES[1], cutIn)); }
    else cut.set(1000);

    highlightFor(step);
    dims.visible = step === 7;

    const portrait = el.clientHeight > el.clientWidth;
    stage.setShift(portrait ? 0 : 0.15, portrait ? 0.2 : 0);
    stage.setView(view);
    const lab = LABELS[step];
    labels.set(lab ? lab(o, a) : []);
    labels.opacity(lab ? (reduced ? 1 : smooth(0.3, 0.45, t)) : 0);
    labels.update(stage.camera);
  }
  function blendView(step, t, o) {
    const cur = views[step](o);
    if (step === 0 || reduced) return cur;
    return blend(views[step - 1](o), cur, smooth(0, 0.34, t));
  }

  setProgress(0, 0, 0);
  const ro = new ResizeObserver(() => setProgress(0, last[0], last[1]));
  ro.observe(el);
  return {
    setProgress,
    dispose() { ro.disconnect(); labels.dispose(); unlight?.(); kit.dispose(); floorTex.dispose(); lineMat.dispose(); trenchMat.dispose(); stage.dispose(); },
  };
}

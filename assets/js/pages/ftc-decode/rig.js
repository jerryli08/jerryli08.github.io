// Shared rig for the ftc-decode scrollies: loads Jerry's CAD, pivots the moving parts about their
// real axes, and holds the helpers every scrolly here uses (cached views, the readout panel, balls
// that stay whole inside a section cut).
//
// The two robots share one chassis. A part-by-part comparison of the two CAD files (vertex count
// and world bounding box of every body) sorted them: every part that is identical and in the same
// place in both is in chassis.glb; the parts only V1 has are in v1top.glb, the parts only V2 has
// are in v2top.glb. Coordinates are the CAD's own (metres, Y up): robot front (intake) = +Z,
// robot left = +X, centreline x = -0.036, floor y = -0.052 (bottom of the 104 mm mecanum wheels).
//
// Axes (from tools/cad-axes.py on the STEP, or from the bounding box of a part that is round
// about its axis, such as a servo hub):
//  - turret yaw: vertical through (x -0.036, z -0.060), the centre of the turntable bearing's
//    bolt circles
//  - 90T gears under the turret: vertical through the servo splines, (x -0.1552, z 0.0164) and
//    (0.0834, 0.0164)
//  - V2 flywheel: +X through (y 0.267, z -0.160), the flywheel bore
//  - V2 hood: the same axis (its toothed outer edge is an arc centred on the flywheel axle)
//  - V2 40T hood pinion: +X through (y 0.353, z 0.026)
//  - V2 flywheel motor bevels: +Z through (x 0.0649, y 0.267) and (x -0.1369, y 0.267)
//  - V2 TPU transfer spinners: the centres and axes of their hole patterns
//  - V1 flywheel: +X through (y 0.2495, z -0.1728); V1 gate: vertical through its servo hub
//    (x 0.0275, z -0.0027); V1 feed wheels: +Z through (x -0.1425, y 0.1913) and (0.0705, 0.1913);
//    V1 hood flap: +X through its servo hub (y 0.355, z -0.006)
//  - intake roller and mecanum wheels: their own centres (round parts)
import { assetUrl } from '/assets/js/lib/stage.js';

export const DEG = Math.PI / 180;
export const MODELS = '/assets/models/ftc-decode/';
export const FLOOR_Y = -0.052;
export const CENTRE = { x: -0.036, z: 0.0025 }; // middle of the footprint
export const BALL_R = 0.0635; // 127 mm artifact in the CAD
export const MID_X = -0.036; // the robot's centreline, where the balls run

// gear data measured from the CAD (tooth counts counted in the meshes, radii fitted)
export const RING_T = 150, SERVO_T = 90; // turret ring gear, the two gears that mesh with it
export const HOOD_RACK_R = 0.1805, PINION_R = 0.0236; // pitch radii, metres
export const V2 = {
  yaw: { x: -0.036, z: -0.060 },
  fly: { y: 0.267, z: -0.160, r: 0.036 },
  hoodEnd: 50, // degrees: angle of the hood's upper end about the flywheel axle, as modelled
  ballPathR: 0.096, // ball centre radius about the flywheel axle while pinched under the hood
};
// V1: the fixed hood's inner surface sits 0.170 m from the flywheel axle and ends about 32
// degrees up from horizontal (angles measured about the axle from the robot's front toward up).
// The flap on the Swyft servo continues the same arc to 52 degrees when it is down, as modelled.
export const V1 = {
  fly: { y: 0.2495, z: -0.1728, r: 0.048 },
  ballPathR: 0.106, // 0.170 hood radius minus the 63.5 mm ball radius
  hoodEndDown: 52, hoodEndUp: 32,
  flap: { y: 0.355, z: -0.006, up: 20 }, // the up angle is illustrative; the axis is the servo's
  gate: { x: 0.0275, z: -0.0027, open: 70 }, // open angle illustrative; axis is the servo's
  feedL: { x: -0.1425, y: 0.1913 }, feedR: { x: 0.0705, y: 0.1913 },
  intakeWheelD: 0.048, // compliant wheels on the intake shaft; 36T to 36T belt from the motor (1:1)
  roller: { y: 0.088, z: 0.2082, r: 0.024 }, // intake shaft centre and wheel radius, from the CAD
};

export async function loadParts(stage, version, o = {}) {
  const top = version === 'v1' ? 'v1top.glb' : 'v2top.glb';
  const [chassis, upper] = await Promise.all([
    stage.load(MODELS + 'chassis.glb', { add: o.add !== false }),
    stage.load(MODELS + top, { add: o.add !== false }),
  ]);
  return { chassis, top: upper };
}

/** First node in `within` whose CAD name ends in `name` (optimize-cad keeps moving parts as anim_ftc_<n>_<name>). */
export function part(stage, within, name) {
  const p = stage.part(new RegExp(`^anim_ftc_\\d+_${name}$`), within)[0];
  if (!p) throw new Error(`ftc-decode: part ${name} not found`);
  return p;
}

/** The V2 CAD has a spare ball in front of the intake, partly below the floor: take it out. */
export function dropMouthBall(stage, top) {
  const m = stage.part(/^anim_ftc_\d+_ball_mouth$/, top)[0];
  if (m) { m.removeFromParent(); stage.fitGround(); }
}

/**
 * Give the balls their own plain material, outside the section cut, so they stay whole balls
 * inside a robot cut in half. Call it after the section plane exists (the plane prepares every
 * material it finds, once). color: optional CSS colour per ball.
 */
export function wholeBalls(stage, balls, colors = []) {
  const THREE = stage.THREE;
  const made = [];
  balls.forEach((b, i) => b.traverse((o) => {
    if (!o.isMesh) return;
    const src = [].concat(o.material)[0];
    const m = new THREE.MeshPhysicalMaterial({
      color: colors[i] || src.color || '#7b3fbf', roughness: 0.55, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5,
    });
    made.push(m);
    o.material = m;
  }));
  return made;
}

// ------------------------------------------------------------------ V2 turret rig
export function rigTurret(stage, chassis, top) {
  const P = (n) => part(stage, top, n);
  const turretParts = ['turret', 'flywheel', 'bevel_l', 'bevel_r', 'hood', 'hood_pinion'].map(P);
  const yaw = stage.pivot(turretParts, [V2.yaw.x, 0.22, V2.yaw.z], [0, 1, 0]);
  // everything below is created at rest, inside the yaw group, so it turns with the turret
  const fly = stage.pivot(P('flywheel'), [0, V2.fly.y, V2.fly.z], [1, 0, 0]);
  const bevR = stage.pivot(P('bevel_r'), [0.0649, 0.267, 0], [0, 0, 1]);
  const bevL = stage.pivot(P('bevel_l'), [-0.1369, 0.267, 0], [0, 0, 1]);
  const hood = stage.pivot(P('hood'), [0, V2.fly.y, V2.fly.z], [1, 0, 0]);
  const pinion = stage.pivot(P('hood_pinion'), [0, 0.353, 0.026], [1, 0, 0]);
  const gearL = stage.pivot(P('servo_gear_l'), [-0.1552, 0.22, 0.0164], [0, 1, 0]);
  const gearR = stage.pivot(P('servo_gear_r'), [0.0834, 0.22, 0.0164], [0, 1, 0]);
  // TPU transfer spinners on continuous rotation servos (centres and axes from their hole patterns)
  const spinners = [
    ['spinner_1', [-0.1225, 0.1693, -0.018], [0, -0.77, -0.64]],
    ['spinner_4', [-0.1225, 0.1513, -0.0331], [0, -0.77, -0.64]],
    ['spinner_2', [0.0505, 0.1655, -0.0212], [0, 0.77, 0.64]],
    ['spinner_3', [0.0505, 0.1475, -0.0363], [0, 0.77, 0.64]],
  ].map(([n, c, d]) => stage.pivot(P(n), c, d));
  const balls = { top: P('ball_top'), mid: P('ball_mid'), low: part(stage, chassis, 'ball_low') };
  let turretAngle = 0, hoodEnd = V2.hoodEnd;
  return {
    yaw, balls,
    ring: [P('turret')], gears: [P('servo_gear_l'), P('servo_gear_r')], hoodParts: [P('hood'), P('hood_pinion')],
    flyParts: [P('flywheel'), P('bevel_l'), P('bevel_r')], spinnerParts: ['spinner_1', 'spinner_2', 'spinner_3', 'spinner_4'].map(P),
    /** turret angle relative to the chassis, radians; both 90T gears counter-rotate 150/90 as far */
    setTurret(a) { turretAngle = a; yaw.setAngle(a); gearL.setAngle((-RING_T / SERVO_T) * a); gearR.setAngle((-RING_T / SERVO_T) * a); },
    get turret() { return turretAngle; },
    /** thetaEnd: angle of the hood's upper end about the flywheel axle, degrees (50 as modelled) */
    setHood(thetaEnd) {
      hoodEnd = thetaEnd;
      const a = (V2.hoodEnd - thetaEnd) * DEG; // +a about +X lowers the hood's end angle by a
      hood.setAngle(a);
      pinion.setAngle(-a * (HOOD_RACK_R / PINION_R)); // external mesh: the pinion turns the other way, 7.65x as far
    },
    get hoodEnd() { return hoodEnd; },
    /** flywheel angle (radians about +X); negative spins the front of the wheel upward, which shoots */
    setFly(a) { fly.setAngle(a); bevR.setAngle(a); bevL.setAngle(-a); }, // 1:1 bevels
    /** turn the four transfer spinners (negative pushes the balls up the ramp) */
    setSpin(a) { for (const s of spinners) s.setAngle(a); },
    /** ball centre (model frame, turret at 0) while it rides under the hood at angle th (degrees) */
    hoodPoint(th, r = V2.ballPathR) { return [V2.yaw.x, V2.fly.y + r * Math.sin(th * DEG), V2.fly.z + r * Math.cos(th * DEG)]; },
    /** a point on the turret (model frame at turret 0) carried to where the turret is now */
    onTurret([x, y, z]) {
      const c = Math.cos(turretAngle), s = Math.sin(turretAngle);
      const dx = x - V2.yaw.x, dz = z - V2.yaw.z;
      return [V2.yaw.x + dx * c + dz * s, y, V2.yaw.z - dx * s + dz * c];
    },
    /** launch direction in the model frame for the current turret and hood */
    launchDir() {
      const th = hoodEnd * DEG;
      const d = [0, Math.cos(th), -Math.sin(th)];
      const c = Math.cos(turretAngle), s = Math.sin(turretAngle);
      return [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c];
    },
  };
}

// ------------------------------------------------------------------ V1 shooter and intake rig
export function rigV1(stage, chassis, top) {
  const P = (n) => part(stage, top, n);
  const fly = stage.pivot(P('flywheel'), [0, V1.fly.y, V1.fly.z], [1, 0, 0]);
  const gate = stage.pivot(P('gate'), [V1.gate.x, 0.27, V1.gate.z], [0, 1, 0]);
  const feedL = stage.pivot(P('feed_l'), [V1.feedL.x, V1.feedL.y, -0.066], [0, 0, 1]);
  const feedR = stage.pivot(P('feed_r'), [V1.feedR.x, V1.feedR.y, -0.066], [0, 0, 1]);
  const flap = stage.pivot(P('flap'), [0, V1.flap.y, V1.flap.z], [1, 0, 0]);
  const intake = stage.pivot(part(stage, chassis, 'intake_roller'), 'center', [1, 0, 0]);
  const balls = { top: P('ball_top'), mid: P('ball_mid'), low: part(stage, chassis, 'ball_low') };
  return {
    balls,
    /** negative about +X: the wheel's front surface moves up, carrying the ball up under the hood */
    setFly(a) { fly.setAngle(a); },
    /** both feed wheels lift the ball: +Z for the wheel on the robot's right, -Z for the left */
    setFeed(a) { feedL.setAngle(a); feedR.setAngle(-a); },
    /** 0 closed (as modelled) .. 1 open */
    setGate(k) { gate.setAngle(k * V1.gate.open * DEG); },
    /** 0 down (as modelled: the hood ends at 52 degrees) .. 1 up (the flap swings clear: 32 degrees) */
    setFlap(k) { flap.setAngle(k * V1.flap.up * DEG); },
    /** positive about +X: the roller's underside moves backward, pulling the ball in under it */
    setIntake(a) { intake.setAngle(a); },
    /** ball centre while it rides the hood at angle th (degrees about the flywheel axle) */
    hoodPoint(th, r = V1.ballPathR) { return [MID_X, V1.fly.y + r * Math.sin(th * DEG), V1.fly.z + r * Math.cos(th * DEG)]; },
  };
}

/**
 * Rest centre of a ball mesh in the model frame. The GLBs are quantized, so each node carries a
 * position and scale that decode its geometry: moves are added to that base position.
 */
export function restCentre(stage, mesh) {
  const THREE = stage.THREE;
  if (!mesh.userData.rest) {
    mesh.userData.base = mesh.position.clone();
    mesh.updateWorldMatrix(true, true);
    const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    mesh.parent.updateWorldMatrix(true, false);
    c.applyMatrix4(new THREE.Matrix4().copy(mesh.parent.matrixWorld).invert());
    mesh.userData.rest = [c.x, c.y, c.z];
  }
  return mesh.userData.rest;
}
/** Put a ball mesh's centre at p (model frame). Returns true if it moved. */
export function placeBall(stage, mesh, p) {
  const r = restCentre(stage, mesh), b = mesh.userData.base;
  const x = b.x + p[0] - r[0], y = b.y + p[1] - r[1], z = b.z + p[2] - r[2];
  if (x === mesh.position.x && y === mesh.position.y && z === mesh.position.z) return false;
  mesh.position.set(x, y, z);
  return true;
}
/** A free copy of a ball (same geometry and decode scale); returns { mesh, place(x, y, z) } in the parent's frame. */
export function ballCopy(stage, src, material) {
  const r = restCentre(stage, src), b = src.userData.base;
  const mesh = src.isMesh ? src : src.getObjectByProperty('isMesh', true);
  const m = new stage.THREE.Mesh(mesh.geometry, material || mesh.material);
  m.scale.copy(src.scale);
  const off = [r[0] - b.x, r[1] - b.y, r[2] - b.z];
  return { mesh: m, place(x, y, z) { m.position.set(x - off[0], y - off[1], z - off[2]); } };
}

// ------------------------------------------------------------------ scrolly helpers
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const mix3 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];

/** Running total of speed(u) over u in [0, U], tabulated once: angle(u) is then a pure function of the scroll. */
export function integrate(speed, U, N = 1200) {
  const table = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) table[i] = table[i - 1] + speed(((i - 0.5) / N) * U) * (U / N);
  return (u) => { const x = clamp(u / U, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return lerp(table[i], table[i + 1], x - i); };
}

/** An invisible box (model metres) to frame a view on: views are framed on fixed regions, never on moving parts. */
export function region(THREE, min, max) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]));
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  m.updateMatrixWorld(true);
  return m;
}

/**
 * Camera views framed once at rest on fixed regions and cached per stage shape; blend(a, b, k)
 * places the camera between two of them (orbiting about the target, the short way round).
 * defs: { key: { obj, azimuth, elevation, dir, pad, offset } }; pad may be a function of the stage.
 */
export function viewSet(stage, el, defs) {
  const THREE = stage.THREE;
  let views = null, shape = '';
  const sph = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  function all() {
    const key = `${el.clientWidth}x${el.clientHeight}`;
    if (!views || key !== shape) {
      shape = key;
      views = {};
      for (const [k, d] of Object.entries(defs)) {
        const pad = typeof d.pad === 'function' ? d.pad(el) : d.pad;
        views[k] = sph(stage.frame(d.obj, { azimuth: d.azimuth, elevation: d.elevation, dir: d.dir, pad, offset: d.offset, apply: false, track: false, refresh: true }));
      }
    }
    return views;
  }
  const sp = new THREE.Spherical(), pos = new THREE.Vector3();
  let last = '';
  function blend(a, b, k, drift = 0) {
    const v = all(), A = v[a], B = v[b];
    let dT = B.s.theta - A.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = A.t.clone().lerp(B.t, k);
    sp.set(lerp(A.s.radius, B.s.radius, k), lerp(A.s.phi, B.s.phi, k), A.s.theta + dT * k + drift);
    pos.setFromSpherical(sp).add(target);
    const sig = `${pos.x.toFixed(5)},${pos.y.toFixed(5)},${pos.z.toFixed(5)},${target.x.toFixed(5)},${target.y.toFixed(5)},${target.z.toFixed(5)}`;
    if (sig === last) return false; // nothing moved: no redraw
    last = sig;
    stage.setView({ pos: pos.clone(), target });
    return true;
  }
  return { blend, all };
}

/** The readout panel (`.rx-hud`) on a label layer: put(k, text), bar(k, 0..1), show(0..1); writes only what changed. */
export function hudPanel(layer, html, style = {}) {
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  Object.assign(hud.style, { opacity: '0', ...style });
  hud.innerHTML = html;
  layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  return {
    el: hud,
    put(k, text) { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } },
    bar(k, f) { const w = `${(clamp(f, 0, 1) * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } },
    show(a) { const s = String(Math.round(clamp(a, 0, 1) * 100) / 100); if (shown._a !== s) { hud.style.opacity = s; hud.style.visibility = s === '0' ? 'hidden' : ''; shown._a = s; } },
  };
}

/** Step and progress to u = step + progress, and the blend weight into this step (a cut with reduced motion). */
export function stepState(step, stepP, n, reduced) {
  step = clamp(step | 0, 0, n - 1);
  const u = clamp(step + stepP, 0, n);
  const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
  return { step, prev: Math.max(0, step - 1), u, k, uu: reduced ? step + 0.999 : u };
}
export { assetUrl };

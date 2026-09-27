// Shared rig for the 2024-25 electric vehicle's final CAD (version two, G10 plates).
// Every rotating part turns about an axis parallel to STEP X. The axes come from
// tools/cad-axes.py on /home/claude/cad_src/scioly_ev_2025_final_ev_2025.step (mm, Z up):
//   rear axle (carbon tube, 48T gear)      y -272.6, z 63.5
//   front axle (carbon tube)               y  250.5, z 63.5
//   motor shaft and 8T pinion              y -244.6, z 63.5
//   40T gear and the encoder shaft         y -220.6, z 64.0
// Kinematics are exact from the tooth counts: the 8T pinion drives the 48T (6 : 1) and the
// 40T (5 : 1), so for a wheel angle theta the motor turns -6 theta and the encoder +1.2 theta.
// The two GT2 belts (47T to 47T) turn the front axle exactly with the rear one.
import { cad } from '/assets/js/lib/stage.js';

export const M = '/assets/models/electric-vehicle';
export const AXES = {
  rear: cad.point([0, -272.6, 63.5]),
  front: cad.point([0, 250.5, 63.5]),
  motor: cad.point([0, -244.6, 63.5]),
  enc: cad.point([0, -220.6, 64.0]),
};
export const XDIR = cad.dir([1, 0, 0]);
export const WHEEL_R = (2.875 * 25.4) / 2000; // m, 2.875 in BaneBots wheel (73.0 mm in the CAD)
export const PITCH_R = (47 * 2) / (2 * Math.PI) / 1000; // 47T GT2 pulley pitch radius, m
export const BELT_X = 0.0636; // belt centre planes, +-x (m)
export const TRACK = 0.3197; // wheel centre to wheel centre, m (CAD)

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Parts of the final model, found by their CAD names (tools/optimize-cad.mjs keeps them named).
 * Each motor keeps one rotor node, its bell (Corps supérieur): the stator, the magnets and the
 * motor mount are merged with the static parts (tools/cad/configs/electric-vehicle-final.json).
 */
export function partsOf(stage, model) {
  const P = (re) => stage.part(re, model);
  return {
    plates: [...P(/shortened_g10_main_plate_1$/), ...P(/shortened_g10_main_plate_2$/)],
    axles: P(/Carbon_Fiber_Axle_Rod/),
    wheels: P(/BaneBots_2_875/),
    hubs: P(/BaneBots_12mm_T81/),
    collars: P(/1515_0015_0120/),
    pulleys: P(/47t_gt2_7mm_pulley/),
    spacers: P(/pocketed_pulley_spacer/),
    belts: P(/1140_2GT_6_for_ev/),
    gear48: P(/Spur_Gear_48_teeth/),
    pinion: P(/Spur_Gear_8_teeth/),
    rotor: P(/Corps_sup_rieur/), // the D2830's bell, the outrunner's rotor
    shaft: P(/_Axe_1$/),
    gear40: P(/Spur_Gear_40_teeth/),
    encShaft: P(/1501_0006_0100/),
    encoder: P(/mt6701_mockup/),
    encMount: P(/MT6701_Mount/),
    btnLaser: P(/Button_d12_1$/), // left (-X): toggles the laser pointer
    btnRun: P(/Button_d12_2$/), // right (+X): starts the run
    laserHolder: P(/_0_1_1_17_$/),
    endPanels: P(/_0_1_1_58_$/), // printed front and rear end panels plus the gearbox housing
    mountPlate: P(/_0_1_1_46_$/), // printed motor mount and the button plate
  };
}

/** Pivots for the whole drivetrain. set(theta): wheel angle in radians about +X (negative drives forward, toward -Z). */
export function rigDrive(stage, parts) {
  const onAxles = [...parts.axles, ...parts.wheels, ...parts.hubs, ...parts.collars, ...parts.pulleys, ...parts.spacers, ...parts.gear48];
  const zc = (o) => stage.bounds(o).center.z;
  const rear = stage.pivot(onAxles.filter((o) => zc(o) > 0), AXES.rear, XDIR);
  const front = stage.pivot(onAxles.filter((o) => zc(o) < 0), AXES.front, XDIR);
  const motor = stage.pivot([...parts.rotor, ...parts.shaft, ...parts.pinion], AXES.motor, XDIR);
  const enc = stage.pivot([...parts.gear40, ...parts.encShaft], AXES.enc, XDIR);
  return {
    rear, front, motor, enc,
    set(theta) { rear.setAngle(theta); front.setAngle(theta); motor.setAngle(-6 * theta); enc.setAngle(1.2 * theta); },
  };
}

/**
 * Markers that ride the two GT2 belts' pitch loops (annotation dots, not parts): two straight
 * spans between the axles, joined by half circles of the 47T pitch radius. setTravel(s) moves
 * them s metres along the belt; driving forward, the top span runs toward the front (-Z).
 */
export function beltMarkers(stage, model, { n = 12, color = '#7fb6ff', radius = 0.0022 } = {}) {
  const { THREE } = stage;
  const zr = AXES.rear[2], zf = AXES.front[2], yc = AXES.rear[1], r = PITCH_R;
  const span = zr - zf, L = 2 * span + 2 * Math.PI * r;
  const geo = new THREE.SphereGeometry(radius, 12, 8);
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, n * 2);
  mesh.name = 'belt-markers';
  mesh.frustumCulled = false;
  model.add(mesh);
  const m4 = new THREE.Matrix4();
  const at = (s) => { // position along the loop, starting at the top of the rear pulley heading forward
    s = ((s % L) + L) % L;
    if (s < span) return [yc + r, zr - s];
    s -= span;
    if (s < Math.PI * r) { const a = s / r; return [yc + r * Math.cos(a), zf - r * Math.sin(a)]; }
    s -= Math.PI * r;
    if (s < span) return [yc - r, zf + s];
    s -= span;
    const a = s / r; return [yc - r * Math.cos(a), zr + r * Math.sin(a)];
  };
  let last = NaN;
  const setTravel = (travel) => {
    if (travel === last) return;
    last = travel;
    let k = 0;
    for (const x of [-BELT_X, BELT_X]) {
      for (let i = 0; i < n; i++) {
        const [y, z] = at(travel + (i / n) * L);
        m4.makeTranslation(x, y, z);
        mesh.setMatrixAt(k++, m4);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    stage.invalidate();
  };
  setTravel(0);
  return { mesh, setTravel, dispose() { model.remove(mesh); geo.dispose(); mat.dispose(); } };
}

/**
 * Camera views are framed once, at rest, and blended by orbiting about a moving target (a straight
 * line between camera positions on opposite sides of the car would pass through it).
 */
export function blendViews(stage) {
  const { THREE } = stage;
  const S0 = new THREE.Spherical(), S1 = new THREE.Spherical(), off = new THREE.Vector3();
  return (a, b, k, drift = 0) => {
    S0.setFromVector3(off.copy(a.pos).sub(a.target)); S1.setFromVector3(off.copy(b.pos).sub(b.target));
    let dT = S1.theta - S0.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.target.clone().lerp(b.target, k);
    off.setFromSphericalCoords(lerp(S0.radius, S1.radius, k), clamp(lerp(S0.phi, S1.phi, k), 0.05, Math.PI - 0.05), S0.theta + dT * k + drift);
    return { pos: target.clone().add(off), target };
  };
}

/** A small instrument panel (.rx-hud in site.css) that only writes the values that changed. */
export function hud(parent, html, cls = '') {
  const el = document.createElement('div');
  el.className = `rx-hud${cls ? ` ${cls}` : ''}`;
  el.innerHTML = html;
  parent.append(el);
  const K = Object.fromEntries([...el.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const set = (key, v, fn) => { if (shown[key] !== v) { shown[key] = v; fn(v); } };
  return {
    el,
    put: (k, text) => set(k, text, (v) => { K[k].textContent = v; }),
    bar: (k, f) => set(`${k}:w`, `${(clamp(f, 0, 1) * 100).toFixed(1)}%`, (v) => { K[k].style.width = v; }),
    color: (k, c) => set(`${k}:c`, c, (v) => { K[k].style.color = v; }),
    show: (k, on) => set(`${k}:d`, on ? '' : 'none', (v) => { K[k].style.display = v; }),
  };
}

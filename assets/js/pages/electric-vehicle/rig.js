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

/** Parts of the final model, found by their CAD names (tools/optimize-cad.mjs keeps them named). */
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
    rotor: P(/D2830_Rotor/),
    shaft: P(/_Axe_1$/),
    circlip: P(/Circlip/),
    stator: P(/D2830_Stator/),
    motorMount: P(/MOTEUR_Support/),
    gear40: P(/Spur_Gear_40_teeth/),
    encShaft: P(/1501_0006_0100/),
    encBearings: P(/1601_0412_0006/),
    encoder: P(/mt6701_mockup/),
    encMount: P(/MT6701_Mount/),
    btnLaser: P(/Button_d12_1$/), // left (-X): toggles the laser pointer
    btnRun: P(/Button_d12_2$/), // right (+X): starts the run
    laserHolder: P(/_0_1_1_17_$/),
    endPanels: P(/_0_1_1_58_$/), // printed front and rear end panels plus the gearbox housing
    mountPlate: P(/_0_1_1_46_$/), // printed motor mount and the button plate
    electronics: P(/0_electronics_v2/),
  };
}

/** Pivots for the whole drivetrain. set(theta): wheel angle in radians about +X (negative drives forward, toward -Z). */
export function rigDrive(stage, parts) {
  const onAxles = [...parts.axles, ...parts.wheels, ...parts.hubs, ...parts.collars, ...parts.pulleys, ...parts.spacers, ...parts.gear48];
  const zc = (o) => stage.bounds(o).center.z;
  const rear = stage.pivot(onAxles.filter((o) => zc(o) > 0), AXES.rear, XDIR);
  const front = stage.pivot(onAxles.filter((o) => zc(o) < 0), AXES.front, XDIR);
  const motor = stage.pivot([...parts.rotor, ...parts.shaft, ...parts.circlip, ...parts.pinion], AXES.motor, XDIR);
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
  const setTravel = (travel) => {
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

/** Set a part list's opacity (1 = the CAD's own look). Clones materials once. */
export function fade(parts, a) {
  for (const p of parts) p.traverse((m) => {
    if (!m.isMesh) return;
    if (!m.userData.evOwn) {
      m.userData.evOwn = true;
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    }
    for (const mat of [].concat(m.material)) {
      const t = a < 0.999;
      if (mat.transparent !== t) { mat.transparent = t; mat.needsUpdate = true; }
      mat.opacity = a; mat.depthWrite = !t;
    }
    m.castShadow = a > 0.5;
  });
}

/** Screen-space labels pinned to model points (annotations only). */
export function labels(el) {
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  Object.assign(box.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '2' });
  el.append(box);
  let items = [];
  const v = { x: 0, y: 0, z: 0 };
  return {
    set(list) {
      box.textContent = '';
      items = list.map((x) => {
        const d = document.createElement('span');
        Object.assign(d.style, { position: 'absolute', left: '0', top: '0', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
          font: '500 12.5px/1.2 var(--font, system-ui, sans-serif)', color: '#eee9e3', transition: 'opacity .25s', flexDirection: x.side === 'l' ? 'row-reverse' : 'row' });
        const dot = document.createElement('i');
        Object.assign(dot.style, { width: '8px', height: '8px', borderRadius: '50%', background: x.color || '#ff6b35', boxShadow: '0 0 0 2px rgba(11,10,9,.75)', flex: 'none' });
        const b = document.createElement('b');
        Object.assign(b.style, { fontWeight: '550', padding: '3px 8px', borderRadius: '7px', background: 'rgba(11,10,9,.8)', border: '1px solid rgba(237,232,226,.2)' });
        b.textContent = x.text;
        d.append(dot, b);
        box.append(d);
        return { ...x, d };
      });
    },
    opacity(a) { box.style.opacity = String(a); },
    update(camera, THREE) {
      const w = el.clientWidth, h = el.clientHeight;
      camera.updateMatrixWorld();
      const p = new THREE.Vector3();
      for (const it of items) {
        p.set(it.p[0], it.p[1], it.p[2]).project(camera);
        Object.assign(v, p);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const off = it.side === 'l' ? -it.d.offsetWidth + 4 : -4;
        it.d.style.transform = `translate(${(x + off).toFixed(1)}px, ${(y - 10).toFixed(1)}px)`;
        it.d.style.opacity = v.z > 1 || x < 0 || x > w || y < 0 || y > h ? '0' : '1';
      }
    },
    dispose() { box.remove(); },
  };
}

/** A small caption chip in a corner of the stage (styled like the stage's own notes). */
export function chip(el, pos = { right: '14px', top: '14px' }) {
  const c = document.createElement('p');
  c.className = 'rx-note';
  Object.assign(c.style, { left: 'auto', bottom: 'auto', ...pos, maxWidth: 'min(360px, calc(100% - 28px))', flexWrap: 'wrap', lineHeight: '1.35', color: '#eee9e3', fontSize: '13px' });
  c.hidden = true;
  el.append(c);
  return {
    el: c,
    set(text) { if (!text) { c.hidden = true; return; } c.hidden = false; if (c.textContent !== text) c.textContent = text; },
    dispose() { c.remove(); },
  };
}

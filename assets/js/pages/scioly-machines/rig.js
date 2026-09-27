// Shared rig for the Science Olympiad Machines page's two scrollies: Jerry's CAD of the device
// (assets/models/scioly-machines/device.glb, from "umbc machines build.step"), with the two levers
// turned about their real fulcrums and the rigid link carried between their real link pins.
//
// Model frame: metres, y up; every pivot axis runs along model x. Points below are (y, z) in
// metres, read from the STEP with tools/cad-axes.py (the 6202 bearings' 14 mm bores) and the GLB:
//   P1 upper fulcrum (340, 350) mm   U link pin on the upper lever (340, 425) mm
//   P2 lower fulcrum (240,  50) mm   L link pin on the lower lever (240, 425) mm
// Upper lever (class 1): link arm P1 to U = 75.0 mm; the load hangs on the other side of P1.
// Lower lever (class 2): link arm P2 to L = 375.0 mm; the load hangs between P2 and L.
// Both printed rulers run 65.0 to 315.8 mm from their fulcrum. Ideal balance:
//   m_A * a = T * 75,  T * 375 = m_B * b   =>   m_A / m_B = b / (5 a)
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const G = 9.81;

export const P1 = [0.340, 0.350];
export const U = [0.340, 0.425];
export const L = [0.240, 0.425];
export const P2 = [0.240, 0.050];
export const ARM_UP = 75.0;   // mm, upper fulcrum to link pin
export const ARM_LO = 375.0;  // mm, lower fulcrum to link pin
export const K = ARM_LO / ARM_UP; // 5, from the CAD
export const RULER = [65.0, 315.8]; // mm from each fulcrum, both rulers
export const LINK = 0.100;    // m, U to L in the plane of motion
export const X_UP = 0.140;    // m, centre plane of the upper beam
export const X_LO = -0.040;   // m, centre plane of the lower beam
export const STOP = 6 * DEG;  // a visual stop for tipping (the real stops are not in the CAD)

const NAMES = {
  upper: [/_2020_T_slot_400mm_v1_2_1$/, /_linkage_ends_1$/, /_Bearings_5$/, /_fulcrum_rod_indexer_1$/, /_fulcrum_rod_mount_1$/, /_ruler_thing_1$/],
  lower: [/_2020_T_slot_400mm_v1_3_1$/, /_linkage_ends_2$/, /_Bearings_6$/, /_fulcrum_rod_indexer_2$/, /_fulcrum_rod_mount_2$/, /_ruler_thing_2$/],
  link: [/_Component4_1$/],
};

/** lower lever angle for an upper lever angle a1 (radians about +x), so that |U' - L'| stays 100 mm */
export function lowerAngle(a1) {
  const uy = P1[0] - 0.075 * Math.sin(a1), uz = P1[1] + 0.075 * Math.cos(a1);
  let a2 = a1 / K;
  for (let i = 0; i < 12; i++) {
    const ly = P2[0] - 0.375 * Math.sin(a2), lz = P2[1] + 0.375 * Math.cos(a2);
    const f = (uy - ly) ** 2 + (uz - lz) ** 2 - LINK * LINK;
    const dly = -0.375 * Math.cos(a2), dlz = -0.375 * Math.sin(a2);
    const df = -2 * (uy - ly) * dly - 2 * (uz - lz) * dlz;
    if (Math.abs(df) < 1e-12) break;
    const step = f / df;
    a2 -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  return a2;
}

/** a point (y, z) turned about a pivot (y, z) by angle a about +x */
export function turn([py, pz], [y, z], a) {
  const dy = y - py, dz = z - pz, c = Math.cos(a), s = Math.sin(a);
  return [py + dy * c - dz * s, pz + dy * s + dz * c];
}

export async function loadRig(stage) {
  const model = await stage.load('/assets/models/scioly-machines/device.glb');
  const pick = (list) => list.flatMap((re) => stage.part(re, model));
  const parts = { upper: pick(NAMES.upper), lower: pick(NAMES.lower), link: pick(NAMES.link) };
  // own materials, so a group can be lit up without lighting the rest
  for (const p of [...parts.upper, ...parts.lower, ...parts.link]) p.traverse((m) => { if (m.isMesh) m.material = stage.cloneMaterial(m.material); });
  const upper = stage.pivot(parts.upper, [X_UP, P1[0], P1[1]], [1, 0, 0]);
  const lower = stage.pivot(parts.lower, [X_LO, P2[0], P2[1]], [1, 0, 0]);
  const link = stage.pivot(parts.link, [0.05, L[0], L[1]], [1, 0, 0]);
  const base = link.position.clone();
  let a1 = 0, a2 = 0, placed = false;
  const tints = {}, tc = new THREE.Color();
  const rig = {
    model, parts, upper, lower, link,
    get a1() { return a1; }, get a2() { return a2; },
    /** tip the upper lever by a (radians about +x; negative = its load side goes down) */
    set(a) {
      if (a === a1 && placed) return; // nothing moved: no redraw, no shadow update
      placed = true;
      a1 = a; a2 = lowerAngle(a);
      upper.setAngle(a1); lower.setAngle(a2);
      const u = turn(P1, U, a1), l = turn(P2, L, a2);
      link.position.set(base.x, base.y + (l[0] - L[0]), base.z + (l[1] - L[1]));
      link.setAngle(Math.atan2(u[1] - l[1], u[0] - l[0]));
      stage.invalidate();
    },
    /** light a group ('upper', 'lower', 'link') with color at strength k (0..1); writes only on change */
    tint(group, color, k) {
      const key = `${color}|${k.toFixed(3)}`;
      if (tints[group] === key) return;
      tints[group] = key;
      tc.set(color).multiplyScalar(0.5 * k);
      for (const p of parts[group]) p.traverse((m) => { if (m.isMesh && m.material.emissive) { m.material.emissive.copy(tc); m.material.emissiveIntensity = 1; } });
      stage.invalidate(false);
    },
    /** world point on the upper lever, d mm from its fulcrum toward the load side, dy below the beam axis */
    upperPoint(d, dy = 0) { const p = turn(P1, [P1[0] - dy, P1[1] - d / 1000], a1); return new THREE.Vector3(X_UP, p[0], p[1]); },
    /** world point on the lower lever, d mm from its fulcrum toward the link */
    lowerPoint(d, dy = 0) { const p = turn(P2, [P2[0] - dy, P2[1] + d / 1000], a2); return new THREE.Vector3(X_LO, p[0], p[1]); },
    pinU() { const p = turn(P1, U, a1); return new THREE.Vector3(X_UP, p[0], p[1]); },
    pinL() { const p = turn(P2, L, a2); return new THREE.Vector3(X_LO, p[0], p[1]); },
  };
  return rig;
}

// ------------------------------------------------------------------ screen labels (annotations only)
// Tags pinned to 3D points. Each has an alpha `a` (0..1) that the scroll sets; sizes are measured
// only when the text changes, and styles are written only when they change.
const CSS = `
.sm-labs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.sm-lab { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font: 550 12px/1.2 var(--font, system-ui, sans-serif); color: #eee9e3; will-change: transform; opacity: 0; }
.sm-lab i { width: 7px; height: 7px; border-radius: 50%; background: #eee9e3; box-shadow: 0 0 0 2px rgba(11,10,9,.7); flex: none; }
.sm-lab b { font-weight: 550; padding: 3px 7px; border-radius: 6px; background: rgba(11,10,9,.8); border: 1px solid rgba(237,232,226,.18); }
.sm-lab.l { flex-direction: row-reverse; }
.sm-lab.c { flex-direction: column; gap: 4px; }
.sm-lab.c i { order: 2; }
.sm-lab.c.u i { order: 0; }
.sm-lab.mass b { padding: 5px 9px; font-weight: 650; }
.sm-lab.a b { background: rgba(255,107,53,.92); border-color: rgba(255,255,255,.35); color: #140a05; }
.sm-lab.b b { background: rgba(88,176,255,.92); border-color: rgba(255,255,255,.35); color: #04101c; }
.sm-lab.k b { background: rgba(242,193,78,.92); border-color: rgba(255,255,255,.35); color: #171003; }
.sm-lab.a i { background: #ff6b35; } .sm-lab.b i { background: #58b0ff; } .sm-lab.k i { background: #f2c14e; }
.sm-lab.dimtag i { display: none; }
@media (max-width: 600px) { .sm-lab { font-size: 11px; } .sm-lab b { padding: 2px 6px; } .sm-lab.mass b { padding: 4px 8px; } }
`;
let styled = false;
function style() { if (styled) return; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }

/** labels(el): tags on 3D points. add(id, { text, side: 'l'|'r'|'c'|'u', cls }); set it.a; update(camera) */
export function labels(el) {
  style();
  const box = document.createElement('div');
  box.className = 'sm-labs';
  box.setAttribute('aria-hidden', 'true');
  el.append(box);
  const items = new Map();
  const v = new THREE.Vector3();
  return {
    box,
    add(id, o) {
      const d = document.createElement('span');
      d.className = `sm-lab${o.side === 'l' ? ' l' : o.side === 'c' ? ' c' : o.side === 'u' ? ' c u' : ''}${o.cls ? ` ${o.cls}` : ''}`;
      d.innerHTML = '<i></i><b></b>';
      const b = d.querySelector('b');
      b.textContent = o.text;
      box.append(d);
      const it = { ...o, d, b, t: o.text, a: 0, p: null, w: 0, h: 0, sized: false, shown: -1, tr: '' };
      items.set(id, it);
      return it;
    },
    get(id) { return items.get(id); },
    text(id, t) { const it = items.get(id); if (it && it.t !== t) { it.t = t; it.b.textContent = t; it.sized = false; } },
    alpha(id, a) { const it = items.get(id); if (it) it.a = a; },
    point(id, p) { const it = items.get(id); if (it) it.p = p; },
    update(camera) {
      const w = el.clientWidth, h = el.clientHeight;
      camera.updateMatrixWorld();
      for (const it of items.values()) {
        let a = it.p ? Math.round(Math.min(1, Math.max(0, it.a)) * 100) / 100 : 0;
        let x = 0, y = 0;
        if (a > 0) {
          v.copy(it.p).project(camera);
          x = ((v.x + 1) / 2) * w; y = ((1 - v.y) / 2) * h;
          if (v.z > 1 || x < -20 || x > w + 20 || y < -20 || y > h + 20) a = 0;
        }
        if (a !== it.shown) { it.d.style.opacity = String(a); it.shown = a; }
        if (!a) continue;
        if (!it.sized) { it.w = it.d.offsetWidth; it.h = it.d.offsetHeight; it.sized = true; }
        let tx, ty;
        if (it.side === 'c') { tx = x - it.w / 2; ty = y - it.h + 3.5; }
        else if (it.side === 'u') { tx = x - it.w / 2; ty = y - 3.5; }
        else { tx = it.side === 'l' ? x - it.w + 3.5 : x - 3.5; ty = y - it.h / 2; }
        const tr = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
        if (tr !== it.tr) { it.d.style.transform = tr; it.tr = tr; }
      }
    },
    /** re-measure every tag (after a resize changes the font size) */
    resize() { for (const it of items.values()) it.sized = false; },
    dispose() { box.remove(); },
  };
}

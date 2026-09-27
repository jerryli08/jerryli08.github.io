// Shared rig for the Science Olympiad Machines page: Jerry's CAD of the device
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
  for (const p of [...parts.upper, ...parts.lower, ...parts.link]) p.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
  const upper = stage.pivot(parts.upper, [X_UP, P1[0], P1[1]], [1, 0, 0]);
  const lower = stage.pivot(parts.lower, [X_LO, P2[0], P2[1]], [1, 0, 0]);
  const link = stage.pivot(parts.link, [0.05, L[0], L[1]], [1, 0, 0]);
  const base = link.position.clone();
  let a1 = 0, a2 = 0;
  const rig = {
    model, parts, upper, lower, link,
    get a1() { return a1; }, get a2() { return a2; },
    /** tip the upper lever by a (radians about +x; negative = its load side goes down) */
    set(a) {
      a1 = a; a2 = lowerAngle(a);
      upper.setAngle(a1); lower.setAngle(a2);
      const u = turn(P1, U, a1), l = turn(P2, L, a2);
      link.position.set(base.x, base.y + (l[0] - L[0]), base.z + (l[1] - L[1]));
      link.setAngle(Math.atan2(u[1] - l[1], u[0] - l[0]));
      rig.onChange?.();
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
const CSS = `
.sm-labs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.sm-lab { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font: 550 12px/1.2 var(--font, system-ui, sans-serif); color: #eee9e3; will-change: transform; transition: opacity .2s; }
.sm-lab i { width: 7px; height: 7px; border-radius: 50%; background: #eee9e3; box-shadow: 0 0 0 2px rgba(11,10,9,.7); flex: none; }
.sm-lab b { font-weight: 550; padding: 3px 7px; border-radius: 6px; background: rgba(11,10,9,.8); border: 1px solid rgba(237,232,226,.18); }
.sm-lab.l { flex-direction: row-reverse; }
.sm-lab.c { flex-direction: column; gap: 4px; }
.sm-lab.c i { order: 2; }
.sm-lab.c.u i { order: 0; }
.sm-lab.mass b { cursor: grab; pointer-events: auto; touch-action: none; padding: 5px 9px; font-weight: 650; }
.sm-lab.mass.drag b { cursor: grabbing; }
.sm-lab.a b { background: rgba(255,107,53,.92); border-color: rgba(255,255,255,.35); color: #140a05; }
.sm-lab.b b { background: rgba(88,176,255,.92); border-color: rgba(255,255,255,.35); color: #04101c; }
.sm-lab.a i { background: #ff6b35; } .sm-lab.b i { background: #58b0ff; }
.sm-lab.dim b { color: #b8b0a7; background: rgba(11,10,9,.62); }
@media (max-width: 600px) { .sm-lab { font-size: 11px; } .sm-lab b { padding: 2px 6px; } .sm-lab.mass b { padding: 5px 8px; } }
@media (prefers-reduced-motion: reduce) { .sm-lab { transition: none; } }
.sm-status { position: absolute; left: 12px; top: 12px; z-index: 3; max-width: calc(100% - 24px); padding: 6px 10px; border-radius: 8px;
  font: 600 12.5px/1.3 var(--font, system-ui, sans-serif); color: #eee9e3; background: rgba(11,10,9,.82); border: 1px solid rgba(237,232,226,.16); pointer-events: none; }
.sm-status.ok { color: #9be39b; } .sm-status.warn { color: #ffb38a; }
`;
let styled = false;
function style() { if (styled) return; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }

/** labels(el): screen-space tags on 3D points. set([{ id, text, p: Vector3, side, cls }]); update(camera) */
export function labels(el) {
  style();
  const box = document.createElement('div');
  box.className = 'sm-labs';
  el.append(box);
  const items = new Map();
  const v = new THREE.Vector3();
  return {
    box,
    add(id, o) {
      const d = document.createElement('span');
      d.className = `sm-lab${o.side === 'l' ? ' l' : o.side === 'c' ? ' c' : o.side === 'u' ? ' c u' : ''}${o.cls ? ` ${o.cls}` : ''}`;
      d.innerHTML = '<i></i><b></b>';
      d.querySelector('b').textContent = o.text;
      if (!o.interactive) d.setAttribute('aria-hidden', 'true');
      box.append(d);
      const it = { ...o, d, on: o.on !== false };
      items.set(id, it);
      return it;
    },
    text(id, t) { const it = items.get(id); if (it && it.t !== t) { it.t = t; it.d.querySelector('b').textContent = t; } },
    show(id, on) { const it = items.get(id); if (it) it.on = on; },
    point(id, p) { const it = items.get(id); if (it) it.p = p; },
    update(camera) {
      const w = el.clientWidth, h = el.clientHeight;
      camera.updateMatrixWorld();
      for (const it of items.values()) {
        if (!it.p) continue;
        v.copy(it.p).project(camera);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const dw = it.d.offsetWidth, dh = it.d.offsetHeight;
        let tx, ty;
        if (it.side === 'c') { tx = x - dw / 2; ty = y - dh + 3.5; }
        else if (it.side === 'u') { tx = x - dw / 2; ty = y - 3.5; }
        else { tx = it.side === 'l' ? x - dw + 3.5 : x - 3.5; ty = y - dh / 2; }
        it.d.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
        const off = v.z > 1 || x < -20 || x > w + 20 || y < -20 || y > h + 20;
        it.d.style.opacity = !it.on || off ? '0' : '1';
        it.d.style.visibility = !it.on ? 'hidden' : '';
      }
    },
    dispose() { box.remove(); },
  };
}

/** a status line in the top left of the canvas */
export function status(el) {
  style();
  const d = document.createElement('div');
  d.className = 'sm-status';
  d.setAttribute('role', 'status');
  el.append(d);
  return { set(t, cls = '') { if (d.textContent !== t) d.textContent = t; d.className = `sm-status${cls ? ` ${cls}` : ''}`; }, dispose() { d.remove(); } };
}

// Shared rig for the drone arm page: Jerry's CAD of the drone and arm
// (assets/models/drone-arm/drone.glb, from "full drone and arm asm.step"), with the shoulder,
// elbow and both claw jaws turned about their real axes.
//
// Model frame: metres, y up. The arm moves in the drone's centre plane z = -111.5 mm. Axes from
// the STEP (tools/cad-axes.py on the bearings, printed shafts, servo horn and jaw bores):
//   S shoulder (381.5, -66.2) mm, along z        E elbow (562.7, -216.5) mm, along z
//   J1 servo jaw (x 348.5, z -129.1) mm, along y J2 idle jaw (x 347.45, z -94.0) mm, along y
// G is the grip point between the jaws, on the bottle's axis, at (284.0, -207.0) mm.
// Upper arm S to E = 235.4 mm, forearm E to G = 278.9 mm. The CAD pose is folded, carrying the bottle.
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export const S = [0.3815, -0.0662];
export const E = [0.5627, -0.2165];
export const G = [0.2840, -0.2070];
export const ZP = -0.1115;
export const J1 = [0.3485, -0.1291];
export const J2 = [0.34745, -0.0940];
export const L1 = Math.hypot(E[0] - S[0], E[1] - S[1]); // 0.2354
export const L2 = Math.hypot(G[0] - E[0], G[1] - E[1]); // 0.2789
export const Q1_0 = Math.atan2(E[1] - S[1], E[0] - S[0]);  // -39.67 deg
export const PHI_0 = Math.atan2(G[1] - E[1], G[0] - E[0]); // 178.05 deg, the forearm in the CAD
export const Q2_0 = wrap(PHI_0 - Q1_0);                    // -142.27 deg
export const OPEN = 25 * DEG; // per jaw; the open angle is not in the CAD
export const RMIN = Math.abs(L1 - L2), RMAX = L1 + L2;
export const PROPS = [[0.2406, 0.0658], [0.5953, 0.0658], [0.2406, -0.2889], [0.5953, -0.2889]]; // motor centres (x, z)
// joint limits for the demos (not in the CAD): keep the arm under the drone's belly
export const Q1_LIM = [-178 * DEG, -6 * DEG];
export const Q2_LIM = [-168 * DEG, -6 * DEG];

const RX = {
  upper: /^anim_arm_(2|3|4|6|7|9|11|17|18)_/,
  fore: /^anim_arm_(0|1|5|8|10|16|19|22|23|24|26|27|28|30)_/,
  jaw1: /^anim_arm_(20|25)_/,
  jaw2: /^anim_arm_21_/,
  bottle: /^anim_arm_29_/,
  props: /^anim_arm_(12|13|14|15)_/,
};

/** two-link IK for the grip point at (u, v) metres from the shoulder; the CAD's elbow branch */
export function ik(u, v) {
  let d = Math.hypot(u, v);
  const reach = d >= RMIN + 1e-4 && d <= RMAX - 1e-4;
  const dc = clamp(d, RMIN + 1e-4, RMAX - 1e-4);
  if (d < 1e-9) { u = 1e-4; v = 0; d = 1e-4; }
  const uu = (u / d) * dc, vv = (v / d) * dc;
  const c2 = clamp((dc * dc - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const q2 = -Math.acos(c2);
  const q1 = Math.atan2(vv, uu) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
  return { q1: wrap(q1), q2, reach };
}
/** forward kinematics: elbow and grip point, metres in the model frame */
export function fk(q1, q2) {
  const e = [S[0] + L1 * Math.cos(q1), S[1] + L1 * Math.sin(q1)];
  const g = [e[0] + L2 * Math.cos(q1 + q2), e[1] + L2 * Math.sin(q1 + q2)];
  return { e, g };
}
/** true when the pose keeps the elbow block, forearm and claw under the drone (a demo limit) */
export function allowed(q1, q2) {
  if (q1 < Q1_LIM[0] || q1 > Q1_LIM[1] || q2 < Q2_LIM[0] || q2 > Q2_LIM[1]) return false;
  const { e, g } = fk(q1, q2);
  if (e[1] > -0.098) return false; // the elbow block reaches about 57 mm above the elbow axis
  for (let i = 0; i <= 10; i++) {
    const x = lerp(e[0], g[0], i / 10), y = lerp(e[1], g[1], i / 10);
    if (y > -0.085) return false;   // forearm and claw stay below the drone's bottom plate
  }
  return true;
}

export async function loadArm(stage) {
  const model = await stage.load('/assets/models/drone-arm/drone.glb');
  const P = (re) => stage.part(re, model);
  const parts = { upper: P(RX.upper), fore: P(RX.fore), jaw1: P(RX.jaw1), jaw2: P(RX.jaw2), bottle: P(RX.bottle)[0], props: P(RX.props) };
  for (const k of ['upper', 'fore', 'jaw1', 'jaw2']) for (const p of parts[k]) p.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });

  // nest the chain: shoulder > elbow > jaws, each about its real axis
  const upper = stage.pivot(parts.upper, [S[0], S[1], ZP], [0, 0, 1]);
  for (const p of [...parts.fore, ...parts.jaw1, ...parts.jaw2]) upper.attach(p);
  const fore = stage.pivot(parts.fore, [E[0], E[1], ZP], [0, 0, 1]);
  for (const p of [...parts.jaw1, ...parts.jaw2]) fore.attach(p);
  const jaw1 = stage.pivot(parts.jaw1, [J1[0], G[1], J1[1]], [0, 1, 0]);
  const jaw2 = stage.pivot(parts.jaw2, [J2[0], G[1], J2[1]], [0, 1, 0]);
  const props = parts.props.map((p) => {
    p.updateWorldMatrix(true, false);
    const c = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());
    const m = PROPS.reduce((best, q) => (Math.hypot(q[0] - c.x, q[1] - c.z) < Math.hypot(best[0] - c.x, best[1] - c.z) ? q : best));
    return stage.pivot(p, [m[0], c.y, m[1]], [0, 1, 0]);
  });

  let q1 = Q1_0, q2 = Q2_0, open = 0;
  const rig = {
    model, parts, upper, fore, jaw1, jaw2, props,
    get q1() { return q1; }, get q2() { return q2; }, get open() { return open; },
    /** set the joint angles (radians, absolute, in the arm plane) */
    setJoints(a, b) { q1 = a; q2 = b; upper.setAngle(q1 - Q1_0); fore.setAngle(q2 - Q2_0); },
    /** open 0 (closed, as in the CAD) .. 1 (25 degrees per jaw) */
    setClaw(o) { open = o; jaw1.setAngle(-OPEN * o); jaw2.setAngle(OPEN * o); },
    spin(a) { props.forEach((p, i) => p.setAngle(i % 3 === 0 ? a : -a)); },
    /** claw pitch relative to its angle in the CAD, radians */
    get pitch() { return wrap(q1 + q2 - PHI_0); },
  };
  return rig;
}

// ------------------------------------------------------------------ screen labels and HUD (annotations only)
const CSS = `
.da-labs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 3; }
.da-lab { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font: 550 12px/1.2 var(--font, system-ui, sans-serif); color: #eee9e3; will-change: transform; transition: opacity .2s; }
.da-lab i { width: 7px; height: 7px; border-radius: 50%; background: #eee9e3; box-shadow: 0 0 0 2px rgba(11,10,9,.7); flex: none; }
.da-lab b { font-weight: 550; padding: 3px 7px; border-radius: 6px; background: rgba(11,10,9,.8); border: 1px solid rgba(237,232,226,.18); }
.da-lab.l { flex-direction: row-reverse; }
.da-lab.cam b { color: #ffd27a; } .da-lab.cam i { background: #ffd27a; }
.da-lab.ik b { color: #7fd4ff; } .da-lab.ik i { background: #7fd4ff; }
.da-lab.scene b { color: #b8b0a7; background: rgba(11,10,9,.6); }
@media (max-width: 600px) { .da-lab { font-size: 11px; } .da-lab b { padding: 2px 6px; } }
@media (prefers-reduced-motion: reduce) { .da-lab { transition: none; } }
.da-hud { position: absolute; left: 12px; top: 12px; z-index: 4; max-width: calc(100% - 24px); padding: 6px 10px; border-radius: 8px; pointer-events: none;
  font: 600 12.5px/1.3 var(--font, system-ui, sans-serif); color: #eee9e3; background: rgba(11,10,9,.82); border: 1px solid rgba(237,232,226,.16); }
.da-hud.warn { color: #ffb38a; } .da-hud.ok { color: #9be39b; }
`;
let styled = false;
export function style() { if (styled) return; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }

export function labels(el) {
  style();
  const box = document.createElement('div');
  box.className = 'da-labs';
  box.setAttribute('aria-hidden', 'true');
  el.append(box);
  const items = new Map();
  const v = new THREE.Vector3();
  return {
    add(id, o) {
      const d = document.createElement('span');
      d.className = `da-lab${o.side === 'l' ? ' l' : ''}${o.cls ? ` ${o.cls}` : ''}`;
      d.innerHTML = '<i></i><b></b>';
      d.querySelector('b').textContent = o.text;
      box.append(d);
      items.set(id, { ...o, d, on: o.on !== false });
    },
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
        const tx = it.side === 'l' ? x - dw + 3.5 : x - 3.5;
        it.d.style.transform = `translate(${tx.toFixed(1)}px, ${(y - dh / 2).toFixed(1)}px)`;
        const off = v.z > 1 || x < -30 || x > w + 30 || y < -30 || y > h + 30;
        it.d.style.opacity = !it.on || off ? '0' : '1';
      }
    },
    dispose() { box.remove(); },
  };
}

export function hud(el) {
  style();
  const d = document.createElement('div');
  d.className = 'da-hud';
  d.setAttribute('role', 'status');
  el.append(d);
  return { set(t, cls = '') { if (d.textContent !== t) d.textContent = t; d.className = `da-hud${cls ? ` ${cls}` : ''}`; }, dispose() { d.remove(); } };
}

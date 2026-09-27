// Shared rig for the LinqBot demos: loads the SO-101 from Jerry's CAD (screws and the driver PCB
// left out, nothing else changed) and turns each of its seven links about the servo axis it
// rides on in that CAD. The math lives in kin.js; this file adds the three.js side: the model,
// nested pivots, the table and can props, the grasp, labels and the demos' shared styles.
import * as THREE from 'three';
import { JOINTS, TCP0, DEG, fk, toArm, ikBest, gripAngleFor } from './kin.js';

export * from './kin.js';
export const MODEL = '/assets/models/linqbot/arm.glb';

// Props (not CAD): a table top and one slim can, about the size of the cans in our footage.
export const CAN = { r: 0.029, h: 0.13 };
export const CAN_HOME = [-0.07, 0, 0.204]; // arm frame: ahead and a little to the arm's right, in easy reach
export const HOME_REPO = [0.2, 0, 0.15]; // the teleop start target in our repo (settings.py home_*)
export const ROLL = 90; // wrist roll held fixed; at 90 the jaws close sideways around a standing can
export const SEEDS = [[0, 60, -90, 20, ROLL], [0, 90, -90, 0, ROLL], [0, 40, -120, 60, ROLL], [0, 20, -60, 70, ROLL], [0, 80, -140, 60, ROLL]];
export function homePose() {
  const r = ikBest(toArm(HOME_REPO), SEEDS);
  return [...r.q.slice(0, 4), ROLL, 0];
}
export function solveFrom(targetArm, seed) { return ikBest(targetArm, [seed, ...SEEDS]); }

/**
 * Loads the arm into the stage and rigs it. Returns
 *   model, links[0..6], pivots[0..5], angles, set(i, deg), pose([deg...]), grip (Object3D at the tool point)
 */
export async function loadArm(stage, o = {}) {
  const model = await stage.load(MODEL, { add: o.add });
  const links = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = stage.part(new RegExp(`^anim_lq_${i}_SO101_L${i}_`), model);
    if (!a.length) throw new Error(`rig: link L${i} not found`);
    return a;
  });
  // nested pivots, innermost first, so each joint carries everything beyond it
  let child = null;
  const pivots = [];
  for (let i = 5; i >= 0; i--) {
    const j = JOINTS[i];
    child = stage.pivot([...links[i + 1], ...(child ? [child] : [])], j.origin, j.axis);
    pivots[i] = child;
  }
  const grip = new THREE.Object3D();
  grip.name = 'tool-point';
  grip.position.set(...TCP0);
  model.add(grip);
  pivots[4].attach(grip);
  const angles = [0, 0, 0, 0, 0, 0];
  const arm = {
    model, links, pivots, grip, angles,
    set(i, deg) { if (angles[i] === deg && arm.ready) return; angles[i] = deg; pivots[i].setAngle(deg * DEG); },
    pose(a) { for (let i = 0; i < 6; i++) if (a[i] != null) arm.set(i, a[i]); },
    /** tool point in the arm frame, from kin.js (matches grip's world position when the model sits at the origin) */
    tcp() { return fk(angles); },
    all: links.flat(),
  };
  arm.pose([0, 0, 0, 0, 0, 0]);
  arm.ready = true;
  return arm;
}

// ------------------------------------------------------------------ props
function canTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1f4fa8'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#d8dde6'; g.fillRect(0, 50, 256, 26);
  g.fillStyle = '#e8b21f'; g.fillRect(0, 76, 256, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** A table top (y = 0 is its surface) and a can. Props for the demos, not part of the CAD. */
export function props(stage, o = {}) {
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(o.tableR ?? 0.5, o.tableR ?? 0.5, 0.018, 72),
    new THREE.MeshStandardMaterial({ color: '#4a4037', roughness: 0.85, metalness: 0 }),
  );
  table.position.y = -0.009 - 0.0004;
  table.receiveShadow = true;
  table.name = 'table';
  stage.root.add(table);
  const tex = canTexture();
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.55 });
  const lid = new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.3, metalness: 0.9 });
  const can = new THREE.Mesh(new THREE.CylinderGeometry(CAN.r, CAN.r, CAN.h, 40, 1), [side, lid, lid]);
  can.geometry.translate(0, CAN.h / 2, 0); // origin at the bottom centre
  can.castShadow = true; can.receiveShadow = true;
  can.name = 'can';
  stage.root.add(can);
  return { table, can };
}

/**
 * Grasp logic shared by the demos. Each frame: grasp.update(commandedGripDeg) returns the jaw angle
 * to show. If the jaw closes with the can between the jaw tips it stops at contact and the can
 * rides with the gripper; opening past contact lets it go, and it drops back to the table.
 */
export function makeGrasp(stage, arm, can) {
  const contact = gripAngleFor(CAN.r * 2 + 0.004);
  const tmp = new THREE.Vector3();
  const st = { held: false, falling: null, contact, onChange: null };
  function reset(pos = CAN_HOME, upright = true) {
    if (st.held) { stage.root.attach(can); st.held = false; }
    st.falling = null;
    can.position.set(pos[0], pos[1] ?? 0, pos[2]);
    can.rotation.set(upright ? 0 : Math.PI / 2, 0, 0);
    stage.invalidate();
  }
  function between() {
    if (Math.abs(can.rotation.x) > 0.3 || Math.abs(can.rotation.z) > 0.3) return false; // only a standing can
    arm.grip.getWorldPosition(tmp);
    const dx = tmp.x - can.position.x, dz = tmp.z - can.position.z;
    const hy = tmp.y - can.position.y;
    return Math.hypot(dx, dz) < 0.025 && hy > CAN.h * 0.2 && hy < CAN.h * 1.02;
  }
  function update(cmd, dt = 1 / 30) {
    let jaw = cmd;
    if (st.held) {
      if (cmd < contact - 8) { // opened: let go
        stage.root.attach(can);
        st.held = false;
        st.falling = { v: 0 };
        st.onChange?.(false);
      } else jaw = Math.min(cmd, contact);
    } else if (cmd >= contact - 1 && arm.angles[5] < contact + 0.5 && between()) {
      jaw = contact;
      arm.pivots[4].attach(can);
      st.held = true;
      st.falling = null;
      st.onChange?.(true);
    }
    if (st.falling) {
      // drop straight down, then stand it up or lay it down depending on how it is tilted
      st.falling.v += 9.81 * dt;
      can.position.y = Math.max(0, can.position.y - st.falling.v * dt);
      if (can.position.y <= 0) {
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(can.quaternion);
        if (up.y > Math.cos(20 * DEG)) can.rotation.set(0, 0, 0);
        else {
          const yaw = Math.atan2(up.x, up.z);
          can.rotation.set(0, 0, 0);
          can.rotateY(yaw); can.rotateX(Math.PI / 2);
          can.position.y = CAN.r;
        }
        st.falling = null;
      }
      stage.invalidate();
    }
    return jaw;
  }
  /** height of the can's bottom above the table */
  function lift() { can.getWorldPosition(tmp); return st.held ? Math.max(0, lowestPoint()) : tmp.y; }
  function lowestPoint() {
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(can.getWorldQuaternion(new THREE.Quaternion()));
    can.getWorldPosition(tmp);
    return tmp.y + Math.min(0, up.y * CAN.h) - Math.sqrt(Math.max(0, 1 - up.y * up.y)) * CAN.r;
  }
  reset();
  return Object.assign(st, { update, reset, lift, between });
}

/**
 * An invisible box (arm frame, metres) for stage.frame() to fit, so a demo frames the space the
 * arm works in at any canvas shape; the stage re-fits it when the canvas is resized.
 */
export function fitBox(stage, min, max) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]), new THREE.MeshBasicMaterial());
  m.visible = false;
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  stage.scene.add(m);
  return m;
}

// ------------------------------------------------------------------ UI helpers
export function style(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}
export const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Screen-space labels for points in the scene: add(text, getWorldPos(v) | Vector3, cls). */
export function labelLayer(stage, el) {
  const layer = h('div', 'lq-labels');
  el.appendChild(layer);
  const list = [];
  const v = new THREE.Vector3();
  return {
    el: layer,
    add(text, pos, cls = '') {
      const d = h('div', `lq-label ${cls}`);
      const s = h('span', null, text);
      d.appendChild(s);
      layer.appendChild(d);
      const l = { el: d, pos, visible: true, set text(t) { s.textContent = t; } };
      list.push(l);
      return l;
    },
    show(l, on) { l.visible = on; l.el.style.display = on ? '' : 'none'; },
    update() {
      const w = el.clientWidth, hh = el.clientHeight;
      stage.camera.updateMatrixWorld();
      for (const l of list) {
        if (!l.visible) continue;
        const p = typeof l.pos === 'function' ? l.pos(v) : v.copy(l.pos);
        p.project(stage.camera);
        const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * hh;
        l.el.style.opacity = p.z > 1 || x < -40 || x > w + 40 || y < -20 || y > hh + 20 ? '0' : '';
        l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    },
  };
}

export const SHARED_CSS = `
.lq-labels { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
.lq-label { position: absolute; left: 0; top: 0; will-change: transform; }
.lq-label > span { position: absolute; left: 0; bottom: 8px; transform: translateX(-50%); white-space: nowrap;
  padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.35; color: #f3eee8;
  background: rgba(12, 10, 9, 0.8); border: 1px solid rgba(255, 255, 255, 0.16); }
.lq-label::after { content: ''; position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; background: #ff6b35; box-shadow: 0 0 0 3px rgba(255, 107, 53, .25); }
.lq-label.lq-small > span { font-size: 11px; font-weight: 550; }
.lq-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.lq-hud { position: absolute; z-index: 4; top: 12px; right: 12px; margin: 0; padding: 9px 12px; border-radius: 10px; list-style: none;
  font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #e8e8e8; background: rgba(0, 0, 0, 0.72); border: 1px solid rgba(255, 255, 255, 0.14); pointer-events: none; }
.lq-hud .ok { color: #3ee06b; } .lq-hud .warn { color: #ffe14d; } .lq-hud .bad { color: #ff5a4f; } .lq-hud .dim { color: #8d8d8d; }
.lq-note { flex: 1 1 100%; margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--muted); }
.lq-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.lq-btn { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--line-strong); background: rgba(255, 255, 255, 0.04);
  color: var(--text); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.lq-btn:hover { border-color: var(--accent); }
.lq-btn[aria-pressed="true"], .lq-btn.is-held { background: var(--accent); border-color: var(--accent); color: #1a0b04; }
.lq-btn.lq-primary { background: var(--accent); border-color: var(--accent); color: #1a0b04; }
.lq-btn[disabled] { opacity: .45; cursor: default; }
.lq-btn[hidden], .rx-ui[hidden] { display: none !important; }
.lq-goal { position: absolute; z-index: 4; left: 12px; top: 12px; margin: 0; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 650;
  color: #f3eee8; background: rgba(12, 10, 9, 0.75); border: 1px solid rgba(255, 255, 255, 0.14); pointer-events: none; transition: background .3s, color .3s; }
.lq-goal.done { background: #3ee06b; color: #06220f; border-color: #3ee06b; }
@media (max-width: 640px) { .lq-hud { font-size: 10.5px; padding: 6px 8px; top: 8px; right: 8px; } .lq-goal { font-size: 12px; left: 8px; top: 8px; } .lq-label > span { font-size: 11px; padding: 2px 7px; } }
`;

export { THREE };

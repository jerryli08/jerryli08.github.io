// Shared rig for the Drone on Wheels page demos: the docking latch, wheels, props and the elastic
// bands, all on Jerry's real CAD (assets/models/rover.glb and drone.glb, the same models as the
// landing scene) and about the same real axes that assets/js/world.js uses.
//
// Model frame: metres, y up, (x, y, z) = (x, z, -y) of the STEP in millimetres. Every latch pin
// runs along model X. The rover's front (the AprilTag end) is -X and its left side is +Z.
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ------------------------------------------------------------------ latch geometry (from the STEP)
// Pin axes as (y, z) in model metres, the same numbers world.js rigs the landing scene with.
export const LATCH_SERVO = [-0.11105, -0.0867]; // 25-tooth servo gear (and the servo horn)
export const LATCH_IDLER = [-0.1110, -0.1367];  // 25-tooth idler ("latch passive gear" in the CAD)
export const LATCH_ARMS = [ // bottom pivot = the arm's 7-tooth pinion; top = the pin its door hangs on
  { re: /Component9/, sign: 1, bot: [-0.0888, -0.0497], top: [-0.0546, -0.0337], latch: 0 },
  { re: /Component8/, sign: -1, bot: [-0.0888, -0.0637], top: [-0.0546, -0.0790], latch: 0 },
  { re: /Component9/, sign: 1, bot: [-0.0888, -0.1597], top: [-0.0546, -0.1437], latch: 1 },
  { re: /Component8/, sign: -1, bot: [-0.0888, -0.1737], top: [-0.0546, -0.1890], latch: 1 },
];
export const LATCH_OPEN = 42 * DEG; // arm travel, confirmed by Jerry
export const RATIO = 7 / 25;        // servo gear turns 7/25 of the arm angle
export const LATCH_MID_Z = [-0.05635, -0.16635]; // centre plane of each latch (between its two door pins)
export const TUBES = [[-0.0701, -0.0565], [-0.0701, -0.1665]]; // the drone's 16 mm landing tubes, docked (y, z)
export const CUT_X = 0.417; // a section through the middle of the latch

// ------------------------------------------------------------------ passive catch (computed from the CAD)
// Door rotation needed to let the tube past, as the drone comes down. From a section of the real
// door ("passive latch doors") at x = 0.417 turned about its arm-tip pin against the 16 mm tube:
// PUSH[i] is the door angle in degrees (finger down) with the tube i * 0.25 mm above h = 2 mm,
// where h is the drone's height above its docked position. Above 23.8 mm the tube has not reached
// the doors; below about 1.9 mm the tube is past the doors' swing and the elastic snaps them shut.
export const PUSH = [38.75, 39.9, 40.6, 41.1, 41.45, 41.7, 41.85, 42.0, 42.05, 42.05, 42.05, 42.0, 41.9, 41.8, 41.65, 41.45, 41.25, 41.05, 40.85, 40.55, 40.3, 40.0, 39.7, 39.4, 39.05, 38.7, 38.3, 37.95, 37.55, 37.15, 36.75, 36.3, 35.85, 35.4, 34.95, 34.45, 34.0, 33.5, 33.0, 32.45, 31.95, 31.4, 30.85, 30.3, 29.75, 29.2, 28.65, 28.05, 27.45, 26.85, 26.25, 25.65, 25.05, 24.45, 23.8, 23.2, 22.55, 21.9, 21.25, 20.6, 19.95, 19.25, 18.6, 17.95, 17.25, 16.55, 15.9, 15.2, 14.5, 13.8, 13.1, 12.35, 11.65, 10.95, 10.2, 9.45, 8.75, 8.0, 7.25, 6.5, 5.75, 4.95, 4.2, 3.4, 2.65, 1.85, 1.05, 0.25, 0.0];
export const FIRST_TOUCH = 23.8; // mm: the tube meets the tips of the doors
export const SNAP_H = 1.9;       // mm: the tube is below the doors' swing; they close over it
export const HOLD_H = 7.27;      // mm: latched, the drone can rise this far before the tube meets the doors' undersides
/** door angle (degrees, finger down) while the tube is coming through; null once it is past */
export function doorPush(hmm) {
  if (hmm >= 24) return 0;
  if (hmm < SNAP_H) return null;
  const f = (Math.max(2, hmm) - 2) / 0.25, i = Math.min(PUSH.length - 2, Math.floor(f));
  return lerp(PUSH[i], PUSH[i + 1], f - i);
}

// ------------------------------------------------------------------ rigging
const box3 = (o) => new THREE.Box3().setFromObject(o);
function centreIn(frame, o) { frame.updateWorldMatrix(true, false); return frame.worldToLocal(box3(o).getCenter(new THREE.Vector3())); }

/**
 * Pivot every moving latch part about its real axis. Doors are nested in their arm's pivot, so they
 * ride on the arm tip; setDoor() turns a door on its pin relative to its arm.
 */
export function rigLatch(stage, rover) {
  const P = (re) => stage.part(re, rover);
  const armParts = P(/^anim_rover_\d+_Component[89]_/);
  const doorParts = P(/^anim_rover_\d+_passive_latch_doors/);
  const gear = P(/^anim_rover_\d+_Spur_Gear/)[0], idlerPart = P(/^anim_rover_\d+_Component43/)[0], horn = P(/^anim_rover_\d+_SERVO_ARM_HORN/)[0];
  // every latch part gets its own material, so it can be lit up without lighting the rest
  for (const p of [...armParts, ...doorParts, gear, idlerPart, horn]) p?.traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
  // the horn sits face to face with the gear; nudge it forward so the two faces never speckle (as in world.js)
  horn?.traverse((m) => { if (m.isMesh) Object.assign(m.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }); });

  const arms = LATCH_ARMS.map((a) => ({ ...a }));
  for (const o of armParts) {
    const c = centreIn(rover, o);
    const a = arms.filter((x) => x.re.test(o.name) && !x.part).sort((p, q) => Math.abs(p.bot[1] - c.z) - Math.abs(q.bot[1] - c.z))[0];
    if (a) { a.part = o; a.cx = c.x; }
  }
  for (const a of arms) if (a.part) a.pivot = stage.pivot(a.part, [a.cx, a.bot[0], a.bot[1]], [1, 0, 0]);
  const doors = [];
  for (const o of doorParts) {
    const c = centreIn(rover, o);
    const a = arms.filter((x) => x.pivot).sort((p, q) => Math.abs(p.top[1] - c.z) - Math.abs(q.top[1] - c.z))[0];
    a.pivot.attach(o);
    const d = { part: o, arm: a, pivot: stage.pivot(o, [c.x, a.top[0], a.top[1]], [1, 0, 0]), b: 0 };
    a.door = d;
    doors.push(d);
  }
  const gx = centreIn(rover, gear).x;
  const servo = stage.pivot(horn ? [gear, horn] : [gear], [gx, ...LATCH_SERVO], [1, 0, 0]);
  const idler = stage.pivot(idlerPart, [gx, ...LATCH_IDLER], [1, 0, 0]);
  let open = 0;
  const rig = {
    arms, doors, servo, idler,
    gears: [gear, horn, idlerPart].filter(Boolean),
    armParts: arms.map((a) => a.part).filter(Boolean),
    doorParts: doors.map((d) => d.part),
    get open() { return open; },
    /** a: 0 latched .. 1 fully open (42 degrees of arm travel) */
    set(a) {
      open = a;
      const alpha = LATCH_OPEN * a, th = alpha * RATIO;
      servo.setAngle(th); idler.setAngle(-th);
      for (const arm of arms) arm.pivot?.setAngle(arm.sign * alpha);
      rig.onChange?.();
    },
    /** turn one door (or all) on its pin, finger down by b radians, relative to its arm */
    setDoor(b, which = doors) {
      for (const d of [].concat(which)) { d.b = b; d.pivot.setAngle(-d.arm.sign * b); }
      rig.onChange?.();
    },
    /** arm angles offset for the backlash demo: extra[i] radians added to arm i (opening positive) */
    setArmExtra(extra) {
      const alpha = LATCH_OPEN * open;
      arms.forEach((arm, i) => arm.pivot?.setAngle(arm.sign * (alpha + (extra[i] || 0))));
      rig.onChange?.();
    },
  };
  return rig;
}

/** wheels turn about model Z through their centres (they are round about their axles) */
export function rigWheels(stage, rover) {
  const parts = stage.part(/^anim_rover_\d+_Wheels/, rover);
  const cs = parts.map((w) => centreIn(rover, w));
  const midX = cs.reduce((s, c) => s + c.x, 0) / cs.length, midZ = cs.reduce((s, c) => s + c.z, 0) / cs.length;
  const size = box3(parts[0]).getSize(new THREE.Vector3());
  const wheels = parts.map((w, i) => Object.assign(stage.pivot(w, 'center', [0, 0, 1]), { left: cs[i].z > midZ, front: cs[i].x < midX, c: cs[i] }));
  return { wheels, radius: Math.max(size.x, size.y) / 2, midZ, midX };
}

/** props spin about model Y; diagonal pairs turn the same way (as in world.js) */
export function rigProps(stage, drone) {
  const props = stage.part(/^anim_drone_\d+_Propeller/, drone).map((p, i) => Object.assign(stage.pivot(p, 'center', [0, 1, 0]), { dir: i % 2 ? 1 : -1 }));
  return { props, set(a) { for (const p of props) p.setAngle(a * p.dir); } };
}

// ------------------------------------------------------------------ elastic bands (an annotation)
// The elastic is not in the CAD. It loops over two knobs: one on the door, outboard of its pin,
// and one on the arm below it. Neck centres read off a section of the real knobs at x = 0.3965
// (door knob neck at z -25.7, y -58.8 mm; arm knob neck at z -38.2, y -74.5 mm for latch 1's
// outer arm; the others are mirrored about each latch's centre plane). The knobs sit at both ends
// of the parts, x = 0.397 and 0.4379.
const KNOB_DOOR = [-0.0588, 0.03065], KNOB_ARM = [-0.0745, 0.01815]; // (y, z offset outboard of the latch centre plane)
export function addElastic(stage, rover, rig, { color = '#f4c542', xs = [0.397, 0.4379] } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });
  const geo = new THREE.CylinderGeometry(0.00045, 0.00045, 1, 8, 1);
  const tmp = new THREE.Vector3();
  const bands = [];
  rover.updateWorldMatrix(true, true);
  for (const d of rig.doors) {
    const a = d.arm, zc = LATCH_MID_Z[a.latch], s = a.sign;
    for (const x of xs) {
      const mk = (part, yz) => {
        const m = new THREE.Object3D();
        part.updateWorldMatrix(true, false);
        m.position.copy(part.worldToLocal(rover.localToWorld(tmp.set(x, yz[0], zc + s * yz[1]))));
        part.add(m);
        return m;
      };
      const strands = [-0.0011, 0.0011].map((dx) => {
        const c = new THREE.Mesh(geo, mat);
        c.castShadow = false; c.receiveShadow = false; c.userData.dx = dx; c.name = 'elastic';
        rover.add(c);
        return c;
      });
      bands.push({ door: d, a: mk(d.part, KNOB_DOOR), b: mk(a.part, KNOB_ARM), strands, len: 0 });
    }
  }
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function update() {
    rover.updateWorldMatrix(true, true);
    for (const bd of bands) {
      rover.worldToLocal(bd.a.getWorldPosition(pa));
      rover.worldToLocal(bd.b.getWorldPosition(pb));
      dir.subVectors(pa, pb);
      bd.len = dir.length();
      for (const c of bd.strands) {
        c.position.addVectors(pa, pb).multiplyScalar(0.5); c.position.x += c.userData.dx;
        c.quaternion.setFromUnitVectors(up, dir.clone().normalize());
        c.scale.set(1, bd.len, 1);
      }
    }
    stage.invalidate();
  }
  update();
  return { bands, update, rest: bands[0]?.len || 0, dispose() { geo.dispose(); mat.dispose(); } };
}

// ------------------------------------------------------------------ framing helpers
/**
 * Tight camera fits for the docked pair. The pair is X-shaped, so one bounding box around it is
 * mostly empty corners and frames it small. hull(models) samples the real mesh vertices once (in
 * each model's own frame); fit(dir, pad) then places the camera so those points fill the view.
 * dir: from the model toward the camera (array or Vector3), or { azimuth, elevation } in degrees.
 */
export function hull(stage, models, { max = 24000 } = {}) {
  const sets = models.map((model) => {
    model.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
    const meshes = [];
    model.traverse((m) => { if (m.isMesh && m.name !== 'elastic' && m.geometry?.attributes?.position) meshes.push(m); });
    const total = meshes.reduce((n, m) => n + m.geometry.attributes.position.count, 0);
    const stride = Math.max(1, Math.ceil(total / (max / models.length)));
    const pts = [];
    const v = new THREE.Vector3(), mm = new THREE.Matrix4();
    for (const m of meshes) {
      mm.multiplyMatrices(inv, m.matrixWorld);
      const a = m.geometry.attributes.position;
      for (let i = 0; i < a.count; i += stride) { v.fromBufferAttribute(a, i).applyMatrix4(mm); pts.push(v.x, v.y, v.z); }
    }
    return { model, pts: new Float32Array(pts) };
  });
  const v = new THREE.Vector3();
  return {
    fit(dirIn, pad = 1.08) {
      let dir;
      if (dirIn?.isVector3) dir = dirIn.clone().normalize();
      else if (Array.isArray(dirIn)) dir = new THREE.Vector3(...dirIn).normalize();
      else {
        const az = (dirIn?.azimuth ?? 35) * DEG, el = (dirIn?.elevation ?? 22) * DEG;
        dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      }
      const right = new THREE.Vector3().crossVectors(dir.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir.clone().negate());
      const P = [];
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zs = 0;
      for (const { model, pts } of sets) {
        model.updateWorldMatrix(true, false);
        for (let i = 0; i < pts.length; i += 3) {
          v.set(pts[i], pts[i + 1], pts[i + 2]).applyMatrix4(model.matrixWorld);
          const x = v.dot(right), y = v.dot(up), z = v.dot(dir);
          P.push(x, y, z);
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; zs += z;
        }
      }
      const n = P.length / 3, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = zs / n;
      const tv = Math.tan((stage.camera.fov * DEG) / 2) / pad;
      const th = (tv * stage.el.clientWidth) / Math.max(1, stage.el.clientHeight);
      let dist = 0;
      for (let i = 0; i < P.length; i += 3) {
        const z = P[i + 2] - cz;
        dist = Math.max(dist, z + Math.abs(P[i] - cx) / th, z + Math.abs(P[i + 1] - cy) / tv);
      }
      const target = new THREE.Vector3().addScaledVector(right, cx).addScaledVector(up, cy).addScaledVector(dir, cz);
      return { pos: target.clone().addScaledVector(dir, dist), target };
    },
  };
}

/** an invisible box to frame the camera on a region of the model (model metres) */
export function region(min, max) {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const m = new THREE.Mesh(g);
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  m.updateMatrixWorld(true);
  return m;
}
export function lerpView(a, b, t) {
  return { pos: a.pos.clone().lerp(b.pos, t), target: a.target.clone().lerp(b.target, t) };
}

// ------------------------------------------------------------------ HTML overlays
// Labels anchored to points on the model, a small heads-up readout, and the styles for both.
// They live inside the demo's stage element and are removed with it.
let styled = false;
export function injectStyle() {
  if (styled || document.getElementById('hv-style')) { styled = true; return; }
  styled = true;
  const s = document.createElement('style');
  s.id = 'hv-style';
  s.textContent = `
.hv-over{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.hv-lab{position:absolute;left:0;top:0;display:flex;align-items:center;white-space:nowrap;font-size:12px;line-height:1.2;font-weight:600;color:#eee9e3;transition:opacity .25s;will-change:transform}
.hv-lab .d{flex:none;width:9px;height:9px;border-radius:50%;background:#ff6b35;box-shadow:0 0 0 2px rgba(10,8,7,.85)}
.hv-lab.in .d{background:transparent;border:2px solid #ff6b35}
.hv-lab .ln{flex:none;width:12px;height:1px;background:rgba(238,233,227,.55)}
.hv-lab .t{padding:3px 8px;border-radius:999px;background:rgba(10,8,7,.74);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.hv-lab .t b{color:#ff9a6b;font-weight:700}
.hv-lab.l{flex-direction:row-reverse}
.hv-lab.num .t{padding:2px 6px;min-width:20px;text-align:center}
.hv-lab.pas .d{background:#6cc3ff}
.hv-lab.pas .t b{color:#9fd6ff}
.hv-hud{position:absolute;z-index:2;right:12px;top:12px;display:grid;gap:2px;padding:9px 12px;border-radius:12px;background:rgba(10,8,7,.72);border:1px solid rgba(255,255,255,.12);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-size:12px;color:#b8b0a7;pointer-events:none;transition:opacity .3s}
.hv-hud div{display:flex;justify-content:space-between;gap:14px}
.hv-hud b{color:#eee9e3;font-weight:650;font-variant-numeric:tabular-nums}
.hv-hud .hv-state{color:#eee9e3;font-weight:650}
.hv-hud .hv-state.ok{color:#8fe3a8}.hv-hud .hv-state.warn{color:#ffb45c}
.hv-key{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;padding:0;list-style:none;font-size:13px;color:#b8b0a7;flex:1 1 100%}
.hv-key li{display:flex;align-items:center;gap:7px}
.hv-key i{font-style:normal;display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:rgba(255,107,53,.16);color:#ff9a6b;font-size:11.5px;font-weight:700}
.hv-btn[disabled]{opacity:.38;cursor:default;pointer-events:none}
.hv-cdot{position:absolute;left:0;top:0;width:9px;height:9px;border-radius:50%;background:#ff6b35;box-shadow:0 0 0 2px rgba(10,8,7,.85);font-size:0;color:transparent;transition:opacity .2s}
.hv-cdot.in{background:#1a1512;border:2px solid #ff6b35}
.hv-chip{position:absolute;left:0;top:0;height:24px;display:flex;align-items:center;padding:0 9px;border-radius:999px;white-space:nowrap;font-size:12px;font-weight:600;color:#eee9e3;background:rgba(10,8,7,.74);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .2s}
.hv-small .hv-cdot{width:19px;height:19px;display:grid;place-items:center;font-size:10.5px;font-weight:700;color:#140a05;line-height:1}
.hv-small .hv-cdot.in{color:#ff9a6b}
.hv-sw{display:inline-block;width:18px;height:4px;border-radius:2px;background:#f4c542}
@media (max-width:640px){.hv-lab{font-size:11px}.hv-hud{right:8px;top:8px;padding:7px 10px;font-size:11px}}
@media (prefers-reduced-motion:reduce){.hv-lab,.hv-hud,.hv-cdot,.hv-chip{transition:none}}`;
  document.head.appendChild(s);
}

/**
 * labels(stage, items): items [{ text, anchor: Object3D, side: 'r' | 'l', cls, id }]. Each label
 * is a dot on the anchor's world position with a chip beside it. set(id, { text, on }) updates one;
 * update() re-projects (it runs after every render of the stage).
 */
export function labels(stage, items) {
  injectStyle();
  const layer = document.createElement('div');
  layer.className = 'hv-over';
  stage.el.appendChild(layer);
  const v = new THREE.Vector3();
  const list = items.map((it) => {
    const e = document.createElement('div');
    e.className = `hv-lab ${it.side === 'l' ? 'l' : 'r'} ${it.cls || ''}`;
    e.innerHTML = '<span class="d"></span><span class="ln"></span><span class="t"></span>';
    e.querySelector('.t').innerHTML = it.text;
    e.style.opacity = it.on === false ? '0' : '1';
    layer.appendChild(e);
    return { ...it, e, on: it.on !== false };
  });
  let shown = true;
  function update() {
    const w = stage.el.clientWidth, h = stage.el.clientHeight;
    for (const l of list) {
      l.anchor.getWorldPosition(v).project(stage.camera);
      const vis = shown && l.on && v.z < 1 && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05;
      l.e.style.opacity = vis ? '1' : '0';
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      l.e.style.transform = l.side === 'l' ? `translate(calc(${x.toFixed(1)}px - 100% + 4.5px), calc(${y.toFixed(1)}px - 50%))` : `translate(${(x - 4.5).toFixed(1)}px, calc(${y.toFixed(1)}px - 50%))`;
    }
  }
  const prev = stage.scene.onAfterRender;
  stage.scene.onAfterRender = function (...a) { prev?.apply(this, a); update(); };
  return {
    list, layer, update,
    set(id, o = {}) {
      const l = list.find((x) => x.id === id); if (!l) return;
      if (o.text != null && o.text !== l.text) { l.text = o.text; l.e.querySelector('.t').innerHTML = o.text; }
      if (o.on != null) l.on = o.on;
      stage.invalidate();
    },
    show(on) { shown = on; stage.invalidate(); },
    dispose() { layer.remove(); },
  };
}

/**
 * callouts(stage, items, { narrow }): technical-drawing callouts. Chips stack in a column on each
 * side of the model with a leader line to a dot on the part, so they never pile up on the model.
 * On narrow stages only numbered dots show (pair them with a key list). items: [{ id, text, n,
 * anchor, cls }]; cls 'in' draws a hollow dot for a part inside the chassis.
 */
export function callouts(stage, items, { narrow = () => false } = {}) {
  injectStyle();
  const layer = document.createElement('div');
  layer.className = 'hv-over';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.style.cssText = 'position:absolute;inset:0;overflow:visible';
  layer.appendChild(svg);
  stage.el.appendChild(layer);
  const v = new THREE.Vector3();
  const list = items.map((it) => {
    const dot = document.createElement('div');
    dot.className = `hv-cdot ${it.cls || ''}`;
    dot.textContent = String(it.n);
    const chip = document.createElement('div');
    chip.className = 'hv-chip';
    chip.innerHTML = it.text;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'rgba(238,233,227,0.5)'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    layer.append(dot, chip);
    return { ...it, dot, chip, line, w: 0 };
  });
  let shown = true;
  function update() {
    const W = stage.el.clientWidth, H = stage.el.clientHeight, small = narrow();
    layer.classList.toggle('hv-small', small);
    const vis = [];
    for (const l of list) {
      l.anchor.getWorldPosition(v).project(stage.camera);
      l.ax = (v.x * 0.5 + 0.5) * W; l.ay = (-v.y * 0.5 + 0.5) * H;
      l.vis = shown && v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      l.dot.style.opacity = l.vis ? '1' : '0';
      l.dot.style.transform = `translate(${l.ax.toFixed(1)}px, ${l.ay.toFixed(1)}px) translate(-50%, -50%)`;
      if (l.vis) vis.push(l);
    }
    if (small || !shown) {
      for (const l of list) { l.chip.style.opacity = '0'; l.line.setAttribute('d', ''); }
      return;
    }
    const mid = vis.reduce((s, l) => s + l.ax, 0) / Math.max(1, vis.length);
    const sides = [vis.filter((l) => l.ax < mid), vis.filter((l) => l.ax >= mid)];
    const ROW = 27, PAD = 14;
    sides.forEach((col, si) => {
      if (!col.length) return;
      for (const l of col) if (!l.w) l.w = l.chip.offsetWidth || 120;
      const wmax = Math.max(...col.map((l) => l.w));
      // column edge: just clear of the outermost anchor on this side, but never off the stage
      const edge = si === 0 ? clamp(Math.min(...col.map((l) => l.ax)) - 34, wmax + PAD, W / 2 - 16) : clamp(Math.max(...col.map((l) => l.ax)) + 34, W / 2 + 16, W - wmax - PAD);
      col.sort((a, b) => a.ay - b.ay);
      let y = -Infinity;
      for (const l of col) { l.y = Math.max(l.ay, y + ROW); y = l.y; }
      const over = y - (H - 18);
      if (over > 0) { let yy = Infinity; for (let i = col.length - 1; i >= 0; i--) { col[i].y = Math.min(col[i].y - over, yy - ROW); yy = col[i].y; } }
      for (const l of col) {
        const x0 = si === 0 ? edge - l.w : edge;
        l.chip.style.transform = `translate(${x0.toFixed(1)}px, ${(l.y - 12).toFixed(1)}px)`;
        l.chip.style.opacity = '1';
        const ex = si === 0 ? edge + 10 : edge - 10;
        l.line.setAttribute('d', `M${l.ax.toFixed(1)} ${l.ay.toFixed(1)} L${ex.toFixed(1)} ${l.y.toFixed(1)} L${(si === 0 ? edge : edge).toFixed(1)} ${l.y.toFixed(1)}`);
      }
    });
    for (const l of list) if (!l.vis) { l.chip.style.opacity = '0'; l.line.setAttribute('d', ''); }
  }
  const prev = stage.scene.onAfterRender;
  stage.scene.onAfterRender = function (...a) { prev?.apply(this, a); update(); };
  return { list, update, show(on) { shown = on; layer.style.opacity = on ? '1' : '0'; stage.invalidate(); }, dispose() { layer.remove(); } };
}

/** a point on (and moving with) a part: position given in the model frame of `model` */
export function anchor(parent, model, p) {
  const o = new THREE.Object3D();
  parent.updateWorldMatrix(true, false); model.updateWorldMatrix(true, false);
  o.position.copy(parent.worldToLocal(model.localToWorld(new THREE.Vector3(...p))));
  parent.add(o);
  return o;
}

/** heads-up readout inside the stage: rows [{ key, label }]; set({ key: html }) */
export function hud(stage, rows, { where = 'tr' } = {}) {
  injectStyle();
  const e = document.createElement('div');
  e.className = 'hv-hud';
  if (where === 'tl') { e.style.right = 'auto'; e.style.left = '12px'; }
  if (where === 'br') { e.style.top = 'auto'; e.style.bottom = '12px'; }
  const cells = new Map();
  for (const r of rows) {
    const d = document.createElement('div');
    if (r.state) { d.className = 'hv-state'; cells.set(r.key, d); e.appendChild(d); continue; }
    d.innerHTML = `<span>${r.label}</span><b></b>`;
    cells.set(r.key, d.querySelector('b'));
    e.appendChild(d);
  }
  stage.el.appendChild(e);
  return {
    el: e,
    set(vals) { for (const [k, val] of Object.entries(vals)) { const c = cells.get(k); if (c && c.innerHTML !== String(val)) c.innerHTML = val; } },
    state(text, cls = '') { const c = [...cells.values()].find((x) => x.classList?.contains('hv-state')); if (c) { c.textContent = text; c.className = `hv-state ${cls}`; } },
    show(on) { e.style.opacity = on ? '1' : '0'; },
    dispose() { e.remove(); },
  };
}

/** a small time-based animation driven by stage.onFrame; resolves when done. Reduced motion jumps to the end. */
export function animate(stage, seconds, fn, reduced) {
  if (reduced || seconds <= 0) { fn(1); stage.invalidate(); return { done: Promise.resolve(), stop() {} }; }
  let t = 0, stop, resolve;
  const done = new Promise((r) => { resolve = r; });
  stop = stage.onFrame((dt) => {
    t = Math.min(1, t + dt / seconds);
    fn(t);
    if (t >= 1) { stop(); resolve(); }
  });
  return { done, stop() { stop(); resolve(); } };
}

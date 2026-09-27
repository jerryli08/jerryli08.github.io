// Shared rig for the Drone on Wheels page: the docking latch, wheels, props and the elastic bands,
// all on Jerry's real CAD (assets/models/rover.glb and drone.glb, the same models as the landing
// scene) and about the same real axes that assets/js/world.js uses. Every scrolly on the page is a
// pure function of the scroll position: nothing in here animates on its own.
//
// Model frame: metres, y up, (x, y, z) = (x, z, -y) of the STEP in millimetres. Every latch pin
// runs along model X. The rover's front (the AprilTag end) is -X and its left side is +Z.
import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

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
export const RATIO = 7 / 25;        // the servo gear turns 7/25 of the arm angle
export const LATCH_MID_Z = [-0.05635, -0.16635]; // centre plane of each latch (between its two door pins)
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
/**
 * The elastic pulling a door back up once the tube is past it (radians, finger down): a short
 * damped bounce off the closed position so it reads as a snap. q runs 0..0.5 through the snap; the caller maps the
 * scroll onto q, so it plays forwards and backwards with the scroll.
 */
export function snapDoor(q) {
  if (q <= 0) return PUSH[0] * DEG;
  if (q >= 0.5) return 0;
  return PUSH[0] * DEG * Math.exp(-q * 16) * Math.abs(Math.cos(q * 38)); // bounces off the closed position
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
  for (const p of [...armParts, ...doorParts, gear, idlerPart, horn]) p?.traverse((m) => { if (m.isMesh) m.material = stage.cloneMaterial(m.material); });
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
    /** a: 0 latched .. 1 fully open (42 degrees of arm travel); extra[i]: radians added to arm i (opening positive) */
    set(a, extra = []) {
      open = a;
      const alpha = LATCH_OPEN * a, th = alpha * RATIO;
      servo.setAngle(th); idler.setAngle(-th);
      arms.forEach((arm, i) => arm.pivot?.setAngle(arm.sign * (alpha + (extra[i] || 0))));
    },
    /** turn every door on its pin, finger down by b radians, relative to its arm */
    setDoor(b) { for (const d of doors) { d.b = b; d.pivot.setAngle(-d.arm.sign * b); } },
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

// ------------------------------------------------------------------ framing
/**
 * Tight camera fits for the docked pair. The pair is X-shaped, so one bounding box around it is
 * mostly empty corners and frames it small. hull(models) samples the real mesh vertices once (in
 * each model's own frame); fit(dir, pad) then places the camera so those points fill the view.
 * dir: from the model toward the camera (array or Vector3), or { azimuth, elevation } in degrees.
 * Call it only with the models at rest (views are framed once and cached, never on moving parts).
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
      // like stage.frame: with the picture shifted clear of the step cards, fit the part left free
      let sh = [0, 0];
      try { sh = stage.el.rxShift?.() || sh; } catch { /* none */ }
      const fx = 1 - 2 * Math.min(0.4, Math.abs(+sh[0] || 0)), fy = 1 - 2 * Math.min(0.4, Math.abs(+sh[1] || 0));
      const tv = (Math.tan((stage.camera.fov * DEG) / 2) * fy) / pad;
      const th = (Math.tan((stage.camera.fov * DEG) / 2) * fx * stage.el.clientWidth) / Math.max(1, stage.el.clientHeight) / pad;
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

/** a cached view as a target and a spherical offset, so views blend by orbiting, never through the model */
export function orbit(view) {
  return { t: view.target.clone(), s: new THREE.Spherical().setFromVector3(view.pos.clone().sub(view.target)) };
}
const sp = new THREE.Spherical();
/** the view k of the way from orbit a to orbit b, turned by drift radians about the vertical */
export function blend(a, b, k, drift = 0) {
  let dT = b.s.theta - a.s.theta;
  while (dT > Math.PI) dT -= 2 * Math.PI;
  while (dT < -Math.PI) dT += 2 * Math.PI;
  const target = a.t.clone().lerp(b.t, k);
  sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
  return { pos: new THREE.Vector3().setFromSpherical(sp).add(target), target };
}

/**
 * A running total of speed(u) over the scroll, tabulated once, so an angle that follows a speed
 * profile is still a pure function of the scroll position u (0..U).
 */
export function integrate(speed, U, N = 1200) {
  const table = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) table[i] = table[i - 1] + speed(((i - 0.5) / N) * U) * (U / N);
  return (u) => { const x = clamp(u / U, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return lerp(table[i], table[i + 1], x - i); };
}

/** a point on (and moving with) a part: position given in the model frame of `model` */
export function anchor(parent, model, p) {
  const o = new THREE.Object3D();
  parent.updateWorldMatrix(true, false); model.updateWorldMatrix(true, false);
  o.position.copy(parent.worldToLocal(model.localToWorld(new THREE.Vector3(...p))));
  parent.add(o);
  return o;
}

// ------------------------------------------------------------------ HTML overlays
const css = (el, s) => { Object.assign(el.style, s); return el; };

/**
 * Labels pinned to points that move with the parts: a dot on the point and a pill beside it.
 * tag(text, anchor, { side: 'l' | 'r', short, hollow, color }) returns a tag; set tag.a (0..1)
 * from setProgress and call update(narrow, freeLeft) after the camera is placed. Narrow stages use
 * the short text. A pill that would run off the stage, or under the step cards (freeLeft, px from
 * the stage's left edge), flips to the other side of its dot. Styles are only written when they
 * change, and nothing fades on its own (no CSS transitions): the scroll drives every value.
 */
export function tags(stage) {
  const layer = css(document.createElement('div'), {
    position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', overflow: 'hidden',
    font: '550 13px/1.25 var(--font, system-ui, sans-serif)', color: '#eee9e3',
  });
  layer.className = 'hv-tags';
  stage.el.appendChild(layer);
  const list = [];
  const v = new THREE.Vector3();
  function tag(text, anchorObj, o = {}) {
    const el = css(document.createElement('div'), { position: 'absolute', left: '0', top: '0', opacity: '0', whiteSpace: 'nowrap', willChange: 'transform' });
    const color = o.color || '#ff6b35';
    const dot = css(document.createElement('span'), {
      position: 'absolute', left: '-4.5px', top: '-4.5px', width: '9px', height: '9px', borderRadius: '50%', boxSizing: 'border-box',
      background: o.hollow ? 'rgba(20,16,13,.9)' : color, border: o.hollow ? `2px solid ${color}` : '0', boxShadow: '0 0 0 3px rgba(10,8,7,.55)',
    });
    const pill = css(document.createElement('span'), {
      position: 'absolute', top: '-12px', padding: '3px 10px', borderRadius: '999px',
      background: 'rgba(10,8,7,.78)', border: '1px solid rgba(255,255,255,.15)',
    });
    el.append(dot, pill);
    layer.appendChild(el);
    const t = { el, pill, anchor: anchorObj, text, short: o.short || text, side: o.side === 'l' ? 'l' : 'r', a: 0, shown: -1, x: NaN, y: NaN, txt: '', w: {}, drawnSide: '' };
    list.push(t);
    return t;
  }
  function update(narrow = false, freeLeft = 0) {
    const cam = stage.camera;
    cam.updateMatrixWorld();
    const W = stage.el.clientWidth, H = stage.el.clientHeight;
    for (const t of list) {
      if (t.anchor.isObject3D) t.anchor.getWorldPosition(v); else v.set(...t.anchor);
      v.project(cam);
      const on = t.a > 0.02 && v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      const a = on ? Math.round(Math.min(1, t.a) * 100) / 100 : 0;
      if (a !== t.shown) { t.el.style.opacity = String(a); t.shown = a; }
      if (!on) continue;
      const txt = narrow ? t.short : t.text;
      if (txt !== t.txt) { t.pill.textContent = txt; t.txt = txt; }
      const w = t.w[txt] || (t.w[txt] = t.pill.offsetWidth || txt.length * 7 + 22);
      const x = Math.round(((v.x + 1) / 2) * W * 2) / 2, y = Math.round(((1 - v.y) / 2) * H * 2) / 2;
      let side = t.side;
      if (side === 'l' && x - w - 12 < Math.max(4, freeLeft)) side = 'r';
      else if (side === 'r' && x + w + 12 > W - 4 && x - w - 12 >= Math.max(4, freeLeft)) side = 'l';
      if (side !== t.drawnSide) {
        t.drawnSide = side;
        if (side === 'l') { t.pill.style.left = 'auto'; t.pill.style.right = '11px'; } else { t.pill.style.right = 'auto'; t.pill.style.left = '11px'; }
      }
      if (x !== t.x || y !== t.y) { t.el.style.transform = `translate(${x}px, ${y}px)`; t.x = x; t.y = y; }
    }
  }
  return { layer, tag, update, list, dispose() { layer.remove(); } };
}

/**
 * A readout panel (site.css .rx-hud) in the overlay layer. html holds elements with data-k keys;
 * put(k, text) and bar(k, 0..1) only touch the DOM when a value changes, color(k, css) too.
 */
export function hudPanel(layer, html, style = {}) {
  const hud = css(document.createElement('div'), { opacity: '0', ...style });
  hud.className = 'rx-hud';
  hud.innerHTML = html;
  layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  return {
    el: hud,
    put(k, text) { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } },
    bar(k, f) { const w = `${(clamp(f, 0, 1) * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } },
    color(k, c) { const key = `${k}:c`; if (shown[key] !== c) { K[k].style.color = c; shown[key] = c; } },
    show(a) { const s = String(Math.round(clamp(a, 0, 1) * 100) / 100); if (shown._a !== s) { hud.style.opacity = s; hud.style.visibility = s === '0' ? 'hidden' : ''; shown._a = s; } },
  };
}

/** the left edge of the free part of a full-width stage, clear of the step cards (px); 0 when nothing covers it */
export function freeLeftOf(el, ctx) {
  let key = -1, val = 0;
  return () => {
    if (ctx.shift()[0] <= 0) return 0;
    if (key !== innerWidth) {
      key = innerWidth;
      const card = el.closest('.rx-scrolly')?.querySelector('.rx-step-card');
      val = card ? Math.max(0, card.getBoundingClientRect().right - el.getBoundingClientRect().left + 10) : 0;
    }
    return val;
  };
}

export const OK = '#8fe3a8', WARN = '#ffb45c', INK = '#eee9e3';

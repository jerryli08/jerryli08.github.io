// Shared rig for the Replac3d demos: loads Jerry's full CAD (robot, printer, plate holders) and
// rigs its two axes about the real geometry.
//
// The web model (assets/models/build-plate-robot/final.glb) keeps the CAD's parts grouped by how
// they move (regrouped by world transform before tools/optimize-cad.mjs, shapes untouched); every
// group is named G_<NAME>:
//   ROT      everything that turns with the turntable: frame, side plates, bottom plate, slides'
//            outer members, extension motors and idlers, chain mount
//   EXT      the carriage: 2020 extrusions, electromagnet mount, slides' inner members, belt clamps
//   MAG      the four Adafruit 5 V 10 kg electromagnets (on the carriage)
//   MID      the slides' middle members; BALLS_IN / BALLS_OUT the two ball rows of each slide
//   EPUL_L/R the 80-tooth GT2 pulleys on the extension NEMA 17s
//   THR_UP / THR_LO the 8 upper and 8 lower GoBILDA thrust bearings, MR106 the 8 radial bearings,
//   RING     the printed 288-tooth pulley disc and its standoffs, MIDPLATE the fixed middle plate
//   TPUL     the NEMA 23's 80-tooth pulley, BELT the turntable belt, NEMA23, BASE the fixed base
//   UNO PERF PI PSU TERM BUCK MOS1 MOS2 BAY_L BAY_R   electronics and their printed bays
//   PRINTER HOLDERS PLATE_L PLATE_C PLATE_R STOCK
//
// Axes, from the CAD (GLB metres, Y up; GLB (x, y, z) = STEP (x, z, -y) / 1000):
//   Turntable: vertical through x 0, z 79.5 mm. The 288-tooth ring and the 8 radial bearings (at
//     r = 100 mm) are centred there, and the fixed plate's hole edge is r = 105 mm about it.
//   Extension: along -Z of the turntable (the SAR340 slides run along Z, z -120..280 mm). The
//     grasper centre sits at z -1 mm when retracted; the printer plate centre is at z -356 mm and
//     both holder plates are 435 mm from the turntable axis, so one 355 mm stroke reaches all three.
//   NEMA 23 pulley: vertical through x 0, z 362.8 mm; extension pulleys: vertical through
//     x -49.5 / +49.5, z 242.5 mm.
import * as THREE from 'three';

export const MODEL = '/assets/models/build-plate-robot/final.glb';
export const AXIS = [0, -0.03, 0.0795];
export const STROKE = 0.355;                 // m, grasper centre z -1 mm to the printer plate centre z -356 mm
export const RATIO = 288 / 80;               // turntable reduction, from the pulley tooth counts
export const EXT_PITCH_R = (80 * 0.002) / (2 * Math.PI); // 80 T GT2 pulley pitch radius, m (CAD)
const DEG = Math.PI / 180;

const NAMES = ['ROT', 'EXT', 'MAG', 'MID', 'BALLS_IN', 'BALLS_OUT', 'EPUL_L', 'EPUL_R', 'THR_UP', 'THR_LO', 'MR106', 'RING',
  'MIDPLATE', 'TPUL', 'BELT', 'NEMA23', 'BASE', 'UNO', 'PERF', 'PI', 'PSU', 'TERM', 'BUCK', 'MOS1', 'MOS2', 'BAY_L', 'BAY_R',
  'PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_C', 'PLATE_R', 'STOCK'];

export async function loadRig(stage) {
  const model = await stage.load(MODEL);
  const P = {};
  for (const n of NAMES) {
    P[n] = stage.part(new RegExp(`_G_${n}$`))[0];
    if (!P[n]) throw new Error(`replac3d rig: part ${n} missing`);
  }
  model.updateMatrixWorld(true);

  // turntable: one pivot about the real axis; everything that turns lives inside it
  const turret = stage.pivot([P.ROT, P.EXT, P.MAG, P.MID, P.BALLS_IN, P.BALLS_OUT, P.EPUL_L, P.EPUL_R, P.THR_UP, P.MR106, P.THR_LO, P.RING], AXIS, [0, 1, 0]);
  turret.updateMatrixWorld(true);
  const group = (parent, name, list) => {
    const g = new THREE.Group(); g.name = name; parent.add(g); g.updateMatrixWorld(true);
    for (const o of list) g.attach(o);
    return g;
  };
  // explode layers (turntable demo), then the moving members of the arm inside the top layer
  const upper = group(turret, 'upper', [P.ROT, P.EPUL_L, P.EPUL_R]);
  const ext = group(upper, 'ext', [P.EXT, P.MAG]);
  const mid = group(upper, 'mid', [P.MID]);
  const ballsIn = group(upper, 'balls-in', [P.BALLS_IN]);
  const ballsOut = group(upper, 'balls-out', [P.BALLS_OUT]);
  const thrUp = group(turret, 'thrust-up', [P.THR_UP]);
  const radial = group(turret, 'radial', [P.MR106]);
  const thrLo = group(turret, 'thrust-lo', [P.THR_LO]);
  const ring = group(turret, 'ring', [P.RING]);
  const drive = group(model, 'drive', [P.BELT, P.TPUL]);
  const epulL = stage.pivot(P.EPUL_L, [-0.0495, 0.05, 0.2425], [0, 1, 0]);
  const epulR = stage.pivot(P.EPUL_R, [0.0495, 0.05, 0.2425], [0, 1, 0]);
  const tpul = stage.pivot(P.TPUL, [0, -0.04, 0.3628], [0, 1, 0]);

  const state = { theta: 0, s: 0, explode: 0 };
  function set(o = {}) {
    Object.assign(state, o);
    const { theta, s, explode: e } = state;
    turret.setAngle(theta * DEG);
    ext.position.z = -s;
    mid.position.z = -s / 2;          // the middle member floats between stops; drawn at half travel
    ballsIn.position.z = -0.75 * s;   // a ball row rolls at the mean speed of the two members it sits between
    ballsOut.position.z = -0.25 * s;
    epulL.setAngle(s / EXT_PITCH_R);
    epulR.setAngle(-s / EXT_PITCH_R); // the two belts are mirror images
    tpul.setAngle(RATIO * theta * DEG); // open belt: motor pulley turns the same way, 3.6 times as far
    upper.position.y = 0.09 * e;
    thrUp.position.y = 0.045 * e;
    thrLo.position.y = -0.045 * e;
    ring.position.y = -0.09 * e;
    drive.position.y = -0.09 * e;
    stage.invalidate();
  }

  // Materials are shared between parts of one colour, so anything faded gets its own copies.
  const faded = new Map();
  function fade(obj, opacity) {
    obj.traverse((m) => {
      if (!m.isMesh) return;
      if (!faded.has(m)) {
        const orig = m.material;
        m.material = Array.isArray(orig) ? orig.map((x) => x.clone()) : orig.clone();
        faded.set(m, orig);
      }
      for (const mat of [].concat(m.material)) {
        const t = opacity < 0.999;
        if (mat.transparent !== t) { mat.transparent = t; mat.needsUpdate = true; }
        mat.opacity = opacity;
        mat.depthWrite = !t;
      }
      m.castShadow = opacity > 0.5;
    });
    stage.invalidate();
  }

  // Plate poses as matrices, so a carried plate follows the carriage exactly.
  const extWorld = (theta, s) => {
    const keep = { ...state };
    set({ theta, s, explode: 0 });
    turret.updateMatrixWorld(true);
    const m = ext.matrixWorld.clone();
    set(keep);
    return m;
  };
  function carrier(plate, pickTheta, pickS) {
    // the plate's pose relative to the carriage, taken where the plate sits in the CAD
    plate.updateMatrixWorld(true);
    const rel = extWorld(pickTheta, pickS).invert().multiply(plate.matrixWorld);
    plate.matrixAutoUpdate = false;
    return {
      rel,
      at: (theta, s) => extWorld(theta, s).multiply(rel),          // where it ends up when let go there
      carried: () => { turret.updateMatrixWorld(true); return ext.matrixWorld.clone().multiply(rel); },
      put(mat) { plate.matrix.copy(mat); plate.matrixWorldNeedsUpdate = true; stage.invalidate(); },
    };
  }

  set({});
  return { model, P, turret, upper, ext, mid, ballsIn, ballsOut, thrUp, radial, thrLo, ring, drive, set, state, fade, carrier };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

let styled = false;
/** Small dark overlay styles shared by the demos (the site's .rx-hint look). */
export function style() {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
.bpr-hud { position: absolute; z-index: 3; top: 12px; right: 12px; display: grid; grid-template-columns: auto auto; gap: 2px 12px;
  padding: 8px 12px; border-radius: 12px; background: rgba(10, 8, 7, 0.7); border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 12px; line-height: 1.5; color: #b8b0a7; pointer-events: none; }
.bpr-hud b { font-weight: 650; color: #eee9e3; text-align: right; font-variant-numeric: tabular-nums; }
.bpr-hud b.on { color: #ff8a57; }
.bpr-note { position: absolute; z-index: 3; left: 12px; bottom: 12px; max-width: min(360px, calc(100% - 24px)); padding: 6px 11px; border-radius: 10px;
  background: rgba(10, 8, 7, 0.66); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 12px; line-height: 1.4; color: #b8b0a7; pointer-events: none; }
.bpr-labs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.bpr-lab { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font-size: 12px; line-height: 1.2; color: #eee9e3; transition: opacity .25s; }
.bpr-lab i { width: 7px; height: 7px; border-radius: 50%; background: #ff6b35; box-shadow: 0 0 0 2px rgba(11, 10, 9, .7); flex: none; }
.bpr-lab b { font-weight: 500; padding: 3px 7px; border-radius: 6px; background: rgba(11, 10, 9, .8); border: 1px solid rgba(237, 232, 226, .18); }
.bpr-lab.l { flex-direction: row-reverse; }
@media (max-width: 600px) { .bpr-hud { top: 8px; right: 8px; font-size: 11px; padding: 6px 9px; } .bpr-lab { font-size: 11px; } .bpr-note { font-size: 11px; left: 8px; bottom: 8px; } }
@media (prefers-reduced-motion: reduce) { .bpr-lab { transition: none; } }`;
  document.head.append(s);
}

/** Heads-up readout in a corner of the stage: rows [{ key, label }]. Returns set({ key: text }). */
export function hud(el, rows) {
  style();
  const box = document.createElement('div');
  box.className = 'bpr-hud';
  box.setAttribute('aria-hidden', 'true');
  const cells = {};
  for (const r of rows) {
    const k = document.createElement('span'); k.textContent = r.label;
    const v = document.createElement('b');
    box.append(k, v); cells[r.key] = v;
  }
  el.append(box);
  return {
    el: box,
    set(vals) { for (const [k, v] of Object.entries(vals)) { const c = cells[k]; if (!c) continue; const [txt, on] = Array.isArray(v) ? v : [v, false]; if (c.textContent !== txt) c.textContent = txt; c.classList.toggle('on', !!on); } },
  };
}

/** A one-line note in the bottom-left corner of the stage. */
export function note(el, text) {
  style();
  const n = document.createElement('p');
  n.className = 'bpr-note';
  n.textContent = text;
  el.append(n);
  return n;
}

/** Screen-space labels: a dot on a point of the model and a short name beside it. */
export function labels(el) {
  style();
  const box = document.createElement('div');
  box.className = 'bpr-labs';
  box.setAttribute('aria-hidden', 'true');
  el.append(box);
  let items = [];
  const v = new THREE.Vector3();
  return {
    set(list) {
      const key = list.map((x) => x.text).join('|');
      if (key === box.dataset.key) { items.forEach((it, i) => { it.p = list[i].p; }); return; }
      box.dataset.key = key;
      box.textContent = '';
      items = list.map((x) => {
        const d = document.createElement('span');
        d.className = `bpr-lab${x.side === 'l' ? ' l' : ''}`;
        d.innerHTML = '<i></i><b></b>';
        d.querySelector('b').textContent = x.text;
        box.append(d);
        return { ...x, d };
      });
    },
    update(camera) {
      const w = el.clientWidth, h = el.clientHeight;
      camera.updateMatrixWorld();
      for (const it of items) {
        v.copy(it.p).project(camera);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const off = it.side === 'l' ? -it.d.offsetWidth + 3.5 : -3.5;
        it.d.style.transform = `translate(${(x + off).toFixed(1)}px, ${(y - 9).toFixed(1)}px)`;
        it.d.style.opacity = v.z > 1 || x < 0 || x > w || y < 0 || y > h ? '0' : '1';
      }
    },
  };
}

/** Camera view between two { pos, target } views, orbiting around the target rather than cutting through. */
export function blendView(a, b, t) {
  const target = a.target.clone().lerp(b.target, t);
  const sa = new THREE.Spherical().setFromVector3(a.pos.clone().sub(a.target));
  const sb = new THREE.Spherical().setFromVector3(b.pos.clone().sub(b.target));
  let dt = sb.theta - sa.theta;
  while (dt > Math.PI) dt -= 2 * Math.PI;
  while (dt < -Math.PI) dt += 2 * Math.PI;
  const s = new THREE.Spherical(lerp(sa.radius, sb.radius, t), lerp(sa.phi, sb.phi, t), sa.theta + dt * t);
  return { pos: new THREE.Vector3().setFromSpherical(s).add(target), target };
}

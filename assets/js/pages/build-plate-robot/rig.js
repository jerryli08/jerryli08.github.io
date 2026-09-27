// Shared rig for the Replac3d demos: loads Jerry's full CAD (robot, printer, plate holders) and
// rigs its two axes about the real geometry.
//
// The web models keep the CAD's parts grouped by how they move (regrouped by world transform before
// tools/optimize-cad.mjs, shapes untouched; see /home/claude/work/replac3d/cad/README.md); every
// group is named G_<NAME>. final.glb has everything but the circuit boards, which are in
// electronics.glb (loaded only by the electronics scrolly, with { electronics: true }):
//   ROT      everything that turns with the turntable: frame, side plates, bottom plate, slides'
//            outer members, extension motors and idlers, chain mount
//   EXT      the carriage: 2020 extrusions, electromagnet mount, slides' inner members, belt clamps
//   MAG      the four Adafruit 5 V 10 kg electromagnets (on the carriage)
//   MID      the slides' middle members; BALLS_IN / BALLS_OUT the two ball rows of each slide
//   EPUL_L/R the 80-tooth GT2 pulleys on the extension NEMA 17s
//   THR_UP / THR_LO the 8 upper and 8 lower GoBILDA thrust bearings, MR106 the 8 radial bearings,
//   RING     the printed 288-tooth pulley disc and its standoffs, MIDPLATE the fixed middle plate
//   TPUL     the NEMA 23's 80-tooth pulley, BELT the turntable belt, NEMA23, BASE the fixed base
//   PSU BAY_L BAY_R   the power supply and the printed electronics bays
//   UNO PERF PI TERM BUCK MOS1 MOS2   the boards (electronics.glb)
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
export const BOARDS = '/assets/models/build-plate-robot/electronics.glb';
export const AXIS = [0, -0.03, 0.0795];
export const STROKE = 0.355;                 // m, grasper centre z -1 mm to the printer plate centre z -356 mm
export const RATIO = 288 / 80;               // turntable reduction, from the pulley tooth counts
export const EXT_PITCH_R = (80 * 0.002) / (2 * Math.PI); // 80 T GT2 pulley pitch radius, m (CAD)
const DEG = Math.PI / 180;

const NAMES = ['ROT', 'EXT', 'MAG', 'MID', 'BALLS_IN', 'BALLS_OUT', 'EPUL_L', 'EPUL_R', 'THR_UP', 'THR_LO', 'MR106', 'RING',
  'MIDPLATE', 'TPUL', 'BELT', 'NEMA23', 'BASE', 'PSU', 'BAY_L', 'BAY_R', 'PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_C', 'PLATE_R', 'STOCK'];
const BOARD_NAMES = ['UNO', 'PERF', 'PI', 'TERM', 'BUCK', 'MOS1', 'MOS2'];

export async function loadRig(stage, { electronics = false } = {}) {
  const [model, boards] = await Promise.all([stage.load(MODEL), electronics ? stage.load(BOARDS) : null]);
  const P = {};
  for (const n of electronics ? [...NAMES, ...BOARD_NAMES] : NAMES) {
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

  // Materials are shared between parts of one colour, so anything faded gets its own copies
  // (stage.cloneMaterial keeps section cuts working). Only a change of opacity touches the scene.
  const faded = new Map(), fadeNow = new Map();
  function fade(obj, opacity) {
    opacity = Math.round(opacity * 1000) / 1000;
    if (fadeNow.get(obj) === opacity) return;
    fadeNow.set(obj, opacity);
    obj.traverse((m) => {
      if (!m.isMesh) return;
      if (!faded.has(m)) {
        const orig = m.material;
        m.material = Array.isArray(orig) ? orig.map((x) => stage.cloneMaterial(x)) : stage.cloneMaterial(orig);
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
  return { model, boards, P, turret, upper, ext, mid, ballsIn, ballsOut, thrUp, radial, thrLo, ring, drive, set, state, fade, carrier };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

/** Emissive glow on parts that follows the scroll: set(k) with k 0..1 (0 restores the parts). */
export function glow(stage, parts, color = '#ff7a2f', max = 0.55) {
  let off = null, last = -1;
  return (k) => {
    k = Math.round(k * 100) / 100;
    if (k === last) return;
    last = k;
    if (k <= 0) { off?.(); off = null; return; }
    off = stage.highlight(parts, color, { intensity: max * k });
  };
}

/** An .rx-hud readout in the label layer: html with data-k cells; put(k, text) and bar(k, 0..1) write only on change. */
export function readout(ov, html) {
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = html;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  return {
    el: hud,
    put(k, text) { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } },
    bar(k, f) { const w = `${(clamp(f, 0, 1) * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } },
    show(a) { const o = String(Math.round(a * 100) / 100); if (shown.$ !== o) { hud.style.opacity = o; shown.$ = o; } },
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

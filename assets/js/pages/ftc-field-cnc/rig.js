// Shared rig for the Upcycled CNC Router page: loads Jerry's gantry CAD and moves it about its real
// axes. The web model (tools/cad/configs/ftc-field-cnc-gantry.json) keeps the parts that move
// together as named pieces (cnc_*); nothing is reshaped, only screws were dropped along with the
// duplicate left Y motor and coupler that sat on top of the originals in the file.
//
// Model frame (metres, Y up): x across the machine (the X axis), z front to back (the Y axis; the
// Y motors are at the -z end), floor at y = 0.0254 (the bottom of the field extrusions).
// Axes, from tools/cad-axes.py on /home/claude/cad_src/upcycled_cnc_router_gantry.step (STEP mm,
// converted with cad.point: STEP (X, Y, Z) -> model (X, Z, -Y) / 1000):
//   right Y ball screw  STEP axis along Y at X 516.4, Z 83.4   -> x 0.5164, y 0.0834, along z
//   left Y ball screw   STEP axis along Y at X -37.1, Z 83.4   -> x -0.0371, y 0.0834, along z
//   X ball screw        STEP axis along X at Y 392.0, Z 218.7  -> y 0.2187, z -0.392, along x
// Screws: SFU1605 (16 mm, 5 mm lead, right-hand). A nut move of d mm along +axis turns the screw
// -2 pi d / 5 about +axis (the screw is held axially). Both Y screws turn together (dual drive).
// Travel from the CAD pose, found in the CAD (see /home/claude/work/upcycled-cnc-router/demos.md):
//   X 0 to 416.8 mm (the carriage blocks reach the end of the 550 mm rails),
//   Y -148.1 to 312.1 mm (the gantry plates reach the Y motor plates / the blocks reach the rail ends).
import { createStage, cad } from '/assets/js/lib/stage.js';
import * as THREE from 'three';

export const SRC = '/assets/models/ftc-field-cnc/gantry.glb';
export const LEAD = 5; // mm per turn (SFU1605)
export const STEPS_PER_TURN = 200; // 1.8 degree steppers, full steps
export const TRAVEL = { x: [0, 416.8], y: [-148.1, 312.1] };
export const AX = {
  yR: { p: cad.point([516.4, 0, 83.4]), d: [0, 0, 1] },
  yL: { p: cad.point([-37.1, 0, 83.4]), d: [0, 0, 1] },
  x: { p: cad.point([0, 392.0, 218.7]), d: [1, 0, 0] },
};

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const mm = (x, y, z) => [x / 1000, y / 1000, z / 1000];

export async function loadCnc(el, o = {}) {
  const stage = createStage(el, { controls: false, hint: false, ...o });
  const model = await stage.load(SRC);
  const P = {};
  for (const k of ['frame', 'sideplates', 'yrails', 'ymotors', 'ymounts', 'ybk12_R', 'ybk12_L', 'yscrew_R', 'yscrew_L', 'ynuts', 'yblocks',
    'gantry', 'spacers', 'xbeams', 'xrails', 'xbk12', 'xmotor', 'xscrew', 'xblocks', 'xnut']) {
    const found = stage.part(new RegExp(`_cnc_${k}$`));
    if (!found.length) throw new Error(`cnc: no part ${k}`);
    P[k] = found[0];
  }
  const base = P.frame.parent; // the model's own frame (the optimizer flattened every part under it)

  // everything that rides front to back with the gantry
  const gantry = new THREE.Group();
  gantry.name = 'rig:gantry';
  base.add(gantry);
  for (const k of ['gantry', 'spacers', 'xbeams', 'xrails', 'xbk12', 'xmotor', 'ynuts', 'yblocks', 'xscrew']) gantry.attach(P[k]);
  // the X carriage rides side to side on the gantry
  const carriage = new THREE.Group();
  carriage.name = 'rig:carriage';
  gantry.add(carriage);
  carriage.attach(P.xblocks); carriage.attach(P.xnut);
  // screws spin about their real axes (the X screw's pivot lives inside the moving gantry)
  const spinYR = stage.pivot(P.yscrew_R, AX.yR.p, AX.yR.d, { frame: model });
  const spinYL = stage.pivot(P.yscrew_L, AX.yL.p, AX.yL.d, { frame: model });
  const spinX = stage.pivot(P.xscrew, AX.x.p, AX.x.d, { frame: model });

  let cur = { x: NaN, y: NaN };
  /** Put the machine at X, Y (mm from the CAD pose). Pure: the same numbers give the same picture. */
  function setXY(x, y) {
    if (x === cur.x && y === cur.y) return;
    cur = { x, y };
    gantry.position.z = y / 1000;
    carriage.position.x = x / 1000;
    const ty = (-2 * Math.PI * y) / LEAD, tx = (-2 * Math.PI * x) / LEAD;
    spinYR.setAngle(ty); spinYL.setAngle(ty); spinX.setAngle(tx);
    stage.invalidate();
  }
  setXY(0, 0);
  return { stage, model, base, P, gantry, carriage, setXY };
}

/** A cached set of views, framed once with the machine at rest; recomputed only when the stage's aspect changes. */
export function viewSet(stage, el, specs, frameObj) {
  let views = null, key = '';
  return function get(extra = '') {
    const k = `${(el.clientWidth / Math.max(1, el.clientHeight)).toFixed(3)}|${extra}`;
    if (views && k === key) return views;
    key = k;
    views = specs.map((s) => {
      const v = stage.frame(typeof s.obj === 'function' ? s.obj() : (s.obj || frameObj), { ...s, apply: false, refresh: true });
      return { pos: v.pos.clone(), target: v.target.clone() };
    });
    return views;
  };
}

const sa = new THREE.Spherical(), sb = new THREE.Spherical(), tmp = new THREE.Vector3();
/** Blend two cached views: target lerped, camera swung about it on a sphere (never through the model). */
export function blendView(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  sa.setFromVector3(tmp.copy(a.pos).sub(a.target));
  sb.setFromVector3(tmp.copy(b.pos).sub(b.target));
  let dT = sb.theta - sa.theta;
  while (dT > Math.PI) dT -= 2 * Math.PI;
  while (dT < -Math.PI) dT += 2 * Math.PI;
  const target = a.target.clone().lerp(b.target, k);
  const s = new THREE.Spherical(lerp(sa.radius, sb.radius, k), lerp(sa.phi, sb.phi, k), sa.theta + dT * k);
  return { pos: new THREE.Vector3().setFromSpherical(s).add(target), target };
}

/** A readout card (.rx-hud) in the label layer: rows [key, label, hideOnPhone]. */
export function hud(layer, rows, foot = '') {
  const el = document.createElement('div');
  el.className = 'rx-hud';
  el.innerHTML = rows.map(([k, label, x]) => `<div class="rx-hud-row${x ? ' rx-hud-x' : ''}"><span>${label}</span><b class="num" data-k="${k}"></b></div>`).join('')
    + '<div class="rx-hud-mini num" data-k="mini"></div>'
    + (foot ? `<div class="rx-hud-x" style="margin-top:8px;font-size:11.5px;color:var(--muted)">${foot}</div>` : '');
  layer.append(el);
  const K = Object.fromEntries([...el.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  return { el, put(k, text) { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } } };
}

/** setView only when the view really changed, so a repeated scroll position draws nothing new. */
export function viewSetter(stage) {
  let last = '';
  return (v) => {
    const k = [v.pos.x, v.pos.y, v.pos.z, v.target.x, v.target.y, v.target.z].map((x) => x.toFixed(5)).join();
    if (k === last) return;
    last = k;
    stage.setView(v);
  };
}

// The room for the fetch demos: a floor, a black cubby shelf with three items, a storage box
// and a chair. These are simple props for the scene, not parts of the robot; the robot is
// Jerry's CAD (rig.js). Also the planner: A* on a 5 cm floor grid, like the grid of free and
// blocked cells on the robot's laptop.
//
// Room frame: metres, Y up, floor at y = 0, x from -2 to 2, z from -1.5 to 1.5. The shelf stands
// against the far wall (z = -1.5). A robot heading psi (rotation about Y) drives along
// (sin psi, 0, cos psi) and its arm side, +X in the model, points along (cos psi, 0, -sin psi).
import * as THREE from 'three';
import { REACH, POSES, gripAngleFor } from './rig.js';

export const ROOM = { x0: -2, x1: 2, z0: -1.5, z1: 1.5 };
export const SHELF = { x0: -0.6, x1: 0.6, front: -1.15, back: -1.5, boards: [0.3, 0.55, 0.8], top: 1.08, t: 0.02 };
const IN = 0.05; // grip point this far behind the shelf front
// items stand in the three cubbies; grip heights come from the item sizes
export const ITEMS = {
  water: { name: 'water bottle', x: -0.4, board: 0.3, grip: 0.15, width: 0.065 },
  pill: { name: 'pill bottle', x: 0, board: 0.8, grip: 0.035, width: 0.035 }, // up top, so the lift has to raise the arm
  book: { name: 'book', x: 0.4, board: 0.55, grip: 0.1, width: 0.025 },
};
export const START = { x: -0.45, z: 1.0, psi: Math.PI }; // beside the chair, arm side facing it
export const USER = { x: -1.3, z: 1.0 };
export const PARK_Z = SHELF.front - IN + REACH.x; // robot centre when the grip point reaches the item
export const OBSTACLES = [
  { name: 'box', x0: -0.8, x1: -0.1, z0: -0.025, z1: 0.425, h: 0.35 },
  { name: 'table', x0: 1.05, x1: 1.55, z0: 0.1, z1: 0.6, h: 0.55 },
  { name: 'chair', x0: USER.x - 0.225, x1: USER.x + 0.225, z0: USER.z - 0.225, z1: USER.z + 0.225, h: 0.45 },
  { name: 'shelf', x0: SHELF.x0, x1: SHELF.x1, z0: SHELF.back, z1: SHELF.front, h: SHELF.top },
];

/**
 * Where the robot must park and how far the lift must move for each item. The grip point in the
 * reach pose comes from the CAD rig by forward kinematics, so the robot parks exactly one reach
 * from the item and the lift puts the jaws at the item's grip height. Call with the robot at the
 * origin (rig freshly loaded); leaves the arm in the rest pose.
 */
export function computeTargets(R, THREEns = THREE) {
  R.model.parent?.updateMatrixWorld(true);
  R.arm.pose(POSES.reach);
  R.model.updateMatrixWorld(true);
  const reach = R.model.worldToLocal(R.grip.getWorldPosition(new THREEns.Vector3()));
  R.arm.pose(POSES.rest);
  const gripZ = SHELF.front - IN, T = {};
  for (const [k, it] of Object.entries(ITEMS)) {
    const close = gripAngleFor(it.width);
    T[k] = { dy: it.board + it.grip - reach.y, park: { x: it.x - reach.z, z: gripZ + reach.x }, close, open: Math.max(0, close - 28) };
  }
  return { T, reach };
}

// ------------------------------------------------------------------ scene
export function buildRoom(THREEns = THREE) {
  const g = new THREEns.Group();
  g.name = 'room';
  const mat = (color, o = {}) => new THREEns.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
  const box = (w, h, d, m, x, y, z) => {
    const b = new THREEns.Mesh(new THREEns.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  };

  // floor with a faint 25 cm grid
  const c = document.createElement('canvas'); c.width = 1024; c.height = 768;
  const x2 = c.getContext('2d');
  x2.fillStyle = '#1d1a17'; x2.fillRect(0, 0, c.width, c.height);
  x2.strokeStyle = 'rgba(255,255,255,0.06)'; x2.lineWidth = 2;
  for (let i = 0; i <= 16; i++) { x2.beginPath(); x2.moveTo((i * c.width) / 16, 0); x2.lineTo((i * c.width) / 16, c.height); x2.stroke(); }
  for (let j = 0; j <= 12; j++) { x2.beginPath(); x2.moveTo(0, (j * c.height) / 12); x2.lineTo(c.width, (j * c.height) / 12); x2.stroke(); }
  const tex = new THREEns.CanvasTexture(c); tex.colorSpace = THREEns.SRGBColorSpace; tex.anisotropy = 4;
  const floor = new THREEns.Mesh(new THREEns.PlaneGeometry(4, 3), new THREEns.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'floor';
  g.add(floor);
  const edge = new THREEns.Mesh(new THREEns.BoxGeometry(4, 0.04, 3), mat('#15120f'));
  edge.position.y = -0.0201; g.add(edge);

  // black cubby shelf
  const dark = mat('#161618', { roughness: 0.6 });
  const W = SHELF.x1 - SHELF.x0, D = SHELF.front - SHELF.back, cz = (SHELF.front + SHELF.back) / 2;
  box(W, SHELF.t, D, dark, 0, SHELF.top - SHELF.t / 2, cz);
  box(W, SHELF.t, D, dark, 0, 0.06, cz);
  for (const y of SHELF.boards) box(W, SHELF.t, D, dark, 0, y - SHELF.t / 2, cz);
  for (const x of [SHELF.x0 + 0.01, SHELF.x1 - 0.01, -0.2, 0.2]) box(0.02, SHELF.top, D, dark, x, SHELF.top / 2, cz);
  box(W, SHELF.top, 0.01, dark, 0, SHELF.top / 2, SHELF.back + 0.005);

  // items
  const items = {};
  const zIn = SHELF.front - IN;
  {
    const it = new THREEns.Group(); // pill bottle: amber, white cap, 35 mm x 70 mm
    const body = new THREEns.Mesh(new THREEns.CylinderGeometry(0.0175, 0.0175, 0.07, 32), new THREEns.MeshPhysicalMaterial({ color: '#e0892c', roughness: 0.25, clearcoat: 0.6 }));
    body.position.y = 0.035;
    const cap = new THREEns.Mesh(new THREEns.CylinderGeometry(0.0185, 0.0185, 0.016, 32), mat('#f2efe9', { roughness: 0.5 }));
    cap.position.y = 0.078;
    it.add(body, cap);
    items.pill = it;
  }
  {
    const it = new THREEns.Group(); // water bottle: clear blue, 65 mm x 200 mm
    const body = new THREEns.Mesh(new THREEns.CylinderGeometry(0.0325, 0.0325, 0.17, 40), new THREEns.MeshPhysicalMaterial({ color: '#8cc4ef', roughness: 0.08, transparent: true, opacity: 0.62, clearcoat: 1 }));
    body.position.y = 0.085;
    const neck = new THREEns.Mesh(new THREEns.CylinderGeometry(0.013, 0.0325, 0.02, 40), body.material);
    neck.position.y = 0.18;
    const cap = new THREEns.Mesh(new THREEns.CylinderGeometry(0.014, 0.014, 0.018, 24), mat('#2f6fd6', { roughness: 0.4 }));
    cap.position.y = 0.199;
    it.add(body, neck, cap);
    items.water = it;
  }
  {
    const it = new THREEns.Group(); // book on its end, spine out: 25 mm x 220 mm x 150 mm
    const teal = mat('#2e6b62', { roughness: 0.6 }), pages = mat('#efe8da');
    const book = new THREEns.Mesh(new THREEns.BoxGeometry(0.025, 0.22, 0.15), [teal, teal, pages, pages, teal, pages]); // covers, page edges, spine (+Z, facing the room)
    book.position.set(0, 0.11, -0.025); // spine flush with the shelf front
    it.add(book);
    items.book = it;
  }
  for (const [k, it] of Object.entries(items)) {
    it.name = `item-${k}`;
    it.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    it.userData.home = new THREEns.Vector3(ITEMS[k].x, ITEMS[k].board, zIn);
    it.position.copy(it.userData.home);
    g.add(it);
  }

  // storage box and side table (obstacles), chair for the user
  const card = mat('#8b6b47', { roughness: 0.9 });
  for (const o of OBSTACLES) {
    if (o.name === 'box') box(o.x1 - o.x0, o.h, o.z1 - o.z0, card, (o.x0 + o.x1) / 2, o.h / 2, (o.z0 + o.z1) / 2);
    if (o.name === 'table') {
      const wood = mat('#3b2f26', { roughness: 0.7 });
      const cx = (o.x0 + o.x1) / 2, cz2 = (o.z0 + o.z1) / 2;
      box(o.x1 - o.x0, 0.03, o.z1 - o.z0, wood, cx, o.h - 0.015, cz2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.035, o.h - 0.03, 0.035, wood, cx + sx * 0.21, (o.h - 0.03) / 2, cz2 + sz * 0.21);
    }
  }
  const seat = mat('#474a52', { roughness: 0.75 });
  box(0.45, 0.06, 0.45, seat, USER.x, 0.42, USER.z);
  box(0.05, 0.45, 0.45, seat, USER.x - 0.2, 0.67, USER.z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, 0.39, 0.03, seat, USER.x + sx * 0.19, 0.195, USER.z + sz * 0.19);

  // plan overlay: one pixel per 5 cm cell, drawn by the planner
  const pc = document.createElement('canvas'); pc.width = GRID.nx; pc.height = GRID.nz;
  const ptex = new THREEns.CanvasTexture(pc); ptex.magFilter = THREEns.NearestFilter; ptex.minFilter = THREEns.NearestFilter; ptex.colorSpace = THREEns.SRGBColorSpace;
  const overlay = new THREEns.Mesh(new THREEns.PlaneGeometry(4, 3), new THREEns.MeshBasicMaterial({ map: ptex, transparent: true, depthWrite: false }));
  overlay.rotation.x = -Math.PI / 2; overlay.position.y = 0.003; overlay.renderOrder = 1; overlay.name = 'plan-overlay';
  g.add(overlay);
  // planned path: a flat ribbon, rebuilt per plan
  const pathMat = new THREEns.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95, depthWrite: false, side: THREEns.DoubleSide });
  const path = new THREEns.Mesh(new THREEns.BufferGeometry(), pathMat);
  path.renderOrder = 2; path.name = 'plan-path';
  g.add(path);

  return {
    group: g, items, overlay, planCanvas: pc, planTex: ptex, path,
    setPath(points, width = 0.035) {
      path.geometry.dispose();
      path.geometry = ribbon(THREEns, points, width);
    },
  };
}

function ribbon(T, pts, w) {
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    pos.push(pts[i].x - dz * w / 2, 0.006, pts[i].z + dx * w / 2, pts[i].x + dz * w / 2, 0.006, pts[i].z - dx * w / 2);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

// ------------------------------------------------------------------ planner
export const GRID = { cell: 0.05, nx: 80, nz: 60 };
const RADIUS = 0.3; // robot half-width 0.215 m plus margin; the folded arm rides above the box
const cx = (i) => ROOM.x0 + (i + 0.5) * GRID.cell, cz = (j) => ROOM.z0 + (j + 0.5) * GRID.cell;
const ci = (x) => Math.floor((x - ROOM.x0) / GRID.cell), cj = (z) => Math.floor((z - ROOM.z0) / GRID.cell);
function rectDist(o, x, z) {
  const dx = Math.max(o.x0 - x, 0, x - o.x1), dz = Math.max(o.z0 - z, 0, z - o.z1);
  return Math.hypot(dx, dz);
}
let BLOCKED = null;
export function blocked() {
  if (BLOCKED) return BLOCKED;
  BLOCKED = new Uint8Array(GRID.nx * GRID.nz);
  for (let j = 0; j < GRID.nz; j++) for (let i = 0; i < GRID.nx; i++) {
    const x = cx(i), z = cz(j);
    let b = x < ROOM.x0 + RADIUS || x > ROOM.x1 - RADIUS || z < ROOM.z0 + RADIUS || z > ROOM.z1 - RADIUS ? 1 : 0;
    for (const o of OBSTACLES) if (rectDist(o, x, z) < RADIUS) b = 2;
    BLOCKED[j * GRID.nx + i] = b;
  }
  return BLOCKED;
}
const free = (i, j) => i >= 0 && j >= 0 && i < GRID.nx && j < GRID.nz && !blocked()[j * GRID.nx + i];
function nearestFree(i, j) {
  if (free(i, j)) return [i, j];
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (free(i + di, j + dj)) return [i + di, j + dj];
  return [i, j];
}
function lineFree(a, b) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2) + 1;
  for (let k = 0; k <= n; k++) { const t = k / n; if (!free(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t))) return false; }
  return true;
}
/** A* from (x, z) to (x, z) on the 5 cm grid. Returns { cells, points } (points smoothed by line of sight). */
export function plan(from, to) {
  const [si, sj] = nearestFree(ci(from.x), cj(from.z)), [gi, gj] = nearestFree(ci(to.x), cj(to.z));
  const N = GRID.nx * GRID.nz, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const h = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz); };
  const open = [[h(si, sj), si, sj]];
  g[sj * GRID.nx + si] = 0;
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, i, j] = open.splice(bi, 1)[0];
    const id = j * GRID.nx + i;
    if (closed[id]) continue;
    closed[id] = 1;
    if (i === gi && j === gj) break;
    for (const [di, dj, c] of D) {
      const ni = i + di, nj = j + dj;
      if (!free(ni, nj) || (di && dj && (!free(i + di, j) || !free(i, j + dj)))) continue;
      const nid = nj * GRID.nx + ni, ng = g[id] + c;
      if (ng < g[nid]) { g[nid] = ng; came[nid] = id; open.push([ng + h(ni, nj), ni, nj]); }
    }
  }
  const cells = [];
  for (let id = gj * GRID.nx + gi; id >= 0; id = came[id]) { cells.push([id % GRID.nx, Math.floor(id / GRID.nx)]); if (id === sj * GRID.nx + si) break; }
  cells.reverse();
  // line-of-sight smoothing
  const keep = [cells[0]];
  let a = 0;
  while (a < cells.length - 1) {
    let b = cells.length - 1;
    while (b > a + 1 && !lineFree(cells[a], cells[b])) b--;
    keep.push(cells[b]); a = b;
  }
  const points = keep.map(([i, j]) => ({ x: cx(i), z: cz(j) }));
  points[0] = { x: from.x, z: from.z };
  points[points.length - 1] = { x: to.x, z: to.z };
  return { cells, points };
}

/** Paints the plan overlay: inflated obstacles red, cells near `at` in the look-ahead cone green or red. */
export function paintPlan(room, o = {}) {
  const c = room.planCanvas, x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  const B = blocked();
  const img = x.createImageData(c.width, c.height);
  // canvas row 0 is the texture's top edge (v = 1), which the -90 deg turn about X puts at z = z0: row = j
  const put = (i, j, r, g, b, a) => { const k = (j * GRID.nx + i) * 4; img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = a; };
  for (let j = 0; j < GRID.nz; j++) for (let i = 0; i < GRID.nx; i++) {
    const b = B[j * GRID.nx + i];
    if (o.obstacles && b === 2) put(i, j, 230, 60, 50, Math.round(90 * o.obstacles));
  }
  if (o.cone) {
    const { x: rx, z: rz, psi, range = 1.1, half = 0.55 } = o.cone;
    const fx = Math.sin(psi), fz = Math.cos(psi);
    for (let j = 0; j < GRID.nz; j++) for (let i = 0; i < GRID.nx; i++) {
      const dx = cx(i) - rx, dz = cz(j) - rz, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (along < 0.25 || along > range || side > along * half) continue;
      const b = B[j * GRID.nx + i];
      if (b === 2) put(i, j, 235, 70, 55, 175); else if (!b) put(i, j, 70, 200, 110, 120);
    }
  }
  x.putImageData(img, 0, 0);
  room.planTex.needsUpdate = true;
}

/**
 * A drive as a pure function of time, for scroll-driven views: turn in place to face each
 * waypoint, drive straight to it, and optionally turn to a final heading. Each segment eases in
 * and out. Returns { dur, at(t) } where at gives { x, z, psi, dl, dr }: the pose and how far the
 * -X side and +X side wheels have rolled (metres) since the start.
 */
export function buildTrack(start, points, finalPsi, o = {}) {
  const v = o.speed || 0.32, w = (o.turnRate || 110) * Math.PI / 180, half = o.half || 0.1983;
  const segs = [];
  let x = start.x, z = start.z, psi = start.psi, dl = 0, dr = 0, t = 0;
  const turn = (to) => {
    const d = Math.atan2(Math.sin(to - psi), Math.cos(to - psi));
    if (Math.abs(d) < 0.01) return;
    const dur = Math.abs(d) / w + 0.3;
    segs.push({ t0: t, dur, x, z, psi, dl, dr, dpsi: d, dx: 0, dz: 0, rl: d * half, rr: -d * half });
    t += dur; psi += d; dl += d * half; dr -= d * half;
  };
  const line = (x1, z1) => {
    const d = Math.hypot(x1 - x, z1 - z);
    if (d < 0.005) return;
    const dur = d / v + 0.35;
    segs.push({ t0: t, dur, x, z, psi, dl, dr, dpsi: 0, dx: x1 - x, dz: z1 - z, rl: d, rr: d });
    t += dur; x = x1; z = z1; dl += d; dr += d;
  };
  for (const p of points) {
    if (Math.hypot(p.x - x, p.z - z) < 0.02) continue;
    turn(Math.atan2(p.x - x, p.z - z));
    line(p.x, p.z);
  }
  if (finalPsi != null) turn(finalPsi);
  const end = { x, z, psi, dl, dr };
  return {
    dur: t, end,
    at(tt) {
      if (tt <= 0 || !segs.length) return { x: start.x, z: start.z, psi: start.psi, dl: 0, dr: 0 };
      if (tt >= t) return { ...end };
      let s = segs[0];
      for (const q of segs) if (tt >= q.t0) s = q;
      const u = Math.min(1, (tt - s.t0) / s.dur), e = u * u * (3 - 2 * u);
      return { x: s.x + s.dx * e, z: s.z + s.dz * e, psi: s.psi + s.dpsi * e, dl: s.dl + s.rl * e, dr: s.dr + s.rr * e };
    },
  };
}

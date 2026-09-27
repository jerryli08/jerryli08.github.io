// Kinematics of the 17-cube chain, exactly as the team's planner defines it (cubot-v2/cubot/lattice.py,
// continuous_frames and geometry.advance_pose on github.com/AydanLing/Hack-The-North). Pure math, no
// rendering. Planner world: millimetres, Z up, the straight chain along +X.
//
//  - module k has a still half with rotation R[k] and a moving half R[k] * Rot(d, 120 deg * s[k]),
//    d = (1, 1, 1)/sqrt(3), the body diagonal the cube is cut across;
//  - module k+1 sits one pitch (82 mm) along the moving half's local +X and is mounted rolled
//    roll[k] quarter turns about that axis: R[k+1] = R[k] Rot(d, 120 s[k]) Rot(x, 90 roll[k]);
//  - joints are 0..15 (servos 1..16). Servo 17 in the tip cube turns a half with nothing mounted on
//    it, and a 120 degree turn about the body diagonal maps a cube onto itself, so it never changes
//    the shape: 16 useful joints, 3^16 = 43,046,721 joint words;
//  - a move is one joint, one 120 degree step, and a side: "out" swings the tail (the moving half of
//    cube j and every cube after it), "in" swings the base side the other way and leaves the tail
//    where it is, which re-orients everything built so far.
export const N = 17;
export const PITCH = 82;
export const HALF = 40;
export const ROLL = '1200130013310123';
const S3 = 1 / Math.sqrt(3);
export const DIAG = [S3, S3, S3];

// 3x3 row-major helpers
export const mul = (A, B) => {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
};
export const apply = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
export function rot(axis, a) {
  const [x, y, z] = axis, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
}
const RX = [1, 0, 0, 0, 0, -1, 0, 1, 0];
const RXP = [[1, 0, 0, 0, 1, 0, 0, 0, 1], RX, mul(RX, RX), mul(RX, mul(RX, RX))];
const TH = (2 * Math.PI) / 3;
export const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** continuous_frames: centres (mm, module 0 at the origin), still-half and moving-half rotations.
 *  angles: 16 joint angles in radians (state x 120 deg while resting). */
export function frames(angles, base, roll = ROLL) {
  let R = base.slice(), c = [0, 0, 0];
  const C = [c], S = [R], M = [];
  for (let k = 0; k < N - 1; k++) {
    const A = mul(R, rot(DIAG, angles[k]));
    M.push(A);
    c = [c[0] + PITCH * A[0], c[1] + PITCH * A[3], c[2] + PITCH * A[6]];
    R = mul(A, RXP[Number(roll[k])]);
    C.push(c); S.push(R);
  }
  M.push(R); // servo 17: nothing is mounted on the tip's moving half, it stays at 0
  return { C, S, M };
}
export const anglesOf = (states) => states.map((s) => s * TH);
export const cellsOf = (C) => C.map((c) => c.map((v) => Math.round(v / PITCH)));

/**
 * A pose of the physical chain on the table: joint states, the planner's base orientation, and where
 * module 0 is in the world (mm). pose(t) for a move in progress. The whole chain is lifted so its
 * lowest cube face touches z = 0, the way the planner settles each rest pose.
 */
export class Chain {
  constructor(base = I3) { this.states = new Array(N - 1).fill(0); this.base = base.slice(); this.o = [0, 0, 0]; }
  get rest() { return frames(anglesOf(this.states), this.base); }
  static settle(C, o) { let m = Infinity; for (const c of C) m = Math.min(m, c[2] + o[2]); return HALF - m; }
  /** world frames of every half: { still: [{R, c}], moving: [{R, c}] } for the current pose, with
   *  move m = { j, d, out, base } a fraction u (0..1) of the way through, lifted by z */
  world(m = null, u = 0) {
    const { C, S, M } = this.rest;
    const o = this.o;
    const still = S.map((R, k) => ({ R, c: [C[k][0] + o[0], C[k][1] + o[1], C[k][2] + o[2]] }));
    const moving = M.map((R, k) => ({ R, c: still[k].c }));
    let lift = Chain.settle(C, o);
    if (m && u > 0) {
      const phi = u * m.d * TH;
      const axis = apply(S[m.j], DIAG);
      const p = still[m.j].c;
      const turn = (h, Q) => {
        const r = [h.c[0] - p[0], h.c[1] - p[1], h.c[2] - p[2]];
        const q = apply(Q, r);
        return { R: mul(Q, h.R), c: [p[0] + q[0], p[1] + q[1], p[2] + q[2]] };
      };
      if (m.out) {
        const Q = rot(axis, phi);
        moving[m.j] = turn(moving[m.j], Q);
        for (let k = m.j + 1; k < N; k++) { still[k] = turn(still[k], Q); moving[k] = turn(moving[k], Q); }
      } else {
        const Q = rot(axis, -phi);
        still[m.j] = turn(still[m.j], Q);
        for (let k = 0; k < m.j; k++) { still[k] = turn(still[k], Q); moving[k] = turn(moving[k], Q); }
      }
      // the planner settles rest poses only; blend the new settle in over the last fifth of the move
      const after = this.peek(m);
      const k = Math.min(1, Math.max(0, (u - 0.8) / 0.2));
      lift += (Chain.settle(after.C, after.o) - lift) * k * k * (3 - 2 * k);
    }
    for (const h of still) h.c = [h.c[0], h.c[1], h.c[2] + lift];
    for (const h of moving) h.c = [h.c[0], h.c[1], h.c[2] + lift];
    return { still, moving };
  }
  /** the rest pose after move m, without applying it */
  peek(m) {
    const states = this.states.slice(); states[m.j] += m.d;
    const before = this.rest.C;
    const { C } = frames(anglesOf(states), m.base);
    const o = m.out ? this.o.slice() : [0, 1, 2].map((i) => this.o[i] + before[m.j + 1][i] - C[m.j + 1][i]);
    return { states, C, o };
  }
  /** apply move m = { j, d, out, base } (base: the orientation after it, from the planner) */
  step(m) {
    const p = this.peek(m);
    this.states = p.states; this.base = m.base.slice(); this.o = p.o;
  }
  /** the planner's inverse of move m, to unfold: same joint and side, opposite direction, and the
   *  base orientation from before m */
  static inverse(m, baseBefore) { return { j: m.j, d: -m.d, out: m.out, base: baseBefore }; }
}

/** a shape from library.js as move objects, with the base before each move so it can be unwound */
export function movesOf(shape) {
  let base = shape.start;
  return shape.moves.map(([j, d, out, after]) => {
    const m = { j, d, out: !!out, base: after, before: base };
    base = after;
    return m;
  });
}

/** copies of the chain at rest before move 0, after move 1, ..., after the last move */
export function snapshots(shape) {
  const out = [];
  const ch = new Chain(shape.start);
  const snap = () => { const c = new Chain(ch.base); c.states = ch.states.slice(); c.o = ch.o.slice(); return c; };
  out.push(snap());
  for (const m of movesOf(shape)) { ch.step(m); out.push(snap()); }
  return out;
}

/** which way the finished drawing faces: the lattice axis (0 x, 1 y, 2 z, planner world) along which
 *  the rest cells have no extent, or -1 for a 3D shape */
export function flatAxis(chain) {
  const C = chain.rest.C;
  for (let a = 0; a < 3; a++) { const v = C.map((c) => Math.round(c[a] / PITCH)); if (Math.max(...v) === Math.min(...v)) return a; }
  return -1;
}

/** the camera azimuth/elevation (page frame, as stage.frame takes them) from which the finished
 *  pose reads exactly like its silhouette.txt drawing, or null if no side view or top view does */
export function faceView(chain, sil) {
  const want = new Set();
  sil.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') want.add(`${r},${c}`); }));
  const cells = chain.rest.C.map((c) => [c[0] / PITCH, c[2] / PITCH, -c[1] / PITCH]); // page frame, Y up
  for (const elevation of [8, 88]) {
    for (const azimuth of [0, 90, 180, 270]) {
      const a = (azimuth * Math.PI) / 180;
      const right = [Math.cos(a), 0, -Math.sin(a)];
      const up = elevation > 45 ? [-Math.sin(a), 0, -Math.cos(a)] : [0, 1, 0];
      const pts = cells.map((p) => [Math.round(-(p[0] * up[0] + p[1] * up[1] + p[2] * up[2])), Math.round(p[0] * right[0] + p[1] * right[1] + p[2] * right[2])]);
      const r0 = Math.min(...pts.map((q) => q[0])), c0 = Math.min(...pts.map((q) => q[1]));
      const got = new Set(pts.map(([r, c]) => `${r - r0},${c - c0}`));
      if (got.size === want.size && [...got].every((k) => want.has(k))) return { azimuth, elevation };
    }
  }
  return null;
}

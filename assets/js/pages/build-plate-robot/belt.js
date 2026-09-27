// The two open-loop GT2 belts that drive the Replac3d arm in and out.
//
// The belts are not bodies in Jerry's CAD (it has the pulleys, idlers and clamps, but a belt path in
// Fusion is a sketch, which a STEP export leaves out), so each belt is drawn along the path its real
// parts set, measured from the CAD (GLB millimetres, x across the robot, z along the arm, printer on -z):
//   motor pulley  GT2 80T on each NEMA 17, axis x -49.18 / +49.18, z 242.5 (hub and bore centre);
//                 tooth face y 50.9 to 57.9 between the flanges, OD 50.4, pitch radius 80 x 2 / 2pi
//   idlers        GoBILDA GT2 idler: two flanged bearings, 8 mm OD, stacked y 49.3 to 59.3.
//                 front      (-137.00, -112.50)   rear outer (-136.93, 271.50)
//                 rear pair  (-72.18, 271.50) and (-83.12, 270.50)
//   clamps        printed clamps on the back of the carriage extrusions, each gripping the belt in a
//                 slot that runs across the robot: outer slot x -131.5 to -109.5, z 255;
//                 inner slot x -100.5 to -88.5, z 263 (carriage retracted)
// The right side is the mirror image (measured within 0.1 mm of it).
// Every straight run is a common tangent of the parts it joins, and the ends line up with the clamps
// exactly: the run from the outer clamp is tangent to the front and rear outer idlers with the belt's
// back on the clamp's end face (x -131.6 vs -131.5), and the run from the inner clamp is tangent to the
// rear idler at x -83 with the tooth tips on that clamp's end face (x -88.50 vs -88.5). The route that
// joins them without any run crossing another or passing through a part is the one below, from the
// end in the outer clamp:
//   outer clamp -> forward along the outside of the slides -> half a turn round the front idler ->
//   back along the outside -> round the rear outer idler -> across the back (1 mm clear of the idler
//   at x -83) -> over the idler at x -72 -> 244 degrees round the motor pulley -> round the idler at
//   x -83 -> forward to the inner clamp.
// Both ends are on the carriage, so as it runs out by s the run to the front idler gets s shorter and
// the run to the inner clamp s longer; the belt slides round the fixed idlers and turns the motor
// pulley by s / pitch radius. Teeth: GT2, 2 mm pitch, 0.75 mm deep, 0.63 mm body, pitch line 0.254 mm
// from the land; 6 mm wide (centred on the pulley's 7 mm tooth face, between its flanges). The teeth
// are placed by arc length along the pitch line from the belt's end, so they travel with the belt,
// and are phased so they sit in the pulley's grooves (measured: groove centres at 1.865 + 4.5 k
// degrees about the pulley axis).
import * as THREE from 'three';

const PITCH = 2, PLD = 0.254, BODY = 0.63, TOOTH = 0.75, TOOTH_W = 1.15;
const BACK = BODY - PLD;                          // pitch line to the belt's back, mm
const Y0 = 51.4, Y1 = 57.4, YC = (Y0 + Y1) / 2;   // belt edges, mm
const RB = 4;                                     // idler bearing radius, mm (8 mm OD)
const R_P = (80 * PITCH) / (2 * Math.PI);          // 80T pulley pitch radius, mm
const GROOVE = (1.865 * Math.PI) / 180;           // a groove centre on both pulleys (CAD)
const BEND = 1.3;                                 // pitch-line radius where the belt turns into a clamp
// circles on the left side: sense -1 turns clockwise seen from above (x right, z toward the viewer),
// +1 counter-clockwise; r is the pitch-line radius (teeth on the bearing: 1.004 mm out; back on it: 0.376)
const TEETH_ON = RB + PLD + TOOTH, BACK_ON = RB + BACK;
const LEFT = {
  I2: { c: [-137.0, -112.5], s: -1, r: TEETH_ON },
  I3: { c: [-136.93, 271.5], s: -1, r: TEETH_ON },
  I5: { c: [-72.18, 271.5], s: -1, r: TEETH_ON },
  P: { c: [-49.18, 242.5], s: -1, r: R_P },
  I6: { c: [-83.12, 270.5], s: 1, r: BACK_ON },
};
const SLOT_A = { z: 255.0, end: -109.5 }; // outer clamp (retracted); the belt's end
const SLOT_B = { z: 263.0, end: -100.5 }; // inner clamp

function tangent(A, B) {
  const R1 = A.s * A.r, R2 = B.s * B.r;
  const dx = B.c[0] - A.c[0], dz = B.c[1] - A.c[1], d = Math.hypot(dx, dz);
  const k = (R2 - R1) / d, h = Math.sqrt(1 - k * k), ux = dx / d, uz = dz / d;
  for (const sg of [1, -1]) {
    const nx = ux * k - sg * uz * h, nz = uz * k + sg * ux * h;
    const p1 = [A.c[0] - R1 * nx, A.c[1] - R1 * nz], p2 = [B.c[0] - R2 * nx, B.c[1] - R2 * nz];
    const tx = p2[0] - p1[0], tz = p2[1] - p1[1];
    const a1 = Math.atan2(p1[1] - A.c[1], p1[0] - A.c[0]), a2 = Math.atan2(p2[1] - B.c[1], p2[0] - B.c[0]);
    if (A.s * (-Math.sin(a1) * tx + Math.cos(a1) * tz) > 0 && B.s * (-Math.sin(a2) * tx + Math.cos(a2) * tz) > 0) return [p1, p2];
  }
  throw new Error('belt: no tangent');
}
const angleOf = (C, p) => Math.atan2(p[1] - C.c[1], p[0] - C.c[0]);
function sweep(s, a0, a1) { let d = s * (a1 - a0); while (d < 0) d += 2 * Math.PI; while (d >= 2 * Math.PI) d -= 2 * Math.PI; return d; }

/** The belt's pitch line for reach s (mm), as pieces from the end in the outer clamp. m = 1 left, -1 right. */
function path(s, m) {
  const C = {};
  for (const [k, v] of Object.entries(LEFT)) C[k] = { c: [m * v.c[0], v.c[1]], s: m * v.s, r: v.r };
  const pieces = [];
  const line = (a, b) => pieces.push({ line: true, a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  const arc = (Cc, s0, a0, a1, name) => { const sw = sweep(s0, a0, a1); pieces.push({ c: Cc.c, r: Cc.r, s: s0, a0, sw, len: sw * Cc.r, name }); };
  const zA = SLOT_A.z - s, zB = SLOT_B.z - s;
  const xA = C.I2.c[0] + m * C.I2.r;              // the run from the outer clamp: tangent to the front idler
  const xB = C.I6.c[0] - m * C.I6.r;              // the run to the inner clamp: tangent to the rear idler
  line([m * SLOT_A.end, zA], [xA + m * BEND, zA]);
  arc({ c: [xA + m * BEND, zA - BEND], r: BEND }, m, m > 0 ? Math.PI / 2 : Math.PI / 2, m > 0 ? Math.PI : 0);
  line([xA, zA - BEND], [xA, C.I2.c[1]]);
  const seq = ['I2', 'I3', 'I5', 'P', 'I6'];
  let inA = m > 0 ? 0 : Math.PI; // entry angle on the front idler (its inner side)
  for (let i = 0; i < seq.length - 1; i++) {
    const [p1, p2] = tangent(C[seq[i]], C[seq[i + 1]]);
    arc(C[seq[i]], C[seq[i]].s, inA, angleOf(C[seq[i]], p1), seq[i]);
    line(p1, p2);
    inA = angleOf(C[seq[i + 1]], p2);
  }
  arc(C.I6, C.I6.s, inA, m > 0 ? Math.PI : 0, 'I6');
  line([xB, C.I6.c[1]], [xB, zB + BEND]);
  arc({ c: [xB - m * BEND, zB + BEND], r: BEND }, -m, m > 0 ? 0 : Math.PI, m > 0 ? -Math.PI / 2 : -Math.PI / 2);
  line([xB - m * BEND, zB], [m * SLOT_B.end, zB]);
  let at = 0;
  for (const p of pieces) { p.at = at; at += p.len; }
  return { pieces, length: at, C };
}

// point and unit tangent on a piece, u mm from its start
function onPiece(p, u, out) {
  if (p.line) {
    const f = p.len ? u / p.len : 0, tx = (p.b[0] - p.a[0]) / (p.len || 1), tz = (p.b[1] - p.a[1]) / (p.len || 1);
    out[0] = p.a[0] + (p.b[0] - p.a[0]) * f; out[1] = p.a[1] + (p.b[1] - p.a[1]) * f; out[2] = tx; out[3] = tz;
  } else {
    const a = p.a0 + p.s * (u / p.r);
    out[0] = p.c[0] + p.r * Math.cos(a); out[1] = p.c[1] + p.r * Math.sin(a);
    out[2] = p.s * -Math.sin(a); out[3] = p.s * Math.cos(a);
  }
  return out;
}
// samples along the path: lines at their ends, arcs about every 6 degrees (a fixed count per piece)
function samplesOf(pieces) {
  const out = [];
  for (const p of pieces) {
    const n = p.line ? 1 : Math.max(2, Math.ceil(p.sw / (Math.PI / 30) - 1e-6));
    for (let i = 0; i <= n; i++) out.push([p, (p.len * i) / n]);
  }
  return out;
}

/**
 * Builds both belts (left and right) in the model's frame (metres, Y up) and returns
 * { group, body, teeth, set(sMetres), anchors }. set() moves the belts to reach s; the group is added
 * to the model and the rig attaches it to the part of the arm that turns with the turntable.
 */
export function extensionBelts(material) {
  const mm = 0.001;
  const MOVING = new Set([0, 1, 2, 12, 13, 14]); // clamp ends and the two runs that change length
  const sides = [1, -1].map((m) => {
    const p0 = path(0, m);
    // phase the teeth so they sit in the motor pulley's grooves at s = 0 (the pulleys start at the CAD pose)
    const P = p0.pieces.find((q) => q.name === 'P');
    let u0 = P.at + P.s * P.r * (GROOVE - P.a0);
    u0 = ((u0 % PITCH) + PITCH) % PITCH;
    const teeth = Math.floor((p0.length - u0 - TOOTH_W) / PITCH) + 1;
    return { m, u0, teeth, p0 };
  });

  // body: a 0.63 mm by 6 mm band along the path (back, land, top and bottom faces). The part round the
  // fixed idlers and the pulley never changes shape (built once); the clamp ends and the two runs
  // that change length are rebuilt as the carriage moves.
  const tmp = [0, 0, 0, 0];
  function strips(pieceLists) { // arrays of consecutive pieces -> vertex count and a writer
    let quads = 0;
    for (const list of pieceLists) quads += (samplesOf(list).length - 1) * 4;
    return quads * 6;
  }
  function writeStrip(list, out, vi) {
    const put = (x, y, z, nx, ny, nz) => { out.p[vi] = x * mm; out.p[vi + 1] = y * mm; out.p[vi + 2] = z * mm; out.n[vi] = nx; out.n[vi + 1] = ny; out.n[vi + 2] = nz; vi += 3; };
    // a quad a-b-c-d with per-vertex normals, wound to face along w (the outward direction)
    const quad = (a, b, c, d, na, nb, nc, nd, w) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      const flip = (uy * vz - uz * vy) * w[0] + (uz * vx - ux * vz) * w[1] + (ux * vy - uy * vx) * w[2] < 0;
      const tri = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
      const ns = flip ? [na, nc, nb, na, nd, nc] : [na, nb, nc, na, nc, nd];
      for (let i = 0; i < 6; i++) put(tri[i][0], tri[i][1], tri[i][2], ns[i][0], ns[i][1], ns[i][2]);
    };
    const up = [0, 1, 0], dn = [0, -1, 0];
    const nB = (q) => [-q.n[0], 0, -q.n[1]], nL = (q) => [q.n[0], 0, q.n[1]];
    let prev = null;
    for (const [p, u] of samplesOf(list)) {
      onPiece(p, u, tmp);
      const [x, z, tx, tz] = tmp, nx = tz, nz = -tx; // the teeth side: right of the travel direction
      const c = { b: [x - nx * BACK, z - nz * BACK], l: [x + nx * PLD, z + nz * PLD], n: [nx, nz] };
      const a = prev;
      if (a) {
        quad([a.b[0], Y0, a.b[1]], [c.b[0], Y0, c.b[1]], [c.b[0], Y1, c.b[1]], [a.b[0], Y1, a.b[1]], nB(a), nB(c), nB(c), nB(a), [-(a.n[0] + c.n[0]), 0, -(a.n[1] + c.n[1])]);
        quad([a.l[0], Y0, a.l[1]], [c.l[0], Y0, c.l[1]], [c.l[0], Y1, c.l[1]], [a.l[0], Y1, a.l[1]], nL(a), nL(c), nL(c), nL(a), [a.n[0] + c.n[0], 0, a.n[1] + c.n[1]]);
        quad([a.b[0], Y1, a.b[1]], [c.b[0], Y1, c.b[1]], [c.l[0], Y1, c.l[1]], [a.l[0], Y1, a.l[1]], up, up, up, up, up);
        quad([a.b[0], Y0, a.b[1]], [c.b[0], Y0, c.b[1]], [c.l[0], Y0, c.l[1]], [a.l[0], Y0, a.l[1]], dn, dn, dn, dn, dn);
      }
      prev = c;
    }
    return vi;
  }
  const split = (pieces) => ({
    fixed: [pieces.filter((q, i) => !MOVING.has(i))],
    moving: [pieces.slice(0, 3), pieces.slice(12)],
  });
  const mesh = (lists, dynamic) => {
    const n = lists.reduce((k, l) => k + strips([l]), 0);
    const out = { p: new Float32Array(n * 3), n: new Float32Array(n * 3) };
    const g = new THREE.BufferGeometry();
    const usage = dynamic ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage;
    g.setAttribute('position', new THREE.BufferAttribute(out.p, 3).setUsage(usage));
    g.setAttribute('normal', new THREE.BufferAttribute(out.n, 3).setUsage(usage));
    const o = new THREE.Mesh(g, material);
    return { o, g, out };
  };
  const fixedLists = sides.flatMap((sd) => split(sd.p0.pieces).fixed);
  const movingLists0 = sides.flatMap((sd) => split(sd.p0.pieces).moving);
  const still = mesh(fixedLists, false), moving = mesh(movingLists0, true);
  { let vi = 0; for (const l of fixedLists) vi = writeStrip(l, still.out, vi); }
  still.o.name = 'extension-belts'; moving.o.name = 'extension-belt-ends';
  // teeth: one small box per tooth, instanced
  const teethN = sides.reduce((n, s) => n + s.teeth, 0);
  const toothGeo = new THREE.BoxGeometry(TOOTH_W * mm, (Y1 - Y0) * mm, TOOTH * mm);
  const teeth = new THREE.InstancedMesh(toothGeo, material, teethN);
  teeth.name = 'extension-belt-teeth';
  teeth.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const meshes = [still.o, moving.o, teeth];
  for (const o of meshes) { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; }
  const group = new THREE.Group();
  group.name = 'extension-belts';
  group.add(...meshes);

  const A = teeth.instanceMatrix.array;
  let lastS = NaN;
  const anchors = {};
  function set(sMetres) {
    const s = Math.round(sMetres * 1e5) / 100; // mm, to 0.01
    if (s === lastS) return false;
    lastS = s;
    let vi = 0, ti = 0;
    for (const side of sides) {
      const { pieces } = path(s, side.m);
      for (const l of split(pieces).moving) vi = writeStrip(l, moving.out, vi);
      // teeth, by arc length from the belt's end
      let k = 0, pi = 0;
      for (let u = side.u0; k < side.teeth; u += PITCH, k++) {
        while (pi < pieces.length - 1 && u > pieces[pi].at + pieces[pi].len) pi++;
        const p = pieces[pi];
        onPiece(p, Math.min(p.len, u - p.at), tmp);
        const [x, z, tx, tz] = tmp, off = PLD + TOOTH / 2;
        // columns: X along the belt, Y up, Z = X x Y; the tooth sits on the teeth side (tz, -tx)
        const o = 16 * ti++;
        A[o] = tx; A[o + 1] = 0; A[o + 2] = tz; A[o + 3] = 0;
        A[o + 4] = 0; A[o + 5] = 1; A[o + 6] = 0; A[o + 7] = 0;
        A[o + 8] = -tz; A[o + 9] = 0; A[o + 10] = tx; A[o + 11] = 0;
        A[o + 12] = (x + tz * off) * mm; A[o + 13] = YC * mm; A[o + 14] = (z - tx * off) * mm; A[o + 15] = 1;
      }
      // label anchors: the middle of each outer run (pieces[4], fixed), and on the left the middle of
      // the run from the outer clamp to the front idler (pieces[2], which moves with the carriage)
      const at = (q, f) => [(q.a[0] + (q.b[0] - q.a[0]) * f) * mm, Y1 * mm, (q.a[1] + (q.b[1] - q.a[1]) * f) * mm];
      anchors[side.m === 1 ? 'outerL' : 'outerR'] = at(pieces[4], 0.5);
      if (side.m === 1) anchors.run = at(pieces[2], 0.5);
    }
    moving.g.attributes.position.needsUpdate = true;
    moving.g.attributes.normal.needsUpdate = true;
    teeth.instanceMatrix.needsUpdate = true;
    return true;
  }
  set(0);
  return { group, meshes, teeth, set, anchors, dispose() { still.g.dispose(); moving.g.dispose(); toothGeo.dispose(); } };
}

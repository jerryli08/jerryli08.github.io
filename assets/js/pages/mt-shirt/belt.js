// The timing belt of the Monkeytype mechanism, moving around its two pulleys (Jerry, Sept 28:
// "animate the belt and its teeth, not just the pulleys").
//
// The belt in the CAD (monkeybelt) is one body: a GT2 belt, 80 teeth at 2 mm pitch, 6 mm wide,
// wrapped around the two 20-tooth pulleys 60.00 mm apart. Its tessellation cannot travel: the back
// face and the two side faces of each straight span are single triangles 60 mm long, which would
// cut across a pulley as soon as one end moved onto it. So the belt's surface is rebuilt here, at
// load, from its own CAD profile, measured on the GLB (every number below): the same tooth, the
// same land and back, the same width, on the same pitch line and in the same place, only with a
// vertex every 0.2 mm or closer along the belt so it can bend. Checked against the CAD: in the CAD
// pose every vertex of the CAD belt lies on the rebuilt surface (within 0.01 mm, the GLB's
// quantization is 0.001 mm).
//
// How it moves: the belt's pitch line is the loop of two straight spans tangent to the two pitch
// circles (radius 20 x 2 mm / 2 pi = 6.366 mm) plus the two half circles around the pulley centres,
// 2 x 60 + 2 pi x 6.366 = 160 mm = 80 teeth. Each vertex has its place s along that loop and its
// offset from it. Turning the pulleys by an angle a moves every vertex along the loop by the pitch
// radius times a, which is the pulleys' own surface speed at the pitch line. The back and the land
// between teeth follow the loop and bend around the pulleys; each tooth moves as one rigid piece,
// square to the loop at its centre, which is how the CAD draws the teeth that sit on a pulley.
// The belt runs the same way the pulleys turn (rig.js turns both pulleys by -u about STEP +Z).
//
// Coordinates here are the model's millimetres (x, y, z) = STEP (x, z, -y); the plane of the belt
// is the model's x-z plane and the pulley axes are model +Y.

// pulley centres (the bounding centres of the two pulley cores in the GLB), model x and z in mm
const C1 = [-19.1791, 26.4301];   // pulley 1 (on the bevel shaft), STEP (-19.179, -26.430)
const C2 = [-71.1406, -3.5699];   // pulley 2 (on the 36T gear's shaft), STEP (-71.141, 3.570)
const PITCH = 2, TEETH = 80;
const R = (20 * PITCH) / (2 * Math.PI); // pitch radius of a 20-tooth GT2 pulley, 6.366 mm
// the belt's profile measured on the straight spans, relative to the pitch line (mm, - toward the
// pulleys) and to a tooth centre: half-widths |x| of the tooth at each depth d, tip to base
const TOOTH = [[0.0683, -1.0], [0.2016, -0.9687], [0.3225, -0.9015], [0.4234, -0.8074], [0.4988, -0.691], [0.5543, -0.5521], [0.589, -0.4043], [0.6001, -0.2565]];
const LAND = -0.2565, BACK = 0.3759; // land between teeth, and the back of the belt
const Y0 = -32.5, Y1 = -26.5;        // the belt's two side faces (model y, STEP z)
const LAND_DIV = 4;                  // land segments per pitch (0.2 mm each)

const dx = C1[0] - C2[0], dz = C1[1] - C2[1];
const C = Math.hypot(dx, dz);        // 60.00 mm
const U = [dx / C, dz / C], N0 = [-U[1], U[0]];
const AU = Math.atan2(U[1], U[0]);
const ARC = Math.PI * R;
const L = 2 * C + 2 * ARC;           // 160.0 mm

/** Point, tangent and outward normal of the pitch loop at s (mm from the tangent point of the first span on pulley 2). */
function loopAt(s, o) {
  s %= L; if (s < 0) s += L;
  if (s <= C) { o.px = C2[0] + R * N0[0] + s * U[0]; o.pz = C2[1] + R * N0[1] + s * U[1]; o.tx = U[0]; o.tz = U[1]; o.nx = N0[0]; o.nz = N0[1]; return o; }
  if (s <= C + ARC) return arc(C1, AU + Math.PI / 2 - (s - C) / R, o);
  if (s <= 2 * C + ARC) { const t = s - C - ARC; o.px = C1[0] - R * N0[0] - t * U[0]; o.pz = C1[1] - R * N0[1] - t * U[1]; o.tx = -U[0]; o.tz = -U[1]; o.nx = -N0[0]; o.nz = -N0[1]; return o; }
  return arc(C2, AU - Math.PI / 2 - (s - 2 * C - ARC) / R, o);
}
function arc(c, a, o) {
  const ca = Math.cos(a), sa = Math.sin(a);
  o.nx = ca; o.nz = sa; o.tx = sa; o.tz = -ca; o.px = c[0] + R * ca; o.pz = c[1] + R * sa;
  return o;
}
/** Place along the loop (s) of the point (x, z) near it. */
function loopS(x, z) {
  const rx = x - C2[0], rz = z - C2[1];
  const t = rx * U[0] + rz * U[1], side = rx * N0[0] + rz * N0[1];
  const wrap = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (t >= 0 && t <= C) return side >= 0 ? t : C + ARC + (C - t);
  if (t > C) return C + R * wrap(AU + Math.PI / 2 - Math.atan2(z - C1[1], x - C1[0]));
  return 2 * C + ARC + R * wrap(AU - Math.PI / 2 - Math.atan2(rz, rx));
}

// vertex kinds
const RIGID = 0, FOLLOW = 1, BASE = 2;

/**
 * Rebuilds the belt mesh's geometry (see above) and returns set(a): the belt placed for the pulleys
 * turned by a radians from the CAD pose (rig.js turns them by -a about model +Y). A pure function
 * of a; it only writes when a changes.
 */
export function rigBelt(THREE, part, model) {
  const belt = part.isMesh ? part : part.getObjectByProperty('isMesh', true);
  // the belt mesh's frame relative to the model (the GLB's frame, metres): positions are built in
  // model millimetres and taken into the mesh's own frame
  model.updateWorldMatrix(true, false); belt.updateWorldMatrix(true, false);
  const toLocal = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(belt.matrixWorld).invert();
  const E = toLocal.elements;
  const nrmM = new THREE.Matrix3().setFromMatrix4(toLocal);

  // --- stations along one pitch (x from the tooth centre), inner (tooth and land) and back
  const tooth = [...TOOTH.slice().reverse().map(([x, d]) => [-x, d]), ...TOOTH.map(([x, d]) => [x, d])]; // 16, base to base
  const w = TOOTH[TOOTH.length - 1][0];
  const landX = Array.from({ length: LAND_DIV - 1 }, (_, j) => w + ((PITCH - 2 * w) * (j + 1)) / LAND_DIV);
  // smooth normals along the tooth (in the belt's own frame: t along the loop, n outward)
  const toothN = tooth.map((_, i) => {
    const a = tooth[Math.max(0, i - 1)], b = tooth[Math.min(tooth.length - 1, i + 1)];
    const tx = b[0] - a[0], td = b[1] - a[1], l = Math.hypot(tx, td);
    return [td / l, -tx / l]; // the tooth's surface faces inward (toward the pulley)
  });

  const V = []; // per vertex: kind, s (loop place at the CAD pose; the tooth centre for RIGID), x, d, y, nt, nn, ny, u, v
  const idx = [];
  const add = (kind, s, x, d, y, nt, nn, ny, uu, vv) => { V.push([kind, s, x, d, y, nt, nn, ny, uu, vv]); return V.length - 1; };
  const quad = (a, b, c, d2, flip) => { if (flip) idx.push(a, c, b, a, d2, c); else idx.push(a, b, c, a, c, d2); };
  const tile = (belt.material?.userData?.rxUv?.[1]) || 0.01; // the rubber finish's texture tile, metres
  const uv = (mm) => mm / 1000 / tile;

  // inner surface: each tooth (rigid) and the land after it (follows the loop)
  for (let k = 0; k < TEETH; k++) {
    const s0 = k * PITCH;
    let prev = null;
    tooth.forEach(([x, d], i) => {
      const kind = i === 0 || i === tooth.length - 1 ? BASE : RIGID;
      const [nt, nn] = toothN[i];
      const a = add(kind, s0, x, d, Y0, nt, nn, 0, uv(s0 + x), uv(Y0)), b = add(kind, s0, x, d, Y1, nt, nn, 0, uv(s0 + x), uv(Y1));
      if (prev) quad(prev[0], a, b, prev[1], true);
      prev = [a, b];
    });
    prev = null;
    [w, ...landX, PITCH - w].forEach((x, i, all) => {
      const kind = i === 0 || i === all.length - 1 ? BASE : FOLLOW;
      const sx = kind === BASE ? s0 + (i === 0 ? 0 : PITCH) : s0 + x;
      const xx = kind === BASE ? (i === 0 ? w : -w) : 0;
      const a = add(kind, sx, xx, LAND, Y0, 0, -1, 0, uv(s0 + x), uv(Y0)), b = add(kind, sx, xx, LAND, Y1, 0, -1, 0, uv(s0 + x), uv(Y1));
      if (prev) quad(prev[0], a, b, prev[1], true);
      prev = [a, b];
    });
  }
  // stations for the back and the side faces: every tooth station and the land's inner points
  const st = [];
  for (let k = 0; k < TEETH; k++) {
    const s0 = k * PITCH;
    tooth.forEach(([x, d], i) => st.push({ s: s0 + x, inner: [i === 0 || i === tooth.length - 1 ? BASE : RIGID, s0, x, d] }));
    landX.forEach((x) => st.push({ s: s0 + x, inner: [FOLLOW, s0 + x, 0, LAND] }));
  }
  const ns = st.length;
  // back
  const back = st.map((q) => [add(FOLLOW, q.s, 0, BACK, Y0, 0, 1, 0, uv(q.s), uv(Y0)), add(FOLLOW, q.s, 0, BACK, Y1, 0, 1, 0, uv(q.s), uv(Y1))]);
  for (let i = 0; i < ns; i++) { const a = back[i], b = back[(i + 1) % ns]; quad(a[0], a[1], b[1], b[0], true); }
  // the two side faces, flat, strip by strip between the inner edge and the back
  for (const [y, ny] of [[Y0, -1], [Y1, 1]]) {
    const ring = st.map((q) => {
      const [kind, s, x, d] = q.inner;
      return [add(kind, s, x, d, y, 0, 0, ny, uv(q.s), uv(d)), add(FOLLOW, q.s, 0, BACK, y, 0, 0, ny, uv(q.s), uv(BACK))];
    });
    for (let i = 0; i < ns; i++) { const a = ring[i], b = ring[(i + 1) % ns]; quad(a[0], b[0], b[1], a[1], ny > 0); }
  }

  const n = V.length;
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const nor = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const uvs = new Float32Array(n * 2);
  V.forEach((v, i) => { uvs[i * 2] = v[8]; uvs[i * 2 + 1] = v[9]; });
  pos.setUsage(THREE.DynamicDrawUsage); nor.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pos); geo.setAttribute('normal', nor); geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(idx);

  // winding: every quad above is wound counterclockwise seen from the side its normal points to
  // (the loop's tangent, outward normal and +Y are a left-handed triple, hence the flips)
  const f = { px: 0, pz: 0, tx: 0, tz: 0, nx: 0, nz: 0 }, g = { ...f };
  const P = pos.array, Nn = nor.array;
  const tmp = new THREE.Vector3();
  function place(delta) {
    for (let i = 0; i < n; i++) {
      const [kind, s, x, d, y, nt, nn, ny] = V[i];
      loopAt(s + delta, f);
      let mx, mz, ox, oz;
      if (kind === FOLLOW) { mx = f.px + d * f.nx; mz = f.pz + d * f.nz; ox = nt * f.tx + nn * f.nx; oz = nt * f.tz + nn * f.nz; }
      else {
        // rigid with the tooth: square to the loop at the tooth's centre
        mx = f.px + x * f.tx + d * f.nx; mz = f.pz + x * f.tz + d * f.nz;
        ox = nt * f.tx + nn * f.nx; oz = nt * f.tz + nn * f.nz;
        if (kind === BASE) {
          // where the tooth's flank meets the land: onto the land surface (on a pulley the land is
          // the circle of radius R + LAND, which the flank meets a hair lower than on a straight)
          loopAt(loopS(mx, mz), g);
          mx = g.px + LAND * g.nx; mz = g.pz + LAND * g.nz;
          if (nn === -1 && nt === 0) { ox = -g.nx; oz = -g.nz; } // the land's own normal
        }
      }
      if (ny) { ox = 0; oz = 0; }
      // model mm -> model metres -> the mesh's frame
      const X = mx / 1000, Y = y / 1000, Z = mz / 1000;
      P[i * 3] = E[0] * X + E[4] * Y + E[8] * Z + E[12];
      P[i * 3 + 1] = E[1] * X + E[5] * Y + E[9] * Z + E[13];
      P[i * 3 + 2] = E[2] * X + E[6] * Y + E[10] * Z + E[14];
      tmp.set(ox, ny, oz).applyMatrix3(nrmM).normalize();
      Nn[i * 3] = tmp.x; Nn[i * 3 + 1] = tmp.y; Nn[i * 3 + 2] = tmp.z;
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  }
  place(0);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  belt.geometry.dispose();
  belt.geometry = geo;

  let last = 0;
  return {
    geometry: geo,
    /** a: the pulleys' turn from the CAD pose, radians, as rig.js applies it (-a about +Y). */
    set(a) {
      if (a === last) return;
      last = a;
      // a turn of -a about +Y carries the pulley rim toward smaller s along the loop
      place(-R * a);
    },
  };
}

export const BELT = { R, L, C, PITCH, TEETH };

// The toolpath the router runs on this page: the shorter side plate of Jerry's e-bike (the drive-side
// plate, `drivetrain-side plate:1` in ebike_full_ebike_asm.step), at its real size, from its exact
// profile (/assets/models/ftc-field-cnc/ebike-drive-plate.json: the B-rep lines and arcs, in mm).
// Pure: no THREE, no DOM, so node can import it to check the numbers the page quotes.
//
// Order: from home, Y alone then X alone to the first hole; every round hole (nearest next); the slot
// and the lattice pockets (nearest next); the outline last; back home. The path runs on the plate's
// own edges (no cutter is chosen: there is no spindle in the CAD), holes counterclockwise and the
// outline clockwise seen from above. Three slivers in the CAD face under 1.5 mm around are skipped.
//
// Placement: the plate's centre on the centre of the travel, its long side along X, seen from above
// as it is seen from outside the bike's drive side. Machine X = XC + (x - w/2), Y = YC - (y - h/2)
// (machine +Y runs toward the front of the router, the plate's +y away from it).

export const TRAVEL = { x: [0, 416.8], y: [-148.1, 312.1] }; // mm from the CAD pose (rig.js)
export const XC = (TRAVEL.x[0] + TRAVEL.x[1]) / 2, YC = (TRAVEL.y[0] + TRAVEL.y[1]) / 2;
export const RAPID_SPEED = 3; // rapids play three times faster than cuts on the scroll

const TAU = Math.PI * 2;

/** Points of one loop in plate mm, in the file's own order, arcs split every <= 3 degrees (and <= 0.8 mm). */
export function loopPoints(loop) {
  const out = [];
  for (const s of loop.segs) {
    if (s[0] === 'L') { if (!out.length) out.push([s[1], s[2]]); out.push([s[3], s[4]]); continue; }
    if (s[0] === 'C') {
      const [, cx, cy, r] = s, n = Math.max(24, Math.ceil(TAU / Math.min(0.0524, 0.8 / r)));
      for (let i = 0; i <= n; i++) out.push([cx + r * Math.cos((TAU * i) / n), cy + r * Math.sin((TAU * i) / n)]);
      continue;
    }
    const [, x0, y0, x1, y1, cx, cy, r, sw] = s, a0 = Math.atan2(y0 - cy, x0 - cx);
    const n = Math.max(2, Math.ceil(Math.abs(sw) / Math.min(0.0524, 0.8 / r)));
    if (!out.length) out.push([x0, y0]);
    for (let i = 1; i < n; i++) out.push([cx + r * Math.cos(a0 + (sw * i) / n), cy + r * Math.sin(a0 + (sw * i) / n)]);
    out.push([x1, y1]);
  }
  return out;
}

/** Exact perimeter of a loop (lines and arcs, not the tessellation). */
export function perimeter(loop) {
  let p = 0;
  for (const s of loop.segs) {
    if (s[0] === 'L') p += Math.hypot(s[3] - s[1], s[4] - s[2]);
    else if (s[0] === 'C') p += TAU * s[3];
    else p += Math.abs(s[8]) * s[7];
  }
  return p;
}

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]; return a / 2; };

export function buildPath(plate) {
  const [w, h] = plate.size;
  const toM = ([x, y]) => [XC + (x - w / 2), YC - (y - h / 2)];
  // every loop in machine mm, closed, oriented: holes counterclockwise, the outline clockwise (seen from above:
  // machine X right, machine Y toward the viewer, so "counterclockwise" is negative signed area in X, Y)
  const feats = plate.loops.filter((l) => !l.tiny).map((l) => {
    let pts = loopPoints(l).map(toM);
    const a = area(pts);
    const want = l.outer ? 1 : -1;
    if (Math.sign(a) !== want) pts = pts.reverse();
    const round = l.segs.length === 1 && l.segs[0][0] === 'C';
    // the slot: two half-circle ends joined by lines
    const slot = !round && !l.outer && l.segs.filter((g) => g[0] === 'A' && Math.abs(Math.abs(g[8]) - Math.PI) < 0.01).length === 2;
    return { outer: !!l.outer, round, slot, pts, per: perimeter(l), d: round ? 2 * l.segs[0][3] : 0 };
  });
  const outline = feats.find((f) => f.outer);
  const holes = feats.filter((f) => !f.outer && f.round), pockets = feats.filter((f) => !f.outer && !f.round);

  const P = [[0, 0]], K = [], F = []; // points, kind of the move into each point, feature index of each point
  const order = [null]; // order[n] = the n-th feature cut (F holds n)
  let cur = [0, 0], nf = 0;
  const go = (p, kind, fi = -1) => { P.push(p); K.push(kind); F.push(fi); cur = p; };
  // a closed loop, entered at its point nearest the tool
  const cutLoop = (f) => {
    const n = f.pts.length - 1; // last point repeats the first
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.hypot(f.pts[i][0] - cur[0], f.pts[i][1] - cur[1]); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const marks = {};
  const run = (list, name, firstLeg) => {
    const left = list.slice();
    while (left.length) {
      // nearest next; the very first hole is the one nearest the front left corner, so the opening
      // Y-only move shows the gantry travelling
      if (firstLeg && !marks.first) cur = [0, TRAVEL.y[1]];
      let bi = 0, bd = Infinity;
      left.forEach((f, i) => { const d = Math.min(...f.pts.map((q) => Math.hypot(q[0] - cur[0], q[1] - cur[1]))); if (d < bd) { bd = d; bi = i; } });
      const f = left.splice(bi, 1)[0], e = cutLoop(f), n = f.pts.length - 1;
      if (firstLeg && !marks.first) cur = P[P.length - 1];
      if (firstLeg && !marks.first) { firstLeg(f.pts[e]); marks.first = true; }
      else go(f.pts[e], 'rapid');
      nf++; order.push(f);
      for (let k = 1; k <= n; k++) go(f.pts[(e + k) % n], 'cut', nf);
    }
    marks[name] = P.length - 1;
  };
  // step 1 and 2: Y alone, then X alone, to the first hole's entry point
  run(holes, 'holes', (p) => { go([0, p[1]], 'rapid'); marks.yOnly = P.length - 1; go(p, 'rapid'); marks.xOnly = P.length - 1; });
  run(pockets, 'pockets');
  run([outline], 'outline');
  go([cur[0], 0], 'rapid'); go([0, 0], 'rapid');
  marks.home = P.length - 1;

  // cumulative length (mm) and scroll "time" (rapids faster)
  const S = [0], T = [0];
  let cutLen = 0, rapidLen = 0, dx = 0, dy = 0;
  for (let i = 1; i < P.length; i++) {
    const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    S.push(S[i - 1] + d);
    T.push(T[i - 1] + (K[i - 1] === 'rapid' ? d / RAPID_SPEED : d));
    if (K[i - 1] === 'cut') cutLen += d; else rapidLen += d;
    dx += Math.abs(P[i][0] - P[i - 1][0]); dy += Math.abs(P[i][1] - P[i - 1][1]);
  }
  const cutSum = feats.reduce((a, f) => a + f.per, 0);
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const q of outline.pts) { xmin = Math.min(xmin, q[0]); xmax = Math.max(xmax, q[0]); ymin = Math.min(ymin, q[1]); ymax = Math.max(ymax, q[1]); }
  return {
    P, K, F, S, T, marks, feats, order, outline, holes, pockets, toM,
    stats: {
      holes: holes.length, pockets: pockets.length, slots: pockets.filter((f) => f.slot).length, outlinePer: outline.per, cutSum, cutLen, rapidLen, dx, dy,
      box: { x: [xmin, xmax], y: [ymin, ymax] },
    },
  };
}

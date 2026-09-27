// The real linkage from my Fusion CAD, rigged about its real axes, plus the page it draws on.
//
// Axes (tools/cad-axes.py on the STEP, all vertical): left motor shaft at STEP (0, 0), right motor
// shaft at STEP (0, 100), left elbow (-84.7, -53.2), right elbow (-99.7, 107.5), pen joint
// (-151.0, 21.7). In the code's frame that is: motors at (0, 0) and (100, 0), pen at (21.7, 151.0),
// the pose my IK gives for that pen point: left motor 122.114°, right motor 85.671°. Code x is
// STEP y and code y is -STEP x, so a code point (x, y) mm sits at model (X, Z) = (-y, -x) / 1000 m,
// and a code rotation of +a (counterclockwise from above) is +a about the model's +Y.
//
// Each moving part keeps its CAD shape; per frame it is only turned about a vertical axis and moved:
//   motor arm + flange hub + shaft: turned about its motor axis by (motor angle - CAD angle)
//   forearm: turned about its CAD elbow by (heading - CAD heading), then moved to the new elbow
//   spacer (round, on the pen joint): moved with the pen joint
import * as K from './kin.js';

export const MODEL = '/assets/models/pen-plotter/plotter.glb';
const D2R = Math.PI / 180;
const CAD = { l: 122.114, r: 85.671, P: [21.7, 151.0] };
CAD.pose = K.pose(CAD.P[0], CAD.P[1]);
export const toM = (x, y) => [-y / 1000, -x / 1000]; // code mm -> model X, Z (m)
export const PAGE_Y = 0.0006; // the drawing, just above the table the plotter stands on (model Y = 0)
export const TUBE_Y = 0.010; // bottom of the pen tube in the CAD

export const COLORS = { ink: '#ff6b35', fold: '#7fd4ff', path: '#eee9e3', warn: '#ff4d4d' };

export async function loadRig(stage) {
  const T = stage.THREE;
  const model = await stage.load(MODEL);
  const one = (re) => {
    const p = stage.part(re, model);
    if (!p.length) throw new Error(`pen-plotter: no part ${re}`);
    return p;
  };
  const parts = {
    armL: [...one(/left_base_arm/), ...one(/mounting_hub_1$/), ...one(/^anim_pp_0_shaft/)],
    armR: [...one(/right_base_arm/), ...one(/mounting_hub_2$/), ...one(/^anim_pp_1_shaft/)],
    foreL: one(/left_pencil_forearm/),
    foreR: one(/right_forearm/),
    spacer: one(/spacer/),
    housing: one(/_0_1_1_15_/),
  };
  // one group per moving body, at the model origin; the parts keep their world placement
  const groups = {};
  for (const k of ['armL', 'armR', 'foreL', 'foreR', 'spacer']) {
    const g = new T.Group();
    g.name = `rig:${k}`;
    model.add(g);
    g.updateWorldMatrix(true, false);
    for (const p of parts[k]) g.attach(p);
    groups[k] = g;
  }
  const Y = new T.Vector3(0, 1, 0), q = new T.Quaternion(), v = new T.Vector3();
  // rigid move in the plane: turn by a (deg, code sense) about CAD point c, then put c at n (code mm)
  function place(g, a, c, n) {
    q.setFromAxisAngle(Y, a * D2R);
    const [cx, cz] = toM(c[0], c[1]), [nx, nz] = toM(n[0], n[1]);
    v.set(cx, 0, cz).applyQuaternion(q);
    g.quaternion.copy(q);
    g.position.set(nx - v.x, 0, nz - v.z);
  }
  const C = CAD.pose;
  let last = '';
  /** Put the linkage in a pose (from kin.pose, or any { l, r, E1, E2, P }). Only moves what changed. */
  function set(p) {
    const key = `${p.l.toFixed(4)}|${p.r.toFixed(4)}|${p.P[0].toFixed(3)}|${p.P[1].toFixed(3)}`;
    if (key === last) return;
    last = key;
    place(groups.armL, p.l - C.l, [0, 0], [0, 0]);
    place(groups.armR, p.r - C.r, [K.D, 0], [K.D, 0]);
    place(groups.foreL, K.heading(p.E1, p.P) - C.hL, C.E1, p.E1);
    place(groups.foreR, K.heading(p.E2, p.P) - C.hR, C.E2, p.E2);
    place(groups.spacer, 0, C.P, p.P);
    stage.invalidate();
  }
  return { model, parts, groups, set, cad: CAD };
}

// ------------------------------------------------------------------ the page: annotations only
// Nothing here is a part: the grid, the path, the ink and the fold line are drawings on the table
// under the linkage (there is no pen, paper or board in the CAD, so none is modelled).
export function makePage(stage) {
  const T = stage.THREE;
  const group = new T.Group();
  group.name = 'page';
  stage.scene.add(group); // not in stage.root: the ground, bounds and contact shadow ignore it
  const mats = [];
  const mat = (color, opacity, dashed) => {
    const m = new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    m.userData.base = opacity;
    mats.push(m);
    return m;
  };
  // a flat ribbon along a polyline (code mm), width in mm; dash = [on, off] mm to dash it.
  // o.many: pts is a list of polylines, all built into the one mesh (one draw call)
  function ribbon(pts, width, material, o = {}) {
    const pos = [], idx = [];
    const y = o.y ?? PAGE_Y;
    let run = 0;
    const [on, off] = o.dash || [0, 0];
    const list = o.many ? pts : [pts];
    for (const pts of list) for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = K.dist(a, b);
      if (len < 1e-6) continue;
      if (on) { const ph = run % (on + off); run += len; if (ph > on) continue; }
      const nx = (-(b[1] - a[1]) / len) * (width / 2), ny = ((b[0] - a[0]) / len) * (width / 2);
      const base = pos.length / 3;
      for (const [x, yy] of [[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny]]) {
        const [X, Z] = toM(x, yy);
        pos.push(X, y, Z);
      }
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new T.Mesh(geo, material);
    mesh.renderOrder = o.order ?? 2;
    mesh.frustumCulled = false;
    mesh.userData.quads = idx.length / 6;
    (o.parent || group).add(mesh);
    return mesh;
  }
  // split a polyline into pieces of at most `step` mm (so a draw range can end anywhere)
  function fine(pts, step = 0.6) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(K.dist(a, b) / step));
      for (let j = 1; j <= n; j++) out.push([K.lerp(a[0], b[0], j / n), K.lerp(a[1], b[1], j / n)]);
    }
    return out;
  }
  // a faint 10 mm grid over the drawing area, heavier every 50 mm, and the code's x and y axes
  function grid(x0, x1, y0, y1) {
    const minor = mat('#eee9e3', 0.07), major = mat('#eee9e3', 0.16);
    const lines = { minor: [], major: [] };
    for (let x = Math.ceil(x0 / 10) * 10; x <= x1; x += 10) lines[x % 50 ? 'minor' : 'major'].push([[x, y0], [x, y1]]);
    for (let y = Math.ceil(y0 / 10) * 10; y <= y1; y += 10) lines[y % 50 ? 'minor' : 'major'].push([[x0, y], [x1, y]]);
    ribbon(lines.minor, 0.25, minor, { order: 1, many: true });
    ribbon(lines.major, 0.4, major, { order: 1, many: true });
    return { minor, major };
  }
  /** A path traced in ink as time goes on: returns set(s) with s = mm along the path. */
  function trace(tl, color = COLORS.ink, width = 1.3) {
    const pts = fine(tl.path.map((e) => [e[0], e[1]]));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + K.dist(pts[i - 1], pts[i]));
    const m = mat(color, 1);
    const mesh = ribbon(pts, width, m, { order: 3 });
    let shown = -1;
    function set(s) {
      // quads whose end lies before s (binary search on the running length)
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= s + 1e-6) lo = mid; else hi = mid - 1; }
      const n = Math.min(lo, mesh.userData.quads);
      if (n !== shown) { shown = n; mesh.geometry.setDrawRange(0, n * 6); mesh.visible = n > 0; stage.invalidate(false); }
    }
    set(0);
    return { mesh, mat: m, set, fade(a) { m.opacity = a; mesh.visible = a > 0.01 && shown > 0; } };
  }
  // the pen axis: a dashed line from the bottom of the pen tube down to the page, and a ring
  function penMarker() {
    const g = new T.Group();
    const lm = new T.LineDashedMaterial({ color: '#eee9e3', dashSize: 0.0016, gapSize: 0.0012, transparent: true, opacity: 0.7, toneMapped: false });
    const lg = new T.BufferGeometry().setFromPoints([new T.Vector3(0, TUBE_Y, 0), new T.Vector3(0, PAGE_Y, 0)]);
    const line = new T.Line(lg, lm);
    line.computeLineDistances();
    const ring = new T.Mesh(new T.RingGeometry(0.0016, 0.0024, 28), new T.MeshBasicMaterial({ color: COLORS.ink, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = PAGE_Y + 0.0002;
    ring.renderOrder = 4;
    g.add(line, ring);
    group.add(g);
    return { g, ring, at(x, y) { const [X, Z] = toM(x, y); if (g.position.x !== X || g.position.z !== Z) { g.position.set(X, 0, Z); stage.invalidate(false); } } };
  }
  return { group, ribbon, fine, grid, trace, penMarker, mat, mats };
}

/** A box (not added to the scene) around a region of the page, in code mm, for framing views once. */
export function regionBox(stage, x0, x1, y0, y1, h = 0.06) {
  const T = stage.THREE;
  const [Xa, Za] = toM(x0, y0), [Xb, Zb] = toM(x1, y1);
  const m = new T.Mesh(new T.BoxGeometry(Math.abs(Xb - Xa), h, Math.abs(Zb - Za)));
  m.position.set((Xa + Xb) / 2, h / 2, (Za + Zb) / 2);
  m.updateMatrixWorld(true);
  return m;
}

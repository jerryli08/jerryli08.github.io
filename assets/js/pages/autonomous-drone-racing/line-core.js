// The line follower from our flight script, ported to JavaScript for this page, plus the small
// simulation around it. No DOM and no three.js here, so the same code flies the lap ahead of time
// (gen-flight.mjs in the page's working notes writes flight-data.js), redoes each frame's vision
// for the flight's inset, and runs the step-by-step scrolly.
//
// From the script (the downward-camera line follower in our team's repo), unchanged:
//   image 640 x 360; cv2.dilate 30 x 30, cv2.erode 20 x 20; cv2.inRange 250..255 on all channels;
//   external contours; keep the contour with the longest cv2.minAreaRect side; cv2.fitLine DIST_L2;
//   flip the direction so it points down the image (toward the nose); target 100 px along it;
//   error = target - image centre; angle = atan2(-vx, vy) in degrees;
//   PD: KP 0.001 and KD 0.00015 on the pixel errors, 0.2 on the angle for both yaw terms (the
//   script's KP_W_Z = 3.5 is defined but not used), derivatives over a fixed 0.1 s;
//   camera to body: forward = image y, right = -image x, yaw unchanged;
//   clamps 0.5 m/s and 90 deg/s; one command, then asyncio.sleep(0.5); 10 frames with no line: land.
//
// Assumptions of the simulation (not from the script, labelled on the page):
//   the drone holds 1.0 m (the script's TAKEOFF_ALTITUDE); the flight controller follows the
//   commanded body velocity and yaw rate with a first-order lag of 0.3 s; the camera looks straight
//   down with a 66 degree wide lens (Camera Module 3 standard); after a frame with no line the
//   script captures again at once, taken here as 0.05 s later; the LED rope is drawn as bulbs every
//   2 cm; the hoop reaction is a stand-in (our repo has no forward-camera code), with the forward
//   camera seeing hoops within 2.5 m in its 66 degree view.
//
// World frame: metres on the floor plane, x to the right and z toward the viewer (three.js, Y up).
// Heading h: forward = (cos h, sin h); right = (-sin h, cos h); a positive yaw rate turns right,
// as a positive MAVSDK yawspeed does.

export const SCRIPT = {
  W: 640, H: 360, EXTEND: 100,
  KP_X: 0.001, KP_Y: 0.001, KD_X: 0.00015, KD_Y: 0.00015, KP_W_Z: 3.5, KD_W_Z: 0.2,
  D_DT: 0.1, SLEEP: 0.5, MAX_X: 0.5, MAX_Y: 0.5, MAX_YAW: 90,
  LOW: 250, KDIL: 30, KERO: 20, MAX_MISSES: 10,
};
export const SIM = {
  ALT: 1.0, HFOV: 66, TAU: 0.3, RETRY: 0.05,
  DOWN_AHEAD: 0.1358, FWD_AHEAD: 0.1407, // camera sensors ahead of the frame centre, from the CAD
  PITCH: 0.02, BULB_R: 0.006, GLARE_R: 0.05,
  FWD_RANGE: 2.5, HOOP_D: 0.7, DRONE_R: 0.33,
  PUSH: 0.35, CLEAR: 0.55, // stand-in hoop reaction
};
export const FPX = SCRIPT.W / 2 / Math.tan((SIM.HFOV / 2) * Math.PI / 180); // focal length, px
const { W, H } = SCRIPT;
const CX = W / 2, CY = H / 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ------------------------------------------------------------------ course
/** Closed centripetal Catmull-Rom spline through ctrl [[x, z], ...]. */
export function buildCourse(ctrl, perM = 20) {
  const n = ctrl.length;
  const xs = [], zs = [], seg = [];
  const d = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const steps = Math.max(6, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * perM));
    for (let k = 0; k < steps; k++) {
      const t = t1 + ((t2 - t1) * k) / steps;
      const L = (a, b, ta, tb) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      const C = L(B1, B2, t1, t2);
      xs.push(C[0]); zs.push(C[1]); seg.push(i);
    }
  }
  const m = xs.length;
  const cum = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) cum[i + 1] = cum[i] + Math.hypot(xs[(i + 1) % m] - xs[i], zs[(i + 1) % m] - zs[i]);
  const course = { ctrl: ctrl.map((p) => [p[0], p[1]]), xs: Float64Array.from(xs), zs: Float64Array.from(zs), seg: Int32Array.from(seg), cum, L: cum[m], n: m };
  // LED bulbs every SIM.PITCH metres along the rope
  const nb = Math.floor(course.L / SIM.PITCH);
  const bulbs = new Float32Array(nb * 2);
  for (let k = 0, i = 0; k < nb; k++) {
    const s = k * SIM.PITCH;
    while (cum[i + 1] < s) i++;
    const f = (s - cum[i]) / Math.max(1e-9, cum[i + 1] - cum[i]), j = (i + 1) % m;
    bulbs[2 * k] = xs[i] + (xs[j] - xs[i]) * f;
    bulbs[2 * k + 1] = zs[i] + (zs[j] - zs[i]) * f;
  }
  course.bulbs = bulbs;
  return course;
}

/** Nearest point on the course polyline: { x, z, d, s, i, tx, tz } (tangent unit vector). */
export function nearest(course, x, z) {
  const { xs, zs, n, cum } = course;
  let best = { d: Infinity };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = xs[i], az = zs[i], bx = xs[j] - ax, bz = zs[j] - az;
    const l2 = bx * bx + bz * bz || 1e-12;
    const f = clamp(((x - ax) * bx + (z - az) * bz) / l2, 0, 1);
    const px = ax + bx * f, pz = az + bz * f, dd = Math.hypot(x - px, z - pz);
    if (dd < best.d) { const l = Math.sqrt(l2); best = { x: px, z: pz, d: dd, s: cum[i] + f * l, i, tx: bx / l, tz: bz / l }; }
  }
  return best;
}

// ------------------------------------------------------------------ the downward camera
/** A 640 x 360 grey frame plus a fixed noise pattern for the floor. */
export function makeCamera(seed = 7) {
  const noise = new Uint8Array(W * H + 4099);
  let s = seed >>> 0;
  for (let i = 0; i < noise.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; noise[i] = 14 + ((s >>> 24) % 26); }
  return { gray: new Uint8Array(W * H), noise, frame: 0 };
}
/** Image position of a floor point seen from a pose. Image +y is the nose, image +x the drone's left. */
export function toImage(pose, px, pz, out = {}) {
  const c = Math.cos(pose.h), s = Math.sin(pose.h);
  const ox = pose.x + SIM.DOWN_AHEAD * c, oz = pose.z + SIM.DOWN_AHEAD * s;
  const k = FPX / (pose.alt || SIM.ALT);
  const dx = px - ox, dz = pz - oz;
  out.u = CX + (dx * s - dz * c) * k; // left = (sin h, -cos h)
  out.v = CY + (dx * c + dz * s) * k;
  return out;
}
/** Floor point under an image pixel (inverse of toImage). */
export function toFloor(pose, u, v, out = {}) {
  const c = Math.cos(pose.h), s = Math.sin(pose.h);
  const k = FPX / (pose.alt || SIM.ALT);
  const a = (v - CY) / k, l = (u - CX) / k;
  out.x = pose.x + SIM.DOWN_AHEAD * c + a * c + l * s;
  out.z = pose.z + SIM.DOWN_AHEAD * s + a * s - l * c;
  return out;
}
function disc(g, u, v, rc, rh, peak, halo) {
  const x0 = Math.max(0, Math.floor(u - rh)), x1 = Math.min(W - 1, Math.ceil(u + rh));
  const y0 = Math.max(0, Math.floor(v - rh)), y1 = Math.min(H - 1, Math.ceil(v + rh));
  for (let y = y0; y <= y1; y++) {
    const dy = y - v, row = y * W;
    for (let x = x0; x <= x1; x++) {
      const r = Math.hypot(x - u, dy);
      if (r > rh) continue;
      const val = r <= rc ? peak : halo * (1 - (r - rc) / (rh - rc)) ** 2;
      if (val > g[row + x]) g[row + x] = val;
    }
  }
}
/** Draws what the downward camera sees: dark floor, the LED bulbs with their glow, the glare spot. */
export function renderDown(cam, course, pose, glare) {
  const g = cam.gray;
  const off = (cam.frame++ * 1031) % 4096;
  g.set(cam.noise.subarray(off, off + W * H));
  const k = FPX / (pose.alt || SIM.ALT), rc = SIM.BULB_R * k, rh = rc * 2.8;
  const b = course.bulbs, p = {};
  for (let i = 0; i < b.length; i += 2) {
    toImage(pose, b[i], b[i + 1], p);
    if (p.u < -rh || p.u > W + rh || p.v < -rh || p.v > H + rh) continue;
    disc(g, p.u, p.v, rc, rh, 255, 150);
  }
  if (glare) {
    toImage(pose, glare.x, glare.z, p);
    const r = (glare.r || SIM.GLARE_R) * k;
    if (p.u > -3 * r && p.u < W + 3 * r && p.v > -3 * r && p.v < H + 3 * r) disc(g, p.u, p.v, r, r * 2.4, 255, 190);
  }
  return g;
}

// ------------------------------------------------------------------ the vision step
// Thresholding commutes with max and min filters, so dilate / erode / inRange on the image is the
// same as inRange first, then the two filters on the binary mask. The filters use running sums, and
// OpenCV's borders: outside pixels never add to a dilation and never erode.
function boxAny(src, dst, k, anchor, erode, tmp) {
  // rows
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let sum = 0;
    const pre = tmp; pre[0] = 0;
    for (let x = 0; x < W; x++) { sum += src[row + x]; pre[x + 1] = sum; }
    for (let x = 0; x < W; x++) {
      const lo = Math.max(0, x - anchor), hi = Math.min(W - 1, x - anchor + k - 1);
      const c = pre[hi + 1] - pre[lo];
      dst[row + x] = erode ? (c === hi - lo + 1 ? 1 : 0) : (c > 0 ? 1 : 0);
    }
  }
}
function boxAnyCols(src, dst, k, anchor, erode, tmp) {
  for (let x = 0; x < W; x++) {
    let sum = 0; tmp[0] = 0;
    for (let y = 0; y < H; y++) { sum += src[y * W + x]; tmp[y + 1] = sum; }
    for (let y = 0; y < H; y++) {
      const lo = Math.max(0, y - anchor), hi = Math.min(H - 1, y - anchor + k - 1);
      const c = tmp[hi + 1] - tmp[lo];
      dst[y * W + x] = erode ? (c === hi - lo + 1 ? 1 : 0) : (c > 0 ? 1 : 0);
    }
  }
}
function hull(pts) {
  // Andrew's monotone chain on [x, y] pairs; pts sorted in place
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
/** cv2.minAreaRect by rotating calipers on the hull: { w, h, long, angle, cx, cy, corners }. */
export function minAreaRect(pts) {
  const hp = hull(pts.slice());
  if (hp.length < 3) {
    const a = hp[0] || [0, 0], b = hp[hp.length - 1] || a;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { w: l, h: 0, long: l, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, corners: [a, b, b, a] };
  }
  let best = null;
  for (let i = 0; i < hp.length; i++) {
    const a = hp[i], b = hp[(i + 1) % hp.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-9) continue;
    const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
    let min1 = Infinity, max1 = -Infinity, min2 = Infinity, max2 = -Infinity;
    for (const p of hp) {
      const s = p[0] * ux + p[1] * uy, t = -p[0] * uy + p[1] * ux;
      if (s < min1) min1 = s; if (s > max1) max1 = s; if (t < min2) min2 = t; if (t > max2) max2 = t;
    }
    const area = (max1 - min1) * (max2 - min2);
    if (!best || area < best.area) best = { area, ux, uy, min1, max1, min2, max2 };
  }
  const { ux, uy, min1, max1, min2, max2 } = best;
  const P = (s, t) => [s * ux - t * uy, s * uy + t * ux];
  const w = max1 - min1, h = max2 - min2;
  const c = P((min1 + max1) / 2, (min2 + max2) / 2);
  return { w, h, long: Math.max(w, h), cx: c[0], cy: c[1], corners: [P(min1, min2), P(max1, min2), P(max1, max2), P(min1, max2)] };
}
/** cv2.fitLine(points, DIST_L2): the same closed form OpenCV uses. Returns [vx, vy, x0, y0]. */
export function fitLine(pts) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; syy += p[1] * p[1]; sxy += p[0] * p[1]; }
  const n = pts.length, x = sx / n, y = sy / n;
  const dx2 = sxx / n - x * x, dy2 = syy / n - y * y, dxy = sxy / n - x * y;
  const t = Math.atan2(2 * dxy, dx2 - dy2) / 2;
  return [Math.cos(t), Math.sin(t), x, y];
}

/** Everything detect_line() does. Reuses buffers in `ws` (make one with makeWorkspace()). */
export function makeWorkspace() {
  return { bin: new Uint8Array(W * H), a: new Uint8Array(W * H), b: new Uint8Array(W * H), dil: new Uint8Array(W * H), mask: new Uint8Array(W * H),
    label: new Int32Array(W * H), stack: new Int32Array(W * H), tmp: new Int32Array(Math.max(W, H) + 1) };
}
export function detect(gray, ws) {
  const { bin, a, b, dil, mask, label, stack, tmp } = ws;
  for (let i = 0; i < W * H; i++) bin[i] = gray[i] >= SCRIPT.LOW ? 1 : 0;
  boxAny(bin, a, SCRIPT.KDIL, SCRIPT.KDIL >> 1, false, tmp);
  boxAnyCols(a, dil, SCRIPT.KDIL, SCRIPT.KDIL >> 1, false, tmp);
  boxAny(dil, b, SCRIPT.KERO, SCRIPT.KERO >> 1, true, tmp);
  boxAnyCols(b, mask, SCRIPT.KERO, SCRIPT.KERO >> 1, true, tmp);
  // external contours = 8-connected blobs of the mask; each blob's outline points
  label.fill(0);
  const comps = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (!mask[i0] || label[i0]) continue;
    const id = comps.length + 1;
    let sp = 0; stack[sp++] = i0; label[i0] = id;
    const pts = []; let area = 0;
    while (sp) {
      const i = stack[--sp]; area++;
      const x = i % W, y = (i - x) / W;
      let edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!mask[j]) { if (!dx || !dy) edge = true; continue; }
        if (!label[j]) { label[j] = id; stack[sp++] = j; }
      }
      if (edge) pts.push([x, y]);
    }
    const rect = minAreaRect(pts);
    comps.push({ id, area, pts, rect, long: rect.long });
  }
  let keep = -1;
  for (let i = 0; i < comps.length; i++) if (keep < 0 || comps[i].long > comps[keep].long) keep = i;
  if (keep < 0) return { found: false, comps, keep };
  const [vx, vy, x, y] = fitLine(comps[keep].pts);
  return { found: true, comps, keep, vx, vy, x, y };
}

// ------------------------------------------------------------------ the control step
/** get_velocity() and pid() from the script. prev holds the previous errors (module globals there). */
export function control(line, prev) {
  const n = Math.hypot(line.vx, line.vy) || 1;
  let dx = line.vx / n, dy = line.vy / n;
  if (dy < 0) { dx = -dx; dy = -dy; } // point down the image, toward the nose
  const tx = line.x + SCRIPT.EXTEND * dx, ty = line.y + SCRIPT.EXTEND * dy;
  const ex = tx - CX, ey = ty - CY;
  const ang = (Math.atan2(-dx, dy) * 180) / Math.PI;
  let cx = SCRIPT.KP_X * ex + (SCRIPT.KD_X * (ex - prev.ex)) / SCRIPT.D_DT;
  let cy = SCRIPT.KP_Y * ey + (SCRIPT.KD_Y * (ey - prev.ey)) / SCRIPT.D_DT;
  let wz = SCRIPT.KD_W_Z * ang + (SCRIPT.KD_W_Z * (ang - prev.ang)) / SCRIPT.D_DT;
  prev.ex = ex; prev.ey = ey; prev.ang = ang;
  // camera frame to body frame: forward = image y, right = -image x, yaw unchanged; then clamp
  const fwd = clamp(cy, -SCRIPT.MAX_X, SCRIPT.MAX_X), right = clamp(-cx, -SCRIPT.MAX_Y, SCRIPT.MAX_Y), yaw = clamp(wz, -SCRIPT.MAX_YAW, SCRIPT.MAX_YAW);
  return { fwd, right, yaw, ex, ey, ang, dx, dy, tx, ty };
}

// ------------------------------------------------------------------ hoops (stand-in)
/** A hoop stands upright with its ring along the rope at the nearest point (illustrative). */
export function hoopSegment(course, hoop) {
  const nr = nearest(course, hoop.x, hoop.z);
  const r = SIM.HOOP_D / 2;
  return { ax: hoop.x - nr.tx * r, az: hoop.z - nr.tz * r, bx: hoop.x + nr.tx * r, bz: hoop.z + nr.tz * r, tx: nr.tx, tz: nr.tz };
}
function segDist(px, pz, s) {
  const bx = s.bx - s.ax, bz = s.bz - s.az, l2 = bx * bx + bz * bz || 1e-9;
  const f = clamp(((px - s.ax) * bx + (pz - s.az) * bz) / l2, 0, 1);
  return Math.hypot(px - s.ax - bx * f, pz - s.az - bz * f);
}

// ------------------------------------------------------------------ the simulation
export function createSim(o = {}) {
  const cam = makeCamera();
  const ws = makeWorkspace();
  const sim = {
    course: o.course, hoops: o.hoops || [], glare: o.glare || null, standIn: o.standIn !== false,
    t: 0, pose: { x: 0, z: 0, h: 0, alt: SIM.ALT }, vel: { f: 0, r: 0, w: 0 }, cmd: { f: 0, r: 0, w: 0 },
    prev: { ex: 0, ey: 0, ang: 0 }, next: 0, misses: 0, landed: false, landing: false, ticks: 0,
    last: null, lastVision: null, avoid: null, hits: 0, hitNow: false, mem: new Map(), segs: [],
    cam, ws, onTick: null,
  };
  sim.reset = (s0 = 0) => {
    const c = sim.course;
    let i = 0; while (i < c.n - 1 && c.cum[i + 1] < s0) i++;
    const j = (i + 1) % c.n;
    Object.assign(sim.pose, { x: c.xs[i], z: c.zs[i], h: Math.atan2(c.zs[j] - c.zs[i], c.xs[j] - c.xs[i]), alt: SIM.ALT });
    Object.assign(sim.vel, { f: 0, r: 0, w: 0 }); Object.assign(sim.cmd, { f: 0, r: 0, w: 0 });
    Object.assign(sim.prev, { ex: 0, ey: 0, ang: 0 });
    sim.next = sim.t; sim.misses = 0; sim.landed = false; sim.landing = false; sim.avoid = null; sim.mem.clear(); sim.hitNow = false;
    sim.refreshHoops();
  };
  /** Back over the nearest point of the line, facing along it (after a landing). */
  sim.relaunch = () => {
    const nr = nearest(sim.course, sim.pose.x, sim.pose.z);
    Object.assign(sim.pose, { x: nr.x, z: nr.z, h: Math.atan2(nr.tz, nr.tx), alt: SIM.ALT });
    Object.assign(sim.vel, { f: 0, r: 0, w: 0 }); Object.assign(sim.cmd, { f: 0, r: 0, w: 0 });
    Object.assign(sim.prev, { ex: 0, ey: 0, ang: 0 });
    sim.next = sim.t; sim.misses = 0; sim.landed = false; sim.landing = false; sim.mem.clear();
  };
  sim.refreshHoops = () => { sim.segs = sim.hoops.map((hp) => hoopSegment(sim.course, hp)); };
  sim.look = () => { renderDown(cam, sim.course, sim.pose, sim.glare); return cam.gray; };

  const PAST = SIM.HOOP_D / 2 + SIM.DRONE_R + 0.1;
  function standIn() {
    // Stand-in for the obstacle logic: the forward camera "sees" a hoop's tags when the hoop is in
    // its 66 degree view within 2.5 m; until the drone is past a seen hoop, while it is within 0.55 m
    // of the drone's path, add up to 0.35 m/s sideways, away from it. Once past, the line pulls it back.
    const { pose } = sim, c = Math.cos(pose.h), s = Math.sin(pose.h);
    const fx = pose.x + SIM.FWD_AHEAD * c, fz = pose.z + SIM.FWD_AHEAD * s;
    for (const hp of sim.hoops) {
      const dx = hp.x - fx, dz = hp.z - fz, d = Math.hypot(dx, dz);
      const bearing = Math.atan2(dx * -s + dz * c, dx * c + dz * s);
      if (d < SIM.FWD_RANGE && Math.abs(bearing) < (SIM.HFOV / 2) * Math.PI / 180) sim.mem.set(hp, sim.t);
    }
    let push = 0, who = null;
    for (const [hp, seen] of sim.mem) {
      const dx = hp.x - pose.x, dz = hp.z - pose.z;
      const bx = dx * c + dz * s, by = -dx * s + dz * c; // ahead, right
      // a tag gives the hoop's position, so it is remembered until the drone is past it
      if (sim.t - seen > 20 || bx < -PAST || !sim.hoops.includes(hp)) { sim.mem.delete(hp); continue; }
      if (bx > 2.2) continue;
      const k = clamp((SIM.CLEAR - Math.abs(by)) / 0.1, 0, 1);
      if (k <= 0) continue;
      const p = -Math.sign(by || 1) * SIM.PUSH * k;
      if (Math.abs(p) > Math.abs(push)) { push = p; who = hp; }
    }
    sim.avoid = who ? { hoop: who, push } : null;
    return push;
  }

  function tick() {
    sim.ticks++;
    renderDown(cam, sim.course, sim.pose, sim.glare);
    const v = detect(cam.gray, ws);
    sim.lastVision = v;
    if (!v.found) {
      sim.misses++;
      sim.last = { found: false };
      if (sim.misses >= SCRIPT.MAX_MISSES) { sim.landing = true; sim.cmd.f = 0; sim.cmd.r = 0; sim.cmd.w = 0; }
      sim.next = sim.t + SIM.RETRY; // no sleep after a miss: capture again
    } else {
      const u = control(v, sim.prev);
      let right = u.right;
      if (sim.standIn && sim.hoops.length) right = clamp(right + standIn(), -SCRIPT.MAX_Y, SCRIPT.MAX_Y);
      else sim.avoid = null;
      sim.cmd.f = u.fwd; sim.cmd.r = right; sim.cmd.w = u.yaw;
      sim.last = { found: true, ...u, rightScript: u.right, right };
      sim.next = sim.t + SCRIPT.SLEEP;
    }
    sim.onTick?.(sim);
  }

  /** Advance the simulation by dt seconds (physics at 1/120 s steps). */
  sim.step = (dt) => {
    const h = 1 / 120;
    for (let left = dt; left > 1e-9; left -= h) {
      const d = Math.min(h, left);
      if (sim.landed) { sim.t += d; continue; }
      if (!sim.landing && sim.t >= sim.next) tick();
      const a = 1 - Math.exp(-d / SIM.TAU), v = sim.vel, p = sim.pose;
      v.f += (sim.cmd.f - v.f) * a; v.r += (sim.cmd.r - v.r) * a; v.w += (sim.cmd.w - v.w) * a;
      p.h += (v.w * Math.PI / 180) * d;
      const c = Math.cos(p.h), s = Math.sin(p.h);
      p.x += (v.f * c - v.r * s) * d; p.z += (v.f * s + v.r * c) * d;
      if (sim.landing) { p.alt = Math.max(0, p.alt - 0.35 * d); if (p.alt <= 0) { sim.landed = true; sim.landing = false; } }
      sim.t += d;
      // did the props touch a hoop's ring?
      let hit = false;
      sim.segs.forEach((sg, i) => { if (segDist(p.x, p.z, sg) < SIM.DRONE_R) { hit = true; sim.hitHoop = sim.hoops[i]; } });
      if (hit && !sim.hitNow) sim.hits++;
      sim.hitNow = hit;
    }
  };
  if (sim.course) sim.reset(0);
  return sim;
}

export const DEFAULT_COURSE = [
  [-2.7, -0.9], [-1.4, -1.55], [0.1, -1.1], [1.3, -1.6], [2.6, -1.2], [3.0, 0.1],
  [2.3, 1.3], [0.9, 0.95], [-0.2, 1.55], [-1.6, 1.25], [-2.9, 0.55],
];
export const DEFAULT_HOOPS = [{ x: -0.5, z: -1.22 }, { x: -1.45, z: 1.36 }];
export const DEFAULT_GLARE = { x: -2.35, z: 0.25 };

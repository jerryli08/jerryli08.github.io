// The small physics model behind the arena scrolly: a kinematic two-wheel robot (tank steering,
// arcade mix) with a spinning blade, and cardboard boxes as rigid bodies (gravity, corner contacts
// against the floor, walls and ceiling with friction, a simple push-apart between boxes). Written
// for the page and illustrative only; it is not a simulation of the real robot's hits.
// record() runs it once, ahead of time, on a fixed script (drive, turn, weapon speed) and keeps
// every pose, so the page can show any moment of the run as a pure function of the scroll.
// There is nothing random in it: the same script always gives the same run.
// It takes THREE as an argument so it has no imports (and can be tested outside the browser).
//
// Robot frame: forward is -Z at yaw 0, yaw is about +Y (counter-clockwise from above).
// Numbers from Jerry's CAD: track 142.2 mm (wheel centres at +-71.1 mm), wheel radius 28.6 mm,
// weapon axis 76 mm ahead of the axle, blade swing radius 56 mm, blade 19.6 to 35.6 mm above the
// floor, footprint 196 mm wide from 61 mm behind the axle to the plate noses 102 mm ahead of it.
// The rest (top speed, acceleration, masses, friction, how hard a hit throws a box) is made up
// for the page.
export const ARENA = { hx: 0.7, hz: 0.48, ceil: 0.7 }; // a 1.4 x 0.96 m prop
const G = 9.81, MU = 0.5;
const V_MAX = 0.8, ACCEL = 4, M_ROBOT = 0.44, TURN = 0.36;
const TRACK = 0.14224, WHEEL_R = 0.028575, TIP_R = 0.0559943;
const CH = { l: 0.098, s0: -0.061, s1: 0.102, top: 0.05 };
const BLADE = { s: 0.076, y0: 0.0196, y1: 0.0356 };
export const START = { x: 0, z: 0.26, yaw: 0 };
// boxes: size in mm (w, h, d) and a starting pose (x, z, yaw)
export const BOX_SPEC = [
  { s: [80, 60, 60], p: [-0.3, -0.16, 0.4] },
  { s: [100, 50, 70], p: [0.02, -0.06, -0.15] },
  { s: [60, 60, 60], p: [0.32, -0.22, 0.7] },
  { s: [120, 40, 80], p: [-0.04, -0.33, 0.2] },
  { s: [70, 50, 50], p: [0.5, 0.14, -0.5] },
  { s: [90, 45, 90], p: [-0.5, 0.16, 0.25] },
];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** First-order spin-up (0.6 s) and coast-down (1.5 s) toward a target speed; it settles on the target. */
export function spinTo(w, target, dt) {
  const tau = target > w ? 0.6 : 1.5;
  w += (target - w) * (1 - Math.exp(-dt / tau));
  if (Math.abs(target - w) < 0.01 * Math.max(target, 50)) w = target; // within 1 % it is there
  return w;
}
/** Drawn blade speed: true speed when slow, capped near 26 rad/s so the blade stays readable. */
export const drawnSpeed = (w) => 26 * Math.tanh(w / 26);

export function createSim(T, { onHit, boxes: SPEC = BOX_SPEC, start: START0 = START } = {}) {
  const V3 = T.Vector3;
  const HX = ARENA.hx, HZ = ARENA.hz, CEIL = ARENA.ceil;
  const st = { x: START0.x, z: START0.z, yaw: START0.yaw, vL: 0, vR: 0, ex: 0, ez: 0, ew: 0, aL: 0, aR: 0, aW: 0, w: 0, target: 0, hits: 0 };
  const input = { jf: 0, jt: 0 }; // forward and turn, -1..1 (arcade mix)

  const vols = SPEC.map((b) => b.s[0] * b.s[1] * b.s[2]);
  const vMin = Math.min(...vols), vMax = Math.max(...vols);
  const boxes = SPEC.map((spec, i) => {
    const [w, h, d] = spec.s.map((v) => v / 1000);
    const m = 0.03 + (0.05 * (vols[i] - vMin)) / (vMax - vMin || 1);
    const k = (m / 12) * 1.4; // thin-walled box: a little more inertia than a solid one
    return {
      w, h, d, hx: w / 2, hy: h / 2, hz: d / 2, m,
      invI: new V3(1 / (k * (h * h + d * d)), 1 / (k * (w * w + d * d)), 1 / (k * (w * w + h * h))),
      x: new V3(), v: new V3(), q: new T.Quaternion(), w3: new V3(), sleep: true, still: 0, cool: 0,
      r: ((w + h + d) / 6) * 1.05,
    };
  });
  function resetBoxes(from) {
    boxes.forEach((b, i) => {
      const s = from?.[i];
      if (s) { b.x.fromArray(s.x); b.q.fromArray(s.q); } else {
        const [x, z, yaw] = SPEC[i].p;
        b.x.set(x, b.hy, z); b.q.setFromAxisAngle(new V3(0, 1, 0), yaw);
      }
      b.v.set(0, 0, 0); b.w3.set(0, 0, 0); b.sleep = true; b.still = 0; b.cool = 0;
    });
  }
  resetBoxes();

  // ------------------------------------------------------------ rigid-body helpers
  const _a = new V3(), _b = new V3(), _c = new V3(), _r = new V3(), _n = new V3(), _t = new V3(), _J = new V3(), _P = new V3(), _qi = new T.Quaternion();
  const LOCAL = [];
  for (let i = 0; i < 8; i++) LOCAL.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
  const CW = Array.from({ length: 8 }, () => new V3());
  const PLANES = [
    { n: new V3(0, 1, 0), d: 0 }, { n: new V3(0, -1, 0), d: CEIL },
    { n: new V3(1, 0, 0), d: HX }, { n: new V3(-1, 0, 0), d: HX },
    { n: new V3(0, 0, 1), d: HZ }, { n: new V3(0, 0, -1), d: HZ },
  ];
  function cornersOf(b) {
    for (let i = 0; i < 8; i++) CW[i].set(LOCAL[i][0] * b.hx, LOCAL[i][1] * b.hy, LOCAL[i][2] * b.hz).applyQuaternion(b.q).add(b.x);
    return CW;
  }
  function invIw(b, vin, out) {
    _qi.copy(b.q).invert();
    return out.copy(vin).applyQuaternion(_qi).multiply(b.invI).applyQuaternion(b.q);
  }
  function impulse(b, J, r) {
    b.v.addScaledVector(J, 1 / b.m);
    _a.crossVectors(r, J); invIw(b, _a, _b); b.w3.add(_b);
  }
  function kAlong(b, r, n) { _a.crossVectors(r, n); invIw(b, _a, _b); _c.crossVectors(_b, r); return 1 / b.m + n.dot(_c); }
  const pointVel = (b, r, out) => out.crossVectors(b.w3, r).add(b.v);
  const wakeBox = (b) => { b.sleep = false; b.still = 0; };
  const slowBox = (b) => b.v.lengthSq() < 0.0025 && b.w3.lengthSq() < 0.64;

  function planeContacts(b) {
    const cs = cornersOf(b);
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < 8; i++) {
        const c = cs[i];
        for (const pl of PLANES) {
          if (pl.n.dot(c) + pl.d > 0.0005) continue;
          _r.copy(c).sub(b.x);
          const vn = pointVel(b, _r, _P).dot(pl.n);
          if (vn >= 0) continue;
          const e = vn < -0.6 ? 0.22 : 0;
          const jn = (-(1 + e) * vn) / kAlong(b, _r, pl.n);
          _J.copy(pl.n).multiplyScalar(jn); impulse(b, _J, _r);
          pointVel(b, _r, _P);
          _t.copy(_P).addScaledVector(pl.n, -_P.dot(pl.n));
          const vt = _t.length();
          if (vt > 1e-5) {
            _t.multiplyScalar(-1 / vt);
            const jt = Math.min(vt / kAlong(b, _r, _t), MU * jn);
            _J.copy(_t).multiplyScalar(jt); impulse(b, _J, _r);
          }
        }
      }
    }
  }
  function integrate(b, h) {
    b.x.addScaledVector(b.v, h);
    const q = b.q, w = b.w3;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    q.x += 0.5 * h * (w.x * qw + w.y * qz - w.z * qy);
    q.y += 0.5 * h * (w.y * qw + w.z * qx - w.x * qz);
    q.z += 0.5 * h * (w.z * qw + w.x * qy - w.y * qx);
    q.w += 0.5 * h * (-w.x * qx - w.y * qy - w.z * qz);
    q.normalize();
    const cs = cornersOf(b);
    for (const pl of PLANES) {
      let pen = 0;
      for (const c of cs) pen = Math.max(pen, -(pl.n.dot(c) + pl.d));
      if (pen > 0.0002) b.x.addScaledVector(pl.n, pen * 0.9);
    }
  }

  // ------------------------------------------------------------ robot against boxes
  const fwdOf = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
  const rightOf = (yaw) => [Math.cos(yaw), -Math.sin(yaw)];
  function bladeHits() {
    if (st.w < 30) return;
    const [fx, fz] = fwdOf(st.yaw);
    const cx = st.x + fx * BLADE.s, cz = st.z + fz * BLADE.s;
    for (const b of boxes) {
      if (b.cool > 0) continue;
      if (Math.hypot(b.x.x - cx, b.x.z - cz) > TIP_R + b.hx + b.hy + b.hz) continue;
      const cy = clamp(b.x.y, BLADE.y0, BLADE.y1);
      // closest point of the box to the blade centre at that height
      _qi.copy(b.q).invert();
      _a.set(cx, cy, cz).sub(b.x).applyQuaternion(_qi);
      _a.set(clamp(_a.x, -b.hx, b.hx), clamp(_a.y, -b.hy, b.hy), clamp(_a.z, -b.hz, b.hz)).applyQuaternion(b.q).add(b.x);
      const P = _P.copy(_a);
      let dx = P.x - cx, dz = P.z - cz;
      const dh = Math.hypot(dx, dz);
      if (dh > TIP_R || Math.abs(P.y - cy) > 0.004) continue;
      if (dh < 1e-4) { dx = b.x.x - cx; dz = b.x.z - cz; }
      const nn = Math.hypot(dx, dz) || 1; dx /= nn; dz /= nn;
      // blade surface velocity at the contact, spinning clockwise seen from above: (0, -w, 0) x d
      const u = st.w * TIP_R;
      _J.set(-dz * 0.35 + dx * 0.12, 0.18, dx * 0.35 + dz * 0.12);
      const s = Math.min(1, 6 / (u * _J.length()));
      _J.multiplyScalar(b.m * u * s);
      _r.copy(P).sub(b.x);
      wakeBox(b);
      impulse(b, _J, _r);
      if (b.w3.length() > 45) b.w3.setLength(45);
      b.cool = 0.12;
      // the weapon loses speed on the hit, and the robot takes the reaction
      st.w *= 0.65;
      const k = 0.5 / M_ROBOT;
      st.ex -= _J.x * k; st.ez -= _J.z * k;
      st.ew += Math.min(4, _J.length() * 6);
      st.hits++;
      onHit?.(P.clone(), new V3(-dz, 0.25, dx).normalize(), u * s);
    }
  }
  const _ax = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
  const AXES = [new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1)];
  function chassisPush(v, om) {
    const [fx, fz] = fwdOf(st.yaw), [rx, rz] = rightOf(st.yaw);
    // with the weapon stopped, the blade tip (30 mm past the plate noses) is solid too
    const s1 = st.w < 30 ? CH.s1 + 0.028 : CH.s1;
    const sc = (CH.s0 + s1) / 2, hs = (s1 - CH.s0) / 2;
    const ox = st.x + fx * sc, oz = st.z + fz * sc; // footprint centre
    const still = Math.abs(v) < 1e-3 && Math.abs(om) < 1e-2 && !st.ex && !st.ez;
    for (const b of boxes) {
      if (still && (b.sleep || slowBox(b))) continue; // a parked robot and a resting box: nothing to do
      if (Math.hypot(b.x.x - ox, b.x.z - oz) > 0.16 + b.hx + b.hy + b.hz) continue;
      const cs = cornersOf(b);
      let low = Infinity;
      for (const c of cs) low = Math.min(low, c.y);
      if (low > CH.top) continue;
      // separating axes: the robot's two, and the normals of the box's projected edges
      let na = 0;
      _ax[na][0] = fx; _ax[na++][1] = fz; _ax[na][0] = rx; _ax[na++][1] = rz;
      for (const e of AXES) {
        _a.copy(e).applyQuaternion(b.q);
        const L = Math.hypot(_a.x, _a.z);
        if (L > 0.2) { _ax[na][0] = -_a.z / L; _ax[na++][1] = _a.x / L; }
      }
      let best = Infinity, bx = 0, bz = 0, sep = false;
      for (let i = 0; i < na; i++) {
        const nx = _ax[i][0], nz = _ax[i][1];
        const rc = ox * nx + oz * nz, rr = hs * Math.abs(fx * nx + fz * nz) + CH.l * Math.abs(rx * nx + rz * nz);
        let bmin = Infinity, bmax = -Infinity;
        for (const c of cs) { const q = c.x * nx + c.z * nz; bmin = Math.min(bmin, q); bmax = Math.max(bmax, q); }
        const ov = Math.min(rc + rr, bmax) - Math.max(rc - rr, bmin);
        if (ov <= 2e-4) { sep = true; break; }
        if (ov < best) { best = ov; const sgn = (bmin + bmax) / 2 >= rc ? 1 : -1; bx = nx * sgn; bz = nz * sgn; }
      }
      if (sep) continue;
      // positions: the heavy robot gives a little, the box moves out
      const kb = M_ROBOT / (M_ROBOT + b.m), kr = 1 - kb;
      b.x.x += bx * best * kb; b.x.z += bz * best * kb;
      st.x -= bx * best * kr; st.z -= bz * best * kr;
      // velocity: the box's leading face takes the robot's speed there
      let pmin = Infinity;
      for (const c of cs) pmin = Math.min(pmin, c.x * bx + c.z * bz);
      _P.set(0, 0, 0); let nP = 0;
      for (const c of cs) if (c.x * bx + c.z * bz < pmin + 0.004) { _P.add(c); nP++; }
      _P.multiplyScalar(1 / nP); _P.y = Math.min(b.x.y, 0.03);
      const px = _P.x - st.x, pz = _P.z - st.z;
      const vrx = v * fx + st.ex + om * pz, vrz = v * fz + st.ez - om * px;
      const vr = vrx * bx + vrz * bz;
      _r.copy(_P).sub(b.x);
      _n.set(bx, 0, bz);
      const vb = pointVel(b, _r, _c).dot(_n);
      if (vr > vb + 0.002) {
        wakeBox(b);
        const j = (vr - vb) / kAlong(b, _r, _n);
        _J.copy(_n).multiplyScalar(j); impulse(b, _J, _r);
      } else if (best > 0.001) wakeBox(b); // a resting box just touching the robot stays asleep
    }
  }
  function boxPairs() {
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      // two boxes at rest against each other are left alone (the spheres are only a rough fit)
      if ((a.sleep || slowBox(a)) && (b.sleep || slowBox(b))) continue;
      _a.copy(a.x).sub(b.x);
      const d = _a.length(), rr = a.r + b.r;
      if (d >= rr || d < 1e-6) continue;
      _a.multiplyScalar(1 / d);
      const ov = rr - d, ma = b.m / (a.m + b.m), mb = 1 - ma;
      a.x.addScaledVector(_a, ov * ma); b.x.addScaledVector(_a, -ov * mb);
      const vrel = _b.copy(a.v).sub(b.v).dot(_a);
      if (vrel < 0) { const jj = -vrel / (1 / a.m + 1 / b.m); a.v.addScaledVector(_a, jj / a.m); b.v.addScaledVector(_a, -jj / b.m); }
      wakeBox(a); wakeBox(b);
    }
  }
  function robotWalls() {
    const [fx, fz] = fwdOf(st.yaw), [rx, rz] = rightOf(st.yaw);
    let px = 0, pz = 0;
    for (const s of [CH.s0, CH.s1 + 0.03]) for (const l of [-CH.l, CH.l]) {
      const x = st.x + fx * s + rx * l, z = st.z + fz * s + rz * l;
      if (x > HX) px = Math.min(px, HX - x);
      if (x < -HX) px = Math.max(px, -HX - x);
      if (z > HZ) pz = Math.min(pz, HZ - z);
      if (z < -HZ) pz = Math.max(pz, -HZ - z);
    }
    st.x += px; st.z += pz;
    if (px) st.ex = 0;
    if (pz) st.ez = 0;
  }

  // ------------------------------------------------------------ one fixed step
  function step(h) {
    st.w = spinTo(st.w, st.target, h);
    const f = clamp(input.jf, -1, 1);
    const t = clamp(input.jt, -1, 1) * TURN;
    const tl = clamp(f + t, -1, 1) * V_MAX, tr = clamp(f - t, -1, 1) * V_MAX;
    st.vL += clamp(tl - st.vL, -ACCEL * h, ACCEL * h);
    st.vR += clamp(tr - st.vR, -ACCEL * h, ACCEL * h);
    if (Math.abs(st.vL) < 1e-5 && tl === 0) st.vL = 0;
    if (Math.abs(st.vR) < 1e-5 && tr === 0) st.vR = 0;
    const v = (st.vL + st.vR) / 2, om = (st.vR - st.vL) / TRACK + st.ew;
    st.yaw += om * h;
    const [fx, fz] = fwdOf(st.yaw);
    st.x += (v * fx + st.ex) * h; st.z += (v * fz + st.ez) * h;
    const dec = Math.exp(-7 * h);
    st.ex *= dec; st.ez *= dec; st.ew *= Math.exp(-5 * h);
    if (Math.abs(st.ex) + Math.abs(st.ez) < 1e-4) st.ex = st.ez = 0;
    if (Math.abs(st.ew) < 1e-3) st.ew = 0;
    st.aL -= (st.vL / WHEEL_R) * h; st.aR -= (st.vR / WHEEL_R) * h;
    st.aW -= drawnSpeed(st.w) * h;
    robotWalls();
    for (const b of boxes) {
      if (b.cool > 0) b.cool -= h;
      if (b.sleep) continue;
      b.v.y -= G * h;
      b.v.multiplyScalar(1 - 0.05 * h); b.w3.multiplyScalar(1 - 0.9 * h);
    }
    bladeHits();
    chassisPush(v, om);
    boxPairs();
    for (const b of boxes) {
      if (b.sleep) continue;
      planeContacts(b);
      integrate(b, h);
      // resting on a face (three or more corners on the floor): damp the small rocking that
      // corner-by-corner contacts leave behind, and let a box that has settled go to sleep
      let onFloor = 0;
      for (const c of cornersOf(b)) if (c.y < 0.0015) onFloor++;
      const slow = b.v.length() < 0.05 && b.w3.length() < 0.8;
      if (onFloor >= 3 && slow) { b.w3.multiplyScalar(0.9); b.v.x *= 0.96; b.v.z *= 0.96; }
      if (slow) b.still += h; else b.still = 0;
      if (b.still > 0.3 && onFloor >= 3) { b.sleep = true; b.v.set(0, 0, 0); b.w3.set(0, 0, 0); }
    }
  }
  return { st, input, boxes, step, resetBoxes };
}

/**
 * Run the model once on a script and keep every pose. script(t, st, boxes) returns { f, turn, weapon }
 * at sim time t (it may steer by the robot's state st and the boxes): forward and turn commands
 * (-1..1) and the weapon's target speed (rad/s).
 * Returns { rate, n, duration, robot: [x, z, yaw, left wheel, right wheel, weapon angle] per frame,
 * w: weapon speed (rad/s) per frame, boxes: [x, y, z, qx, qy, qz, qw] per box per frame, hits: [t] }.
 */
export function record(T, opts) {
  const it = recording(T, opts);
  let r;
  while (!(r = it.next()).done);
  return r.value;
}
/** The same run as a generator: it yields now and then (the fraction done), so a page can spread it over several frames. */
export function* recording(T, { script, duration, rate = 120, boxes: SPEC = BOX_SPEC, start = START }) {
  const DT = 1 / 240, sub = Math.round(1 / (rate * DT));
  const hits = [];
  let t = 0;
  const sim = createSim(T, { boxes: SPEC, start, onHit: () => hits.push(+t.toFixed(4)) });
  const { st, input, boxes } = sim;
  const n = Math.round(duration * rate) + 1, nb = boxes.length;
  const R = new Float32Array(n * 6), W = new Float32Array(n), B = new Float32Array(n * nb * 7);
  const keep = (i) => {
    R.set([st.x, st.z, st.yaw, st.aL, st.aR, st.aW], i * 6);
    W[i] = st.w;
    boxes.forEach((b, j) => { const o = (i * nb + j) * 7; B.set([b.x.x, b.x.y, b.x.z, b.q.x, b.q.y, b.q.z, b.q.w], o); });
  };
  keep(0);
  for (let i = 1; i < n; i++) {
    for (let k = 0; k < sub; k++) {
      const c = script(t, st, boxes);
      input.jf = c.f || 0; input.jt = c.turn || 0; st.target = c.weapon || 0;
      sim.step(DT);
      t += DT;
    }
    keep(i);
    if (i % 30 === 0) yield i / n;
  }
  return { rate, n, duration, nb, robot: R, w: W, boxes: B, hits, sizes: boxes.map((b) => [b.w, b.h, b.d]) };
}

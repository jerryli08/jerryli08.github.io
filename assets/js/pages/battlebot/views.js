// Camera helpers shared by this page's scrollies: views are framed once, at rest, and cached; the
// scroll only blends between cached views (orbiting about the target), so nothing is ever framed
// on a moving part.
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

/** A view as a target and a spherical offset, so two views blend by orbiting rather than cutting through the model. */
export function toSph(T, v) {
  return { t: new T.Vector3().copy(v.target), s: new T.Spherical().setFromVector3(new T.Vector3().copy(v.pos).sub(v.target)) };
}

/** Place the camera k (0..1) of the way from cached view a to cached view b; drift adds a slow turn (radians). */
export function blend(stage, a, b, k, drift = 0) {
  const T = stage.THREE;
  let dT = b.s.theta - a.s.theta;
  while (dT > Math.PI) dT -= 2 * Math.PI;
  while (dT < -Math.PI) dT += 2 * Math.PI;
  const target = a.t.clone().lerp(b.t, k);
  const sp = new T.Spherical(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
  stage.setView({ pos: new T.Vector3().setFromSpherical(sp).add(target), target });
}

/** Frame an axis-aligned region [min, max] (model metres) once, without touching the camera. */
export function frameBox(stage, min, max, o) {
  const T = stage.THREE;
  const probe = new T.Object3D();
  const geo = new T.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const m = new T.Mesh(geo);
  m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  probe.add(m);
  const v = stage.frame(probe, { ...o, apply: false, refresh: true });
  geo.dispose();
  return v;
}

/** Cache views per stage shape: make() is called again only when the stage's aspect changes. */
export function viewCache(el, make) {
  let views = null, aspect = 0;
  return () => {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || Math.abs(a - aspect) > 1e-3) { aspect = a; views = make(a); }
    return views;
  };
}

/** How much of the stage's width (0..1, from the left) the step cards cover: only on a full-width desktop scrolly. */
export function coverOf(el, ctx) {
  if (!(ctx.shift()[0] > 0)) return 0;
  const card = el.closest('[data-rx-block]')?.querySelector('.rx-step-card');
  const e = el.getBoundingClientRect();
  if (!card || !e.width) return 0.3;
  return clamp((card.getBoundingClientRect().right - e.left + 20) / e.width, 0, 0.6);
}

/** Frame into the part of the stage the cards leave free: fn() runs with the camera as narrow as that part. */
export function frameFree(stage, cover, fn) {
  const cam = stage.camera, a = cam.aspect;
  cam.aspect = a * (1 - cover);
  try { return fn(); } finally { cam.aspect = a; }
}

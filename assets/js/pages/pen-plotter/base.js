// Shared set-up for the two 3D scrollies (the main drawing run and the shape library): the stage,
// the rigged linkage, the page annotations (grid, fold line, pen marker), the readout, the labels,
// and camera views framed once on fixed regions of the page (never on the moving arms).
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import * as K from './kin.js';
import { loadRig, makePage, regionBox, toM, COLORS, PAGE_Y } from './rig.js';
import { telemetry } from './hud.js';

export async function setup(el, ctx, o = {}) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const page = makePage(stage);
  page.grid(-40, 130, 50, 200);
  const foldMat = page.mat(COLORS.fold, 0.9);
  const foldPts = K.foldLine().filter((p) => p[0] > -22 && p[0] < 122);
  page.ribbon(page.fine(foldPts, 1), 0.8, foldMat, { dash: [3, 2.2], order: 2 });
  const pen = page.penMarker();
  const ov = labelLayer(stage);
  const hud = telemetry(ov.layer, { library: o.library });

  // the forearms light up blue as they line up (their own material copies, tinted per frame)
  const foreMats = [];
  for (const k of ['foreL', 'foreR']) rig.groups[k].traverse((m) => {
    if (!m.isMesh) return;
    m.material = [].concat(m.material).map((x) => { const c = stage.cloneMaterial(x); foreMats.push(c); return c; });
    if (m.material.length === 1) m.material = m.material[0];
  });
  const foldColor = new T.Color(COLORS.fold);
  let tinted = -1;
  function tintForearms(k) {
    k = Math.round(k * 50) / 50;
    if (k === tinted) return;
    tinted = k;
    for (const m of foreMats) if (m.emissive) { m.emissive.copy(foldColor).multiplyScalar(0.55 * k); }
    stage.invalidate(false);
  }

  // labels
  const top = 0.058;
  const L = {
    left: ov.label('Left motor', [0, top, 0], { color: '#fff1e2', side: 'l', minW: 520 }),
    right: ov.label('Right motor', [0, top, -0.1], { color: '#fff1e2', minW: 520 }),
    pen: ov.label('Pen', pen.g, { color: COLORS.ink }),
    fold: ov.label('Fold line', (() => { const [X, Z] = toM(-3.2, 63.1); return [X, PAGE_Y, Z]; })(), { color: COLORS.fold, side: 'l', minW: 420 }),
  };

  // ---------------------------------------------------------------- views, framed once at rest
  const phone = () => el.clientWidth < 640;
  const views = new Map();
  let aspect = 0;
  const defs = o.views || {};
  function view(name) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (a !== aspect) { aspect = a; views.clear(); }
    if (!views.has(name)) {
      const d = defs[name];
      const box = regionBox(stage, ...d.region);
      const v = stage.frame(box, { azimuth: d.az, elevation: d.el, pad: (phone() ? d.padPhone : d.pad) ?? d.pad ?? 1.15, apply: false, refresh: true });
      const s = new T.Spherical().setFromVector3(v.pos.clone().sub(v.target));
      views.set(name, { t: v.target.clone(), s });
    }
    return views.get(name);
  }
  const sp = new T.Spherical(), pos = new T.Vector3();
  function place(a, b, k, drift = 0) {
    a = view(a); b = view(b);
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(K.lerp(a.s.radius, b.s.radius, k), K.lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: pos.setFromSpherical(sp).add(target).clone(), target });
  }
  // keep the linkage clear of the step cards (left) and the readout (bottom right on a desktop,
  // across the top on a phone)
  function shift() {
    const [fx] = ctx.shift();
    if (phone()) return [0, -0.07];
    if (fx > 0) return [0.2, 0.13];
    return [0, 0.12];
  }

  /** put the linkage where the IK puts it for pen point (x, y); returns the pose */
  function poseAt(x, y) {
    const p = K.pose(x, y);
    if (!p) return null;
    rig.set(p);
    pen.at(x, y);
    const ps = K.perStep(p);
    tintForearms(K.smooth(1.5, 12, ps));
    return p;
  }

  return { stage, T, rig, page, pen, ov, hud, L, view, place, shift, poseAt, foldMat, reduced: ctx.reducedMotion };
}

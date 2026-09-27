// Built-in scroll module "@turntable": the reader scrolls and the camera turns around the real CAD.
// It replaces the old drag-to-rotate "@viewer": a page converts with data only (a `demo` section
// with module '@viewer' is turned into one of these by the build, with its text above it).
//
//   { type: 'scrolly', id: 'cad', module: '@turntable', h: 'The CAD', p: [...],
//     data: { models: [{ label: 'V1', src: '/assets/models/<slug>/v1.glb' }, { label: 'V2', src: '...' }] } }
//
// Without steps the whole scroll is one slow orbit (data.spin degrees, default 300) and the versions
// follow each other in order, each for an equal share of it. With steps, each step's `view` says
// what it shows (all optional):
//   { azimuth, elevation, pad,              camera (degrees; azimuth 0 looks from +Z, 90 from +X)
//     focus: 'regex',                       frame these parts instead of the whole model
//     version: 1,                           which model to show (dissolves from the previous one)
//     explode: 0..1,                        how far the data.explode groups have moved out
//     cut: { normal: [1, 0, 0], at: 0.5 },  section cut: at 0 nothing is cut, 1 everything
//     highlight: [{ parts: 'regex', color: '#ff6b35' }],
//     labels: [{ text, at: [x, y, z] } | { text, part: 'regex' }],   at: model metres (Y up)
//     image: 'render.webp', alt: '...' }    a still (a version that exists only as a render or photo)
// Each step blends in from the one before over its first 45 % and then keeps turning slowly
// (data.drift degrees per step, default 14), so the model is never frozen while the text is read.
// Per model: { src, label, hide: 'regex' (parts left out), ghost: 'regex' (see-through),
// highlight: [{ parts, color }], azimuth, elevation, pad, and finishes by part name: carbon, rubber,
// printed, moulded (or smooth), anodized, metal, plain: 'regex'; finish: 'printed' for the rest of
// the model (data.finish sets it for every model) }.
// data.explode: [{ parts: 'regex', dir: [x, y, z], dist: metres, cad: true }]: dir in the model
// frame (metres, Y up), or a STEP direction (Z up) with cad: true, taken from tools/cad-axes.py.
// Every picture is a pure function of the scroll position; nothing moves on its own.
import { createStage, cad } from '../stage.js';
import { labelLayer } from '../labels.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rx = (s) => (s instanceof RegExp ? s : s ? new RegExp(s, 'i') : null);
const DEG = Math.PI / 180;
// per-model finish fields, passed to stage.load (see FINISHES in stage.js)
const FINISH_FIELDS = ['carbon', 'rubber', 'printed', 'moulded', 'smooth', 'anodized', 'metal', 'plain'];

export async function mount(el, ctx) {
  const d = ctx.data || {};
  const defs = d.models || (d.src ? [{ src: d.src, label: d.label }] : []);
  if (!defs.length) throw new Error('@turntable needs data.models or data.src');
  const stage = createStage(el, { controls: false, hint: false, ao: d.ao, exposure: d.exposure, fov: d.fov });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const steps = Array.isArray(d.steps) && d.steps.length ? d.steps : null;
  const ov = labelLayer(stage);

  // ---------------------------------------------------------------- models
  const models = defs.map(() => null);
  const loading = defs.map(() => null);
  function get(i) {
    loading[i] ||= (async () => {
      const def = defs[i];
      // finishes by part name (regex strings), and a default for the model (else the whole turntable's)
      const fin = { finish: def.finish ?? d.finish };
      for (const f of FINISH_FIELDS) if (def[f]) fin[f] = rx(def[f]);
      const obj = await stage.load(def.src, { add: true, ...fin });
      obj.visible = false;
      const hide = rx(def.hide);
      if (hide) for (const p of stage.part(hide, obj)) p.removeFromParent(); // out of the bounds too
      // every material of this version gets its own copy, so versions fade independently
      const mats = [];
      obj.traverse((o) => {
        if (!o.isMesh) return;
        o.material = [].concat(o.material).map((m) => { const c = stage.cloneMaterial(m); mats.push(c); return c; });
        if (o.material.length === 1) o.material = o.material[0];
      });
      const ghost = rx(def.ghost);
      const ghosts = new Set();
      if (ghost) for (const p of stage.part(ghost, obj)) p.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => ghosts.add(m)); });
      for (const m of mats) {
        if (ghosts.has(m)) { m.transparent = true; m.depthWrite = false; m.userData.base = 0.28; }
        else { m.alphaHash = true; m.userData.base = 1; } // dissolves without sorting trouble
        m.needsUpdate = true;
      }
      for (const h of def.highlight || []) tint(stage.part(rx(h.parts), obj), h.color || '#ff6b35', h.intensity ?? 0.5);
      // explode groups, resolved in this model
      const groups = (d.explode || []).map((g) => {
        const dir = new THREE.Vector3(...(g.cad ? cad.dir(g.dir) : g.dir)).normalize();
        obj.updateWorldMatrix(true, true);
        const wdir = dir.clone().transformDirection(obj.matrixWorld).multiplyScalar(g.dist ?? 0.05);
        return stage.part(rx(g.parts), obj).map((p) => {
          const pw = p.parent.getWorldPosition(new THREE.Vector3());
          const off = p.parent.worldToLocal(pw.clone().add(wdir)).sub(p.parent.worldToLocal(pw.clone()));
          return { p, base: p.position.clone(), off };
        });
      }).flat();
      stage.fitGround();
      models[i] = { obj, mats, groups, fade: -1, explode: 0 };
      views.clear(); cutRange.clear();
      if (ready) setProgress(...lastArgs);
      return models[i];
    })();
    return loading[i];
  }
  function tint(parts, color, intensity) {
    const c = new THREE.Color(color).multiplyScalar(intensity);
    for (const p of parts) p.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive) { m.emissive.copy(c); m.userData.tint = c.clone(); } });
  }
  function setFade(i, f) {
    const m = models[i];
    if (!m || Math.abs(m.fade - f) < 0.002) return;
    m.fade = f;
    m.obj.visible = f > 0.004;
    for (const x of m.mats) x.opacity = x.userData.base * f;
    stage.invalidate(); // what casts shadows changes too
  }
  function setExplode(i, e) {
    const m = models[i];
    if (!m || !m.groups.length || Math.abs(m.explode - e) < 1e-4) return;
    m.explode = e;
    for (const g of m.groups) g.p.position.copy(g.base).addScaledVector(g.off, e);
    stage.invalidate();
  }

  // ---------------------------------------------------------------- views (framed once, at rest)
  const views = new Map();
  let aspect = 0;
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), r: s.radius, phi: s.phi, theta: s.theta }; };
  // run fn with every exploded part back in place, so views and cut extents are measured at rest
  function atRest(fn) {
    const moved = models.filter((m) => m && m.explode);
    for (const m of moved) for (const g of m.groups) g.p.position.copy(g.base);
    try { return fn(); } finally { for (const m of moved) for (const g of m.groups) g.p.position.copy(g.base).addScaledVector(g.off, m.explode); }
  }
  function viewOf(key, version, o) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (a !== aspect) { aspect = a; views.clear(); }
    if (views.has(key)) return views.get(key);
    return atRest(() => frameView(key, version, o));
  }
  function frameView(key, version, o) {
    const m = models[version] || models.find(Boolean);
    const focus = rx(o.focus);
    const parts = focus ? stage.part(focus, m.obj) : [];
    const def = defs[version] || {};
    const target = parts.length ? parts : m.obj;
    const opts = {
      azimuth: o.azimuth ?? def.azimuth ?? d.azimuth ?? 35, elevation: o.elevation ?? def.elevation ?? d.elevation ?? 20,
      pad: o.pad ?? def.pad ?? d.pad ?? 1.1, apply: false, refresh: true,
    };
    const v = sph(stage.frame(target, opts));
    // an orbit: far enough back that the model fits at every angle it turns through
    if (o.orbit) for (let q = 0; q <= 1.001; q += 0.125) v.r = Math.max(v.r, stage.frame(target, { ...opts, azimuth: opts.azimuth + o.orbit * (q - 0.15), refresh: false }).pos.distanceTo(v.t));
    if (models[version]) views.set(key, v);
    return v;
  }
  const sA = new THREE.Spherical();
  function place(a, b, k, extraTheta = 0) {
    let dT = b.theta - a.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sA.set(lerp(a.r, b.r, k), clamp(lerp(a.phi, b.phi, k), 0.05, Math.PI - 0.05), a.theta + dT * k + extraTheta);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sA).add(target), target });
  }

  // ---------------------------------------------------------------- cut, labels, stills
  let cut = null, cutN = null;
  const cutRange = new Map(); // normal -> [lo, hi] of the models along it, at rest
  function setCut(c, amount) {
    if (!c || amount <= 0.001) { if (cut) cut.set(1e6); return; }
    const n = new THREE.Vector3(...c.normal).normalize();
    if (!cut) cut = stage.sectionPlane(n.toArray(), 1e6);
    if (!cutN || !cutN.equals(n)) { cut.setNormal(n.toArray()); cutN = n.clone(); }
    const key = n.toArray().map((x) => x.toFixed(4)).join();
    if (!cutRange.has(key)) cutRange.set(key, atRest(() => {
      const { box } = stage.bounds(stage.root, true);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < 8; i++) {
        const q = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).dot(n);
        lo = Math.min(lo, q); hi = Math.max(hi, q);
      }
      return [lo, hi];
    }));
    const [lo, hi] = cutRange.get(key);
    // keeps dot(n, p) + c >= 0: at 0 the plane sits below everything, at 1 above it
    cut.set(-(lo + (hi - lo) * clamp(c.at ?? 0.5, 0, 1) * amount) + 1e-5);
  }
  const stepLabels = (steps || []).map((s, i) => (s.labels || []).map((l) => ({ def: l, i, el: null })));
  function labelOf(x) {
    if (x.el) return x.el;
    const m = models[steps[x.i].version ?? 0];
    if (!m) return null;
    const target = x.def.part ? stage.part(rx(x.def.part), m.obj)[0] : null;
    x.el = ov.label(x.def.text, target || (x.def.at || [0, 0, 0]), { color: x.def.color, side: x.def.side, minW: x.def.minW });
    return x.el;
  }
  const stills = (steps || []).map((s) => {
    if (!s.image) return null;
    // shown like a print laid over the stage, at its own aspect ratio, centred in the part of the
    // stage the step cards leave free (--rx-cover, written by the page runtime)
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: 'clamp(16px, 5%, 48px)', paddingLeft: 'calc(var(--rx-cover, 0px) + clamp(16px, 5%, 48px))', opacity: '0', zIndex: '1', pointerEvents: 'none', background: 'rgba(14, 11, 9, 0.82)' });
    const img = document.createElement('img');
    img.alt = s.alt || '';
    img.decoding = 'async';
    img.src = ctx.asset(s.image.startsWith('/') ? s.image : `/assets/media/${ctx.slug}/${s.image}`);
    Object.assign(img.style, { display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', minWidth: '0', minHeight: '0', borderRadius: '12px', boxShadow: '0 30px 60px -30px rgba(0,0,0,.9)' });
    wrap.className = 'rx-tt-still';
    wrap.append(img);
    el.appendChild(wrap);
    return wrap;
  });

  // highlight blending per step: every tinted mesh remembers its own tint
  const stepTints = (steps || []).map((s) => (s.highlight || []).map((h) => ({ re: rx(h.parts), color: new THREE.Color(h.color || '#ff6b35').multiplyScalar(h.intensity ?? 0.5) })));
  const tintMeshes = new Map(); // `${version}|${step}` -> [{ mat, color }]
  function tintsFor(version, i) {
    const key = `${version}|${i}`;
    if (tintMeshes.has(key)) return tintMeshes.get(key);
    const m = models[version];
    if (!m) return [];
    const out = [];
    for (const t of stepTints[i] || []) for (const p of stage.part(t.re, m.obj)) p.traverse((o) => { if (o.isMesh) for (const mat of [].concat(o.material)) if (mat.emissive) out.push({ mat, color: t.color }); });
    tintMeshes.set(key, out);
    return out;
  }
  const blank = new THREE.Color(0);
  let lastTinted = new Set();
  function applyTints(list) { // list: [{ mat, color, k }]
    const now = new Set();
    for (const { mat, color, k } of list) {
      now.add(mat);
      mat.emissive.copy(mat.userData.tint || blank).lerp(color, k);
    }
    for (const mat of lastTinted) if (!now.has(mat)) mat.emissive.copy(mat.userData.tint || blank);
    lastTinted = now;
  }

  // ---------------------------------------------------------------- the picture, from the scroll
  let ready = false, lastArgs = [0, 0, 0];
  function setProgress(p, step, stepP) {
    lastArgs = [p, step, stepP];
    stage.setShift(...(ctx.shift ? ctx.shift() : [0, 0]));
    if (!steps) {
      // one slow orbit; the versions share the scroll equally, dissolving into each other
      const n = defs.length, x = p * n;
      const i = clamp(Math.floor(x), 0, n - 1);
      const w = reduced ? 0.0001 : 0.12; // half the dissolve, in versions, around each boundary
      const alpha = defs.map((_, j) => Math.min(j > 0 ? smooth(j - w, j + w, x) : 1, j < n - 1 ? 1 - smooth(j + 1 - w, j + 1 + w, x) : 1));
      alpha.forEach((a, j) => { if (a > 0 && !models[j]) get(j); });
      // a version still loading gives its share to the ones on screen
      const sum = alpha.reduce((t, a, j) => t + (models[j] ? a : 0), 0) || 1;
      alpha.forEach((a, j) => setFade(j, models[j] ? a / sum : 0));
      const spin = (reduced ? 0 : d.spin ?? 300) * DEG;
      const v = viewOf(`v${i}`, i, { orbit: spin / DEG });
      place(v, v, 0, spin * (p - 0.15));
    } else {
      step = clamp(step | 0, 0, steps.length - 1);
      const prev = Math.max(0, step - 1);
      const S = steps[step], P = steps[prev];
      const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
      const vi = S.version ?? 0, vp = P.version ?? 0;
      if (!models[vi]) get(vi);
      if (steps[step + 1] && !models[steps[step + 1].version ?? 0]) get(steps[step + 1].version ?? 0); // the next one, ahead of time
      for (let j = 0; j < defs.length; j++) setFade(j, j === vi && j === vp ? 1 : j === vi ? (models[vp] ? k : 1) : j === vp ? (models[vi] ? 1 - k : 1) : 0);
      const e = lerp(P.explode ?? 0, S.explode ?? 0, k);
      for (let j = 0; j < defs.length; j++) setExplode(j, e);
      // cut: blend the amount; the plane jumps to the new normal only when one side has none
      const cA = step === 0 ? 0 : P.cut ? 1 - k : 0, cB = S.cut ? k : 0;
      setCut(cB >= cA ? S.cut : P.cut, Math.max(cA, cB));
      const drift = (reduced ? 0 : d.drift ?? 14) * DEG;
      const a = viewOf(`s${prev}`, vp, P), b = viewOf(`s${step}`, vi, S);
      place(a, b, k, step === 0 ? drift * stepP : lerp(drift, drift * stepP, k));
      // labels hand over: the old set leaves before the new one arrives
      stepLabels.forEach((ls, i) => {
        const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
        for (const x of ls) { const l = s > 0 ? labelOf(x) : x.el; if (l) l.a = s; }
      });
      stills.forEach((img, i) => { if (img) img.style.opacity = String(i === step ? k : i === prev && step !== prev ? 1 - k : 0); });
      applyTints([...tintsFor(vi, step).map((t) => ({ ...t, k })), ...(step !== prev ? tintsFor(vp, prev).map((t) => ({ ...t, k: 1 - k })) : [])]);
    }
    ov.update();
  }

  const first = steps ? steps[0].version ?? 0 : 0;
  await get(first);
  ready = true;
  setProgress(0, 0, 0);
  // the other versions load in the background, in order
  (async () => { for (let i = 0; i < defs.length; i++) if (i !== first) { try { await get(i); } catch (e) { console.warn('@turntable: could not load', defs[i].src, e); } } })();
  return { setProgress, dispose() { ov.dispose(); for (const s of stills) s?.remove(); stage.dispose(); } };
}
